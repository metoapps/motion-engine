import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDemo } from '../lib/demo.mjs';
import { serve } from '../lib/preview.mjs';

test('demo scaffolds a portable project without a key and never overwrites',async t=>{
 const parent=await mkdtemp(join(tmpdir(),'motion-demo-'));t.after(()=>rm(parent,{recursive:true,force:true}));
 const out=join(parent,'demo');await createDemo({out,format:'portrait'});
 const cfg=JSON.parse(await readFile(join(out,'project.json')));assert.equal(cfg.width,720);assert.equal(cfg.height,1280);assert.deepEqual(cfg.media,{});
 assert.ok((await readFile(join(out,'engine/runtime.js'))).length>0);await assert.rejects(()=>createDemo({out}),/already exists/);
});
test('invalid preset and asset paths do not leave a partial project',async t=>{
 const parent=await mkdtemp(join(tmpdir(),'motion-invalid-'));t.after(()=>rm(parent,{recursive:true,force:true}));
 await assert.rejects(()=>createDemo({out:join(parent,'demo'),preset:'oops'}),/Preset/);
 await writeFile(join(parent,'media.json'),JSON.stringify({image:'missing.png'}));await assert.rejects(()=>createDemo({out:join(parent,'demo'),assets:join(parent,'media.json')}));
});
test('preview serves media but excludes secrets and state files',async t=>{
 const parent=await mkdtemp(join(tmpdir(),'motion-server-'));t.after(()=>rm(parent,{recursive:true,force:true}));
 await writeFile(join(parent,'index.html'),'<h1>Demo</h1>');await writeFile(join(parent,'.env'),'secret');await writeFile(join(parent,'hero.state.json'),'private');
 const server=await serve(parent,0);t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/hero.state.json')).status,404);
});
