import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const production=process.argv.includes('--production');
const origin='https://pirogorsk.ru',site=fileURLToPath(new URL('../../site/',import.meta.url));
const output=fileURLToPath(new URL(production?'./production/':'./local/',import.meta.url));
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const results=[],errors=[],failed=[];
const routes=[['home','/'],['menu','/menu/'],['delivery','/delivery/'],['blog','/blog/'],['article','/journal/skolko-piroga-na-cheloveka/'],['meat','/pirogi/myasnoy-pirog/'],['supplier','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/']];
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 await mkdir(output,{recursive:true});
 for(const width of [320,390,768,1280]){
  const context=await browser.createBrowserContext(),page=await context.newPage();
  await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`)});
  await page.setRequestInterception(true);
  page.on('request',async r=>{
   const u=new URL(r.url());try{
    if(u.protocol==='data:')return await r.continue();
    if(u.origin==='https://mc.yandex.ru')return await r.respond({status:200,body:''});
    if(u.origin!==origin||r.method()!=='GET'){failed.push(r.url());return await r.abort()}
    if(production)return await r.continue();
    const path=resolve(site,`.${decodeURIComponent(u.pathname)}${u.pathname.endsWith('/')?'index.html':''}`);
    assert.ok(path.startsWith(site.endsWith(sep)?site:site+sep));
    await r.respond({status:200,contentType:types[extname(path)]||'application/octet-stream',body:await readFile(path)});
   }catch(e){failed.push(`${u.pathname}: ${e.message}`);await r.abort()}
  });
  for(const [name,route]of routes){
   await page.goto(`${origin}${route}?qa=1`,{waitUntil:'networkidle0'});
   await page.evaluate(async()=>{await document.fonts.ready;for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,70))}await Promise.race([Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,4000))])});
   await new Promise(r=>setTimeout(r,250));await page.evaluate(()=>window.scrollTo(0,0));
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.currentSrc),height:document.body.scrollHeight}));
   assert.equal(state.overflow,false,`${name}/${width} overflow`);assert.equal(state.h1,1);assert.deepEqual(state.broken,[]);
   await page.screenshot({path:`${output}/${name}-${width}.jpg`,type:'jpeg',quality:78,fullPage:true});
   await page.screenshot({path:`${output}/${name}-top-${width}.jpg`,type:'jpeg',quality:88});
   if(name==='home'){for(const [label,selector]of [['departments','.home-departments'],['bundles','.home-offers'],['featured','.home-featured']]){await page.$eval(selector,e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:`${output}/${label}-${width}.jpg`,type:'jpeg',quality:85});}}
   results.push({name,width,...state});
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),production,results,errors,failed},null,2));
 console.log(`PASS: ${results.length} page/viewport checks`);
}finally{await browser.close();await chrome.kill()}
