#!/usr/bin/env node
import { resolve, dirname } from 'node:path';
import { createDemo } from '../lib/demo.mjs';
import { render, doctor, verifyMedia } from '../lib/render.mjs';
import { Raywake, generate } from '../lib/raywake.mjs';
import { serve } from '../lib/preview.mjs';
import { loadEnv, json, saveJSON, link } from '../lib/util.mjs';

const help=`motion-engine · editable motion, optional AI media by Raywake

  demo [--preset launch|product|story] [--format landscape|portrait|square]
       [--out output/launch] [--assets media.json] [--scale 1|2] [--gif] [--no-render]
  render <index.html> [--out film.mp4] [--scale 1|2] [--gif]
  preview <project-directory> [--port 4173]
  doctor

  models [--search text] [--category text-to-image]
  model <model-id>                          Read the current input schema
  wallet                                   Read available USD balance
  quote <request.json> --out quote.json      Price exact inputs; no charge
  generate <request.json> --quote quote.json --out output/hero --max-usd 1.00 --yes
  resume <output/hero.state.json>            Continue the SAME job
  download <job-id> --out output/hero        Download an existing job; no generation

First demo: npm run demo
Raywake keys: ${link('api-keys','help')}
`;
const args=process.argv.slice(2),command=args[0];
const flags=new Map(),pos=[];
const switches=new Set(['yes','gif','no-render','help']);
for(let i=1;i<args.length;i++){
 if(args[i].startsWith('--')){const key=args[i].slice(2);if(switches.has(key))flags.set(key,true);else{if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('Missing value for --'+key);flags.set(key,args[++i]);}}
 else pos.push(args[i]);
}
const opt=(k,fallback)=>flags.get(k)??fallback;
const need=(value,label)=>{if(!value)throw new Error('Missing '+label);return value;};
const print=v=>console.log(JSON.stringify(v,null,2));
try{
 await loadEnv();
 if(!command||command==='help'||command==='--help'||flags.has('help'))console.log(help);
 else if(command==='doctor')print(doctor());
 else if(command==='demo'){
  const out=opt('out','output/'+opt('preset','launch'));
  const file=await createDemo({out,preset:opt('preset','launch'),format:opt('format','landscape'),assets:opt('assets')});
  if(!flags.has('no-render'))await render(file,{out:resolve(out,'film.mp4'),scale:Number(opt('scale',1)),gif:flags.has('gif')});
  console.log(`Editable project: ${dirname(file)}\nPreview: node bin/motion-engine.mjs preview "${dirname(file)}"`);
 }else if(command==='render')await render(need(pos[0],'HTML file'),{out:opt('out'),scale:Number(opt('scale',1)),gif:flags.has('gif')});
 else if(command==='preview'){
  const server=await serve(need(pos[0],'project directory'),Number(opt('port',4173)));
  console.log(`Preview: http://127.0.0.1:${server.address().port}/?play\nPress Ctrl+C to stop.`);
 }else{
  if(!['models','model','wallet','quote','generate','resume','download'].includes(command))throw new Error('Unknown command: '+command+'\n'+help);
  const client=new Raywake();
  if(command==='models')print(await client.models(opt('search',''),opt('category','')));
  else if(command==='model')print(await client.model(need(pos[0],'model ID')));
  else if(command==='wallet')print(await client.wallet());
  else if(command==='quote'){
   const request=await json(need(pos[0],'request file')),quoted=await client.quote(request),out=need(opt('out'),'--out');
   await saveJSON(out,quoted);console.log(`Quoted $${quoted.quote.price_usd} USD. Expires ${quoted.quote.expires_at}. No generation started.\nSaved ${out}`);
  }else if(command==='generate'||command==='resume'){
   const isResume=command==='resume';
   const options=isResume?{resume:true,statePath:need(pos[0],'state file')}:{request:await json(need(pos[0],'request file')),quoted:await json(need(opt('quote'),'--quote')),out:need(opt('out'),'--out'),statePath:opt('out')+'.state.json',maxUSD:need(opt('max-usd'),'--max-usd'),approved:flags.has('yes')};
   let last;options.onUpdate=j=>{if(last!==j.status){console.log(`Job ${j.job_id}: ${j.status}`);last=j.status;}};
   const state=await generate(client,options);
   console.log(`Downloaded and decoded ${state.files.length} file(s). Quoted: $${state.price_usd} USD. Charged: ${state.charged_usd===null?'pending':`$${state.charged_usd} USD`}.`);
   print(state.files);
  }else if(command==='download'){
   const job=await client.poll(await client.job(need(pos[0],'job ID')));
   const files=await client.download(job,need(opt('out'),'--out'));for(const file of files)verifyMedia(file.path,file.type);print(files);
  }else throw new Error('Unknown command: '+command+'\n'+help);
 }
}catch(e){console.error(`motion-engine: ${e.message}`);process.exitCode=1;}
