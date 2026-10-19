import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';

const root=resolve(import.meta.dirname,'../docs/showcase');
const manifest=JSON.parse(await readFile(resolve(root,'SOURCES.json'),'utf8'));

test('all 101 original theme designs and their assets are byte-for-byte preserved',async()=>{
 assert.equal(Object.keys(manifest.sha256).filter(p=>/^themes\/\d{3}-.+\.html$/.test(p)).length,101);
 for(const [file,expected] of Object.entries(manifest.sha256)){
  const bytes=await readFile(resolve(root,file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,`Original design changed: ${file}`);
 }
});

test('every showcase card and original theme local dependency resolves',async()=>{
 const index=await readFile(resolve(root,'index.html'),'utf8');
 assert.equal((index.match(/class="card(?: home)?"/g)||[]).length,101);
 const files=['index.html','showcase.css',...Object.keys(manifest.sha256).filter(p=>/\.(html|css)$/.test(p))];
 for(const file of files){
  const text=await readFile(resolve(root,file),'utf8');
  const references=[...text.matchAll(/(?:src|href)="([^"]+)"/g),...text.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)];
  for(const [,target] of references){
   if(/^(?:https?:|data:|#)/.test(target))continue;
   assert.ok((await stat(resolve(root,dirname(file),target.split('#')[0]))).isFile(),`${file}: ${target}`);
  }
 }
});
