import { mkdir, writeFile } from 'node:fs/promises';
import { serve } from '../lib/preview.mjs';
import { launchBrowser } from '../lib/browser.mjs';
import assert from 'node:assert/strict';
const server=process.env.DEMO_URL?null:await serve('docs',0),browser=await launchBrowser(),results=[];
const baseURL=process.env.DEMO_URL||`http://127.0.0.1:${server.address().port}/`;
await mkdir('output/verification',{recursive:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  await page.setViewportSize({width,height});await page.goto(baseURL);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Horizontal overflow');
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  for(const format of ['launch','portrait','square']){
   await page.click(`[data-format="${format}"]`);
   await page.evaluate(()=>{document.querySelector('video').muted=true;});
   await page.click('#play-film');
   await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);await page.evaluate(()=>document.querySelector('video').pause());
   results.push({viewport:name,format,decoded:true});
  }
  await page.goto(baseURL);
  await page.evaluate(()=>document.fonts.ready);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
  assert.equal(await page.locator('.skip').evaluate(e=>getComputedStyle(e).clipPath),'none');
  await page.locator('.skip').evaluate(e=>e.blur());
  assert.equal(await page.locator('.skip').evaluate(e=>getComputedStyle(e).clipPath),'inset(50%)');
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.evaluate(()=>{const image=new Image();image.src=document.querySelector('video').poster;return image.decode();});
  await page.screenshot({path:`output/verification/${name}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);await writeFile('output/verification/browser.json',JSON.stringify({passed:true,results,errors},null,2));console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
