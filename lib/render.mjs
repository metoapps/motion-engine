import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser, browserPath } from './browser.mjs';
import { saveJSON } from './util.mjs';
const run=(command,args)=>execFileSync(command,args,{encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});
const ff=args=>run('ffmpeg',['-v','error','-y',...args]);
export function probe(file) {return JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels','-of','json',file]));}
export function doctor(){
 const checks={node:process.version};
 for(const tool of ['ffmpeg','ffprobe'])try{checks[tool]=run(tool,['-version']).split('\n')[0];}catch{checks[tool]='MISSING';}
 try{checks.browser=browserPath();}catch(e){checks.browser=e.message;}
 return checks;
}
export function verifyMedia(file,type){
 const result=probe(file),streamType=type==='audio'?'audio':'video';
 if(!result.streams.some(s=>s.codec_type===streamType))throw new Error(`Downloaded ${type} did not contain a decodable ${streamType} stream.`);
 ff(['-xerror','-i',file,'-f','null','-']);return result;
}
export async function render(file,{out,scale=1,gif=false,onProgress=console.log}={}){
 file=resolve(file);out=resolve(out||join(dirname(file),'film.mp4'));
 if(extname(out)!=='.mp4')throw new Error('--out must end with .mp4. Use --gif for a companion GIF.');
 if(!Number.isFinite(scale)||scale<1||scale>3)throw new Error('--scale must be between 1 and 3.');
 run('ffmpeg',['-version']);run('ffprobe',['-version']);
 const browser=await launchBrowser(),temp=await mkdtemp(join(tmpdir(),'motion-engine-'));
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:scale});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push('Asset failed: '+r.url()));
  await page.goto(pathToFileURL(file).href);await page.evaluate(()=>window.bannerReady);
  const meta=await page.evaluate(()=>{
   const bounds=document.querySelector('#stage')?.getBoundingClientRect();
   return {...window.MOTION_META,width:bounds?.width,height:bounds?.height,duration:window.DURATION,fps:window.FPS||30,render:typeof window.render==='function'};
  });
  if(!meta.render||!Number.isFinite(meta.duration)||meta.duration<=0||meta.duration>600||!meta.width||!meta.height||meta.width%2||meta.height%2||meta.width>3840||meta.height>3840||![24,25,30,50,60].includes(meta.fps))throw new Error('Invalid composition. Supply an even-sized #stage, render(t), duration (0–600 s), and a supported frame rate.');
  if(errors.length)throw new Error(errors.join('\n'));
  await page.setViewportSize({width:meta.width,height:meta.height});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(im=>im.decode()));});
  const draw=t=>page.evaluate(async t=>{await window.render(t);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},t);
  const total=Math.round(meta.duration*meta.fps);
  for(let f=0;f<total;f++){
   await draw(f/meta.fps);await page.screenshot({path:join(temp,`frame-${String(f).padStart(6,'0')}.jpg`),type:'jpeg',quality:95,clip:{x:0,y:0,width:meta.width,height:meta.height}});
   if(f%60===0)onProgress(`Rendering ${Math.round(f/total*100)}% (${f}/${total} frames)`);
  }
  if(errors.length)throw new Error(errors.join('\n'));
  const audio=meta.audio||[],inputs=[],chains=[];
  for(const [i,cue] of audio.entries()){
   const path=resolve(dirname(file),cue.file);await stat(path);
   if(!Number.isFinite(cue.at)||cue.at<0||cue.at>=meta.duration||!Number.isFinite(cue.gain??-6))throw new Error('Invalid audio cue.');
   inputs.push('-i',path);
   chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${cue.gain??-6}dB,adelay=${Math.round(cue.at*1000)}:all=1[a${i}]`);
  }
  const mix=join(temp,'mix.wav');
  if(audio.length){ff([...inputs,'-filter_complex',chains.join(';')+';'+audio.map((_,i)=>`[a${i}]`).join('')+`amix=inputs=${audio.length}:normalize=0,apad,atrim=0:${meta.duration},loudnorm=I=-14:TP=-1.5:LRA=11[out]`,'-map','[out]','-ar','48000',mix]);}
  await mkdir(dirname(out),{recursive:true});
  const pending=join(temp,'film.mp4');
  ff(['-framerate',String(meta.fps),'-i',join(temp,'frame-%06d.jpg'),...(audio.length?['-i',mix]:[]),
   '-vf',`scale=${meta.width}:${meta.height}:flags=lanczos`,'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',
   ...(audio.length?['-c:a','aac','-b:a','192k','-t',String(meta.duration)]:['-an']),pending]);
  const info=verifyMedia(pending,'video');
  const video=info.streams.find(s=>s.codec_type==='video');
  if(video.width!==meta.width||video.height!==meta.height||Math.abs(Number(info.format.duration)-meta.duration)>.12)throw new Error('Rendered media does not match the composition.');
  const {copyFile}=await import('node:fs/promises');await copyFile(pending,out);
  const base=out.slice(0,-4);
  ff(['-ss',String(Math.min(meta.duration-.1,meta.duration*.84)),'-i',out,'-frames:v','1',base+'-poster.png']);
  ff(['-i',out,'-vf',`fps=1,scale=256:-2,tile=4x${Math.ceil(meta.duration/4)}`,'-frames:v','1',base+'-contact.jpg']);
  if(gif)ff(['-i',out,'-filter_complex','fps=12,scale=640:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a','-loop','0',base+'.gif']);
  const qa={passed:true,source:filenameOnly(file),width:video.width,height:video.height,duration:Number(info.format.duration),fps:meta.fps,frames:total,audio:info.streams.some(s=>s.codec_type==='audio'),full_decode:'passed',browser_errors:errors,render_scale:scale,checked_at:new Date().toISOString()};
  await saveJSON(base+'-qa.json',qa);onProgress(`Saved ${out}`);return {file:out,poster:base+'-poster.png',contact:base+'-contact.jpg',qa};
 }finally{await browser.close();await rm(temp,{recursive:true,force:true});}
}
function filenameOnly(path){return path.split(/[\\/]/).slice(-2).join('/');}
