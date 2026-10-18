import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Raywake, generate, withStateLock } from '../lib/raywake.mjs';
import { fingerprint, decimal, saveJSON } from '../lib/util.mjs';
const request={model:'test/image',input:{prompt:'A launch'}};
const quote=()=>({request,request_hash:fingerprint(request),quote:{quote_id:'q1',price_usd:'0.24',expires_at:new Date(Date.now()+60000).toISOString()}});
const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...headers}});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function work(t){const dir=await mkdtemp(join(tmpdir(),'motion-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {statePath:join(dir,'hero.state.json'),out:join(dir,'hero'),request,quoted:quote(),maxUSD:'0.24',approved:true,verifyFile:async path=>{assert.ok((await readFile(path)).length);}};}
function client(fetch){return new Raywake({key:'test-key',base:'http://localhost:9876',fetch,sleep:async()=>{},pollMs:0});}

test('USD comparison is exact and rejects ambiguous amounts',()=>{
 assert.equal(decimal('0.24000001')>decimal('0.24'),true);for(const bad of ['NaN','-1','1e3','0.000000001',undefined])assert.throws(()=>decimal(bad));
});
test('quote never starts generation and accepts the current USD contract',async()=>{
 const calls=[];const c=client(async(url,options)=>{calls.push(url);assert.equal(options.method,'POST');return response(quote().quote);});
 const q=await c.quote(request);assert.equal(q.request_hash,fingerprint(request));assert.equal(q.quote.price_usd,'0.24');assert.deepEqual(calls,['http://localhost:9876/v1/quotes']);
});
test('budget, expiry, approval and input mismatch fail before a paid request',async t=>{
 const c=client(()=>{assert.fail('No network call is allowed');});const base=await work(t);
 await assert.rejects(()=>generate(c,{...base,maxUSD:'0.23'}),/exceeds/);
 await assert.rejects(()=>generate(c,{...base,approved:false}),/requires/);
 await assert.rejects(()=>generate(c,{...base,quoted:{...quote(),request_hash:'wrong'}}),/match/);
 const expired=quote();expired.quote.expires_at='2020-01-01';await assert.rejects(()=>generate(c,{...base,quoted:expired}),/expired/);
});
test('transient submit uses one key, polls finalizing, downloads without bearer auth',async t=>{
 const opts=await work(t);const keys=[],auth=[];let attempts=0,polls=0;
 const c=client(async(url,options={})=>{
  url=String(url);
  if(url.endsWith('/generate')){keys.push(options.headers['Idempotency-Key']);assert.equal(JSON.parse(await readFile(opts.statePath)).idempotency_key,keys[0]);if(attempts++===0)throw new Error('timeout');return response({job_id:'j1',status:'finalizing'});}
  if(url.endsWith('/jobs/j1')){polls++;return response({job_id:'j1',status:'succeeded',charged_usd:'0.24',outputs:[{type:'image',mime_type:'image/png',url:'https://media.example/image'}]});}
  auth.push(options.headers);return new Response(png,{headers:{'Content-Type':'image/png'}});
 });
 const state=await generate(c,opts);assert.equal(state.status,'downloaded');assert.equal(state.files.length,1);assert.equal(polls,1);assert.equal(new Set(keys).size,1);assert.equal(keys.length,2);assert.deepEqual(auth,[undefined]);
 await assert.rejects(()=>generate(c,opts),/already exists/);
});
test('resume after ambiguous submit reuses the persisted body and key',async t=>{
 const opts=await work(t);let key,body;
 const failed=client(async(url,o)=>{key=o.headers['Idempotency-Key'];body=o.body;throw new Error('timeout');});
 await assert.rejects(()=>generate(failed,opts),/could not be reached/);
 const resumed=client(async(url,o)=>{
  if(String(url).endsWith('/generate')){assert.equal(o.headers['Idempotency-Key'],key);assert.equal(o.body,body);return response({job_id:'j2',status:'succeeded',outputs:[{url:'https://media.example/a',type:'audio',mime_type:'audio/wav'}]});}
  return new Response(Buffer.from('test audio fixture'),{headers:{'Content-Type':'audio/wav'}});
 });
 const result=await generate(resumed,{resume:true,statePath:opts.statePath,verifyFile:opts.verifyFile});assert.equal(result.files[0].type,'audio');
});
test('held and failed jobs never become replacement generations',async t=>{
 for(const status of ['submission_unknown','needs_review','needs_reconciliation','failed','unknown']){
  const opts=await work(t);let submits=0;
  const c=client(async()=>{submits++;return response({job_id:'held',status});});
  await assert.rejects(()=>generate(c,opts),new RegExp(status));assert.equal(submits,1);
 }
});
test('download failure resumes by reading the job; it cannot resubmit',async t=>{
 const opts=await work(t);let submits=0,downloads=0;
 const c=client(async(url)=>{
  if(String(url).endsWith('/generate'))submits++;
  if(String(url).includes('/v1/'))return response({job_id:'j3',status:'succeeded',outputs:[{url:'https://media.example/v',type:'video',mime_type:'video/mp4'}]});
  if(downloads++===0)return new Response('expired',{status:403});
  return new Response(Buffer.from('test video fixture'),{headers:{'Content-Type':'video/mp4'}});
 });
 await assert.rejects(()=>generate(c,opts),/download failed/);
 const state=await generate(c,{resume:true,statePath:opts.statePath,verifyFile:opts.verifyFile});assert.equal(submits,1);assert.equal(state.files[0].type,'video');
});
test('corrupt or missing media resumes the same job and completion follows verification',async t=>{
 const opts=await work(t);let submits=0,downloads=0,gets=0;
 opts.verifyFile=async path=>assert.equal((await readFile(path)).toString(),'decoded media','Decode failed');
 const c=client(async(url)=>{
  url=String(url);
  if(url.endsWith('/generate'))submits++;
  if(url.includes('/jobs/'))gets++;
  if(url.includes('/v1/'))return response({job_id:'recover',status:'succeeded',outputs:[{url:'https://media.example/v',type:'video',mime_type:'video/mp4'}]});
  return new Response(downloads++===0?'corrupt media':'decoded media',{headers:{'Content-Type':'video/mp4'}});
 });
 await assert.rejects(()=>generate(c,opts),/Decode failed/);
 assert.notEqual(JSON.parse(await readFile(opts.statePath)).status,'downloaded');
 const resume={resume:true,statePath:opts.statePath,verifyFile:opts.verifyFile};
 const state=await generate(c,resume);assert.equal(state.status,'downloaded');assert.equal(downloads,2);
 await generate(c,resume);assert.equal(downloads,2,'valid saved output is reused');
 await rm(state.files[0].path);await generate(c,resume);
 assert.equal(submits,1);assert.equal(gets,2);assert.equal(downloads,3);
});
test('HTML returned as a media file is rejected',async()=>{
 const c=client(async()=>new Response('<html>Error</html>',{headers:{'Content-Type':'text/html'}}));
 await assert.rejects(()=>c.download({job_id:'j',outputs:[{url:'https://media.example/x',type:'image'}]},join(tmpdir(),'invalid-motion-output')),/not a supported/);
});
test('state lock prevents concurrent submissions',async t=>{
 const opts=await work(t);await withStateLock(opts.statePath,async()=>{await assert.rejects(()=>withStateLock(opts.statePath,()=>{}),/Another process/);});
});
test('authentication errors are not retried and secrets are redacted',async()=>{
 let n=0;const c=client(async()=>{n++;return response({detail:'test-key' },400);});
 await assert.rejects(()=>c.wallet(),e=>!e.message.includes('test-key'));assert.equal(n,1);
});
