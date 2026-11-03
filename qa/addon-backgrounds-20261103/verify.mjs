import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import {verifyProductAddOns} from '../../worker/scripts/qa-product-addons.mjs';
const output='qa/addon-backgrounds-20261103',origin='https://pirogorsk.ru';
const stage=process.env.CAPTURE_ONLY?'before':process.env.QA_BASE?'production':'local';
await mkdir(output,{recursive:true});
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const report={stage,widths:[],errors:[]},cache=new Map();
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
try{
 for(const width of (process.env.CAPTURE_ONLY?[390,1280]:[320,390,768,1280])){
  const context=await browser.createBrowserContext(),page=await context.newPage();
  await page.setViewport({width,height:1000});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request',async r=>{
   if(r.url().startsWith('data:'))return r.continue();
   if(!r.url().startsWith(origin+'/')||r.method()!=='GET')return r.abort();
   const path=new URL(r.url()).pathname;
   try{
    if(!cache.has(path)){
     if(process.env.QA_BASE){const response=await fetch(process.env.QA_BASE+path);assert(response.ok,`${response.status} ${path}`);cache.set(path,{status:200,contentType:response.headers.get('content-type')||'',body:Buffer.from(await response.arrayBuffer())});}
     else cache.set(path,{status:200,contentType:types[extname(path)]||'text/html',body:await readFile(resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':'')))});
    }
    await r.respond(cache.get(path));
   }catch(e){report.errors.push(e.message);await r.abort();}
  });
  if(!process.env.CAPTURE_ONLY)await verifyProductAddOns(page,origin,width,`${output}/${stage}-regression`);
  await page.goto(origin+'/pirogi/rybnyy-pirog/?qa=1',{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('[data-product-addons] img')].map(i=>{i.loading='eager';return i.decode()}));});
  await page.$eval('[data-product-addons]',e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  await (await page.$('[data-product-addons]')).screenshot({path:`${output}/${stage}-fish-${width}.png`});
  if(!process.env.CAPTURE_ONLY){
   await page.$eval('[data-product-addons] [data-upsell-add=morse]',e=>e.focus());
   await page.screenshot({path:`${output}/${stage}-focus-${width}.png`});
   await page.evaluate(()=>localStorage.removeItem('pirogorsk-selection'));
   await page.reload({waitUntil:'networkidle0'});
   await page.locator('[data-option-link]').click();
   await page.locator('[data-option-selection]').click();
   await page.waitForSelector('#selection-dialog[open]');
   await page.$eval('#selection-dialog [data-upsells]',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
   await page.screenshot({path:`${output}/${stage}-selection-${width}.png`});
  }
  report.widths.push(width);await context.close();
 }
 assert.deepEqual(report.errors,[]);
 await writeFile(`${output}/${stage}-report.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`PASS ${stage}: ${report.widths.join('/')} px; product add-on regression and product/selection captures.`);
}finally{await browser.close();await chrome.kill();}
