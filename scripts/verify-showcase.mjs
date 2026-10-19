import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { serve } from '../lib/preview.mjs';
import { launchBrowser } from '../lib/browser.mjs';
const server=process.env.DEMO_URL?null:await serve('docs',0);
const base=process.env.DEMO_URL||`http://127.0.0.1:${server.address().port}/`;
const browser=await launchBrowser(),results=[],errors=[];
await mkdir('output/verification',{recursive:true});
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [name,width,height] of [['showcase-desktop',1440,1000],['showcase-tablet',768,1024],['showcase-mobile',390,844],['showcase-small',320,700]]){
  await page.setViewportSize({width,height});
  assert.equal((await page.goto(new URL('showcase/index.html',base).href)).status(),200);
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.card:visible').count(),101);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Gallery overflow');
  await page.evaluate(()=>Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode();})));
  await page.screenshot({path:`output/verification/${name}.png`});
  if(width<=640){assert.equal(await page.locator('.filters').getAttribute('open'),null);await page.locator('.filters summary').click();}
  if(name==='showcase-desktop'){
   const categories=await page.locator('#aile button').evaluateAll(bs=>bs.map(b=>b.dataset.c));
   const styles=await page.locator('#evstili button').evaluateAll(bs=>bs.map(b=>b.dataset.e));
   let emptyTested=false;
   for(const category of categories)for(const style of styles){
    await page.click(`[data-c="${category}"]`);await page.click(`[data-e="${style}"]`);
    const count=await page.locator('.card:visible').count();
    const expected=await page.locator('.card').evaluateAll((cards,{category,style})=>cards.filter(c=>(category==='all'||c.dataset.cat===category)&&(style==='all'||c.dataset.ev===style)).length,{category,style});
    assert.equal(count,expected);assert.equal(await page.locator('#count').textContent(),`${expected} tema gösteriliyor`);
    assert.equal(await page.locator('#empty').isVisible(),expected===0);
    assert.equal(await page.locator(`[data-c="${category}"]`).getAttribute('aria-pressed'),'true');
    if(!expected)emptyTested=true;
   }
   assert.ok(emptyTested,'Empty filter state was exercised');
  }
  await page.click('[data-c="material"]');await page.click('[data-e="all"]');
  assert.equal(await page.locator('.card:visible').count(),10);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>scrollTo({top:document.querySelector('.count').offsetTop,behavior:'instant'}));
  await page.screenshot({path:`output/verification/${name}-themes.png`});
  results.push({viewport:name,themeCount:101,decoded:true,overflow:false});
 }
 await page.setViewportSize({width:1440,height:1000});
 for(const theme of ['000-ev-stili','001-spreadsheet-cinema','021-clay-studio','061-dark-keynote']){
  assert.equal((await page.goto(new URL(`showcase/themes/${theme}.html`,base).href)).status(),200);
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  assert.equal(await page.locator('.cell').count(),4);
  if(theme==='001-spreadsheet-cinema'){
   assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()),'#0FA3A3');
   await page.screenshot({path:'output/verification/original-theme.png',fullPage:true});
  }
 }
 await page.locator('.back').click();await page.waitForURL('**/showcase/index.html');
 assert.equal(await page.locator('.brand img').getAttribute('alt'),'Raywake');
 assert.deepEqual(errors,[]);
 await writeFile('output/verification/showcase.json',JSON.stringify({passed:true,results,filterCombinations:44,originalThemesOpened:4,errors},null,2));
 console.log(JSON.stringify({passed:true,results,filterCombinations:44,originalThemesOpened:4}));
}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
