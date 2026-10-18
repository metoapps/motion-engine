import { mkdir, writeFile } from 'node:fs/promises';
import { serve } from '../lib/preview.mjs';
import { launchBrowser } from '../lib/browser.mjs';
import assert from 'node:assert/strict';
const server=await serve('docs',0),browser=await launchBrowser(),results=[];
await mkdir('output/verification',{recursive:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  await page.setViewportSize({width,height});await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Horizontal overflow');
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  for(const format of ['launch','portrait','square']){
   await page.click(`[data-format="${format}"]`);await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=2;});
   await page.evaluate(async()=>{const v=document.querySelector('video');v.muted=true;await v.play();});
   await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);await page.evaluate(()=>document.querySelector('video').pause());
   results.push({viewport:name,format,decoded:true});
  }
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(()=>document.fonts.ready);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
  assert.equal(await page.locator('.skip').evaluate(e=>getComputedStyle(e).clipPath),'none');
  await page.locator('.skip').evaluate(e=>e.blur());
  assert.equal(await page.locator('.skip').evaluate(e=>getComputedStyle(e).clipPath),'inset(50%)');
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:`output/verification/${name}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);await writeFile('output/verification/browser.json',JSON.stringify({passed:true,results,errors},null,2));console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
