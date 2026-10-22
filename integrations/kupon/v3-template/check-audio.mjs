#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const run=(exe,args)=>{const p=spawnSync(exe,args,{maxBuffer:75*1024*1024});if(p.error||p.status!==0)throw Error(exe+' failed: '+(p.stderr||'').toString().slice(-1000));return p.stdout};
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const lock=JSON.parse(readFileSync(new URL('./V7-LOCK.json',import.meta.url)));
function rms(file,start,duration){
 const pcm=run('ffmpeg',['-v','error','-ss',String(start),'-t',String(duration),'-i',file,'-vn','-ac','1','-ar','16000','-f','s16le','-acodec','pcm_s16le','pipe:1']);
 const n=Math.floor(pcm.length/2);if(n<8000)throw Error('No decoded audio samples');let sum=0;
 for(let i=0;i<n;i++){const x=pcm.readInt16LE(i*2)/32768;sum+=x*x}
 return 20*Math.log10(Math.sqrt(sum/n)+1e-12);
}
export function verify(video,music){
 for(const p of [video,music])if(!existsSync(p))throw Error('Missing input '+p);
 if(sha(music)!==lock.audio_sha256)throw Error('Wrong V7 music SHA-256');
 const info=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height,r_frame_rate','-of','json',video]));
 const v=info.streams.find(s=>s.codec_type==='video'),a=info.streams.find(s=>s.codec_type==='audio');
 if(!a)throw Error('MUSIC_MISSING: no audio stream');
 if(!v||v.width!==720||v.height!==1280||v.r_frame_rate!=='24/1'||Math.abs(Number(info.format.duration)-15)>.2)throw Error('Invalid output format');
 const levels=[['METO',2.6,3.8],['LORT',7.3,3.7]].map(([scene,t,d])=>({scene,rms_dbfs:rms(video,t,d)}));
 if(levels.some(x=>x.rms_dbfs < -43))throw Error('MUSIC_MISSING: '+levels.filter(x=>x.rms_dbfs < -43).map(x=>x.scene).join(',')+' silent');
 run('ffmpeg',['-v','error','-xerror','-i',video,'-f','null','-']);
 return {passed:true,audio_codec:a.codec_name,levels,duration:Number(info.format.duration),approved_music_sha256:lock.audio_sha256};
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
 try{const [video,music]=process.argv.slice(2);if(!video||!music)throw Error('Usage: node check-audio.mjs OUTPUT.mp4 APPROVED-V7.wav');console.log(JSON.stringify(verify(resolve(video),resolve(music)),null,2))}
 catch(e){console.error('AUDIO_CHECK_FAIL:',e.message);process.exitCode=1}
}
