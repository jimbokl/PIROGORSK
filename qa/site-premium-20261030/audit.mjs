import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const baseline=process.argv.includes('--baseline'), production=baseline||process.argv.includes('--production');
const origin='https://pirogorsk.ru',site=resolve('site');
const output=resolve('qa/site-premium-20261030',baseline?'baseline':production?'production':'local');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.jpg':'image/jpeg'};
const axe=await readFile('node_modules/axe-core/axe.min.js','utf8');
const results=[],flows=[],errors=[],failed=[];
await mkdir(output,{recursive:true});
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
async function pageFor(width){
 const context=await browser.createBrowserContext(),page=await context.newPage();
 await page.setViewport({width,height:1000,deviceScaleFactor:1,isMobile:width<700,hasTouch:width<1100});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
 await page.setRequestInterception(true);
 page.on('request',async request=>{const url=new URL(request.url());try{
  if(url.protocol==='data:')return await request.continue();
  if(url.origin==='https://mc.yandex.ru')return await request.respond({status:200,body:''});
  assert.equal(url.origin,origin);assert.equal(request.method(),'GET','No real submissions');
  if(production)return await request.continue();
  const path=resolve(site,`.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/')?'index.html':''}`);
  assert.ok(path.startsWith(site+sep));await request.respond({status:200,contentType:types[extname(path)]||'application/octet-stream',body:await readFile(path)});
 }catch(e){failed.push(`${url.href}: ${e.message}`);await request.abort();}});
 return {context,page};
}
const paths=['/','/menu/','/pirogi/myasnoy-pirog/','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/','/blog/','/journal/skolko-piroga-na-cheloveka/','/delivery/','/zelenogradsk/','/podbor/'];
const name=p=>p==='/'?'home':p.split('/').filter(Boolean).join('-');
async function visit(page,path,width){
 await page.goto(`${origin}${path}?qa=1`,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
 const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,canonical:document.querySelector('link[rel=canonical]')?.href,background:getComputedStyle(document.body).backgroundColor,ink:getComputedStyle(document.body).getPropertyValue('--ink').trim()}));
 assert.equal(state.overflow,false,`${path}@${width}: overflow`);assert.equal(state.h1,1);assert.equal(state.canonical,origin+path);
 let violations=[];
 if(!baseline){await page.evaluate(axe);violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[],`${path}@${width}: accessibility`);}
 results.push({path,width,...state,violations});
 if(paths.indexOf(path)<6||path==='/delivery/'){
  await page.screenshot({path:`${output}/${name(path)}-${width}.jpg`,type:'jpeg',quality:85});
  if(!baseline&&[390,768,1280].includes(width)&&path!=='/menu/'){
   await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';for(let y=0;y<document.documentElement.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));scrollTo(0,0);});
   await page.screenshot({path:`${output}/${name(path)}-${width}-full.jpg`,type:'jpeg',quality:80,fullPage:true});
   for(const selector of ['.home-departments','.home-offers','.home-featured','[data-product-addons]','.blog-card-grid']){
    const section=await page.$(selector);if(section)await section.screenshot({path:`${output}/${name(path)}-${selector.replace(/[^a-z-]/g,'')}-${width}.jpg`,type:'jpeg',quality:85});
   }
  }
 }
}
try{
 for(const width of baseline?[390,768,1280]:[320,390,768,1024,1280]){
  const {context,page}=await pageFor(width);
  for(const path of baseline?paths.slice(0,6):paths)await visit(page,path,width);
  if(!baseline){
   await visit(page,'/menu/',width);
   await page.screenshot({path:`${output}/menu-start-${width}.jpg`,type:'jpeg',quality:85});
   const row=await page.$('.menu-feed-item');assert.ok(row,'Menu feed exists');
   await row.scrollIntoView();
   await page.screenshot({path:`${output}/menu-feed-${width}.jpg`,type:'jpeg',quality:85});
   flows.push({width,feed:true});
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log(`${baseline?'BASELINE':production?'PRODUCTION':'LOCAL'} PASS: ${results.length} page/viewport checks, no overflow, JS/HTTP errors${baseline?'':', or automated WCAG A/AA violations'}.`);
}finally{
 await writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),production,baseline,results,flows,errors,failed},null,2)+'\n');
 await browser.close();await chrome.kill();
}
