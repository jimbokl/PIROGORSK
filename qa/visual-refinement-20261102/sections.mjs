import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { verifyMenuQuantity } from '../../worker/scripts/qa-menu-quantity.mjs';

const output = 'qa/visual-refinement-20261102';
const stage = process.env.QA_STAGE || 'before';
const origin = 'https://pirogorsk.ru';
const paths = [['home','/'],['menu','/menu/'],['delivery','/delivery/'],['city','/zelenogradsk/'],['blog','/blog/'],['article','/journal/dostavka-edy-v-zelenogradske/'],['product','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/'],['bundles','/nabory/'],['bundle','/nabor/piknik-u-morya/'],['occasion','/povody/zelenogradsk/semeynyy-uzhin/'],['planner','/podbor/'],['about','/about/'],['original','/pirogi/myasnoy-pirog/'],['picnic','/catalog/baltiyskiy-piknik-set/'],['occasions','/povody/'],['ossetian','/osetinskie-pirogi/'],['partners','/partners/'],['privacy','/privacy/'],['terms','/terms/']];
const types = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
const report = { stage, views: [], errors: [] };
await mkdir(output,{recursive:true});
const chrome = await launch({chromeFlags:['--headless=new','--disable-extensions','--disable-features=OverlayScrollbar']});
const browser = await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const page = await browser.newPage(); const cache = new Map();
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
page.on('pageerror', e=>report.errors.push(e.message));
await page.setRequestInterception(true);
page.on('request',async request=>{
  if(request.url().startsWith('data:')) return request.continue();
  if(!request.url().startsWith(origin+'/') || request.method()!=='GET') return request.abort();
  const path = new URL(request.url()).pathname;
  try {
    if(!cache.has(path)) {
      if(process.env.QA_BASE){
        const response = await fetch(process.env.QA_BASE+path);
        if(!response.ok) throw new Error(`${response.status}: ${path}`);
        cache.set(path,{status:200,contentType:response.headers.get('content-type')||'',body:Buffer.from(await response.arrayBuffer())});
      } else cache.set(path,{status:200,contentType:types[extname(path)]||'text/html',body:await readFile(resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':'')))});
    }
    await request.respond(cache.get(path));
  }catch(e){report.errors.push(e.message);await request.abort();}
});
try {
 for(const width of [390,768,1280])for(const [id,path,selector] of [
 ['options','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/','.product-options'],
 ['single','/catalog/baltiyskiy-piknik-set/','.product-options'],
 ['addons','/pirogi/myasnoy-pirog/','.product-addons'],
 ['faq','/povody/zelenogradsk/semeynyy-uzhin/','.guide-faq'],
 ['planner-result','/podbor/','.planner-result'],
 ['footer','/about/','footer'],
 ['bundle-purchase','/nabor/uzhin-v-apartamentah/','.bundle-composition']
 ]){
  await page.setViewport({width,height:1000});
  await page.goto(origin+path+'?qa=1',{waitUntil:'networkidle0'});await page.evaluate(()=>{document.activeElement?.blur();return document.fonts.ready;});await page.mouse.move(width-1,999);
  const el=await page.$(selector);if(!el){report.errors.push(`${id}: missing ${selector}`);continue;}
  await el.evaluate(async e=>{e.scrollIntoView({block:'start',behavior:'instant'});await Promise.all([...e.querySelectorAll('img')].map(i=>{i.loading='eager';return i.decode().catch(()=>{});}));});
  if(id==='options'){
   const metrics=()=>el.evaluate(e=>{const q=e.querySelector('[data-option-quantity]'),b=e.querySelector('.product-options-bottom'),r=e.getBoundingClientRect(),a=e.querySelector('[data-option-link]').getBoundingClientRect();return {value:q.value,height:r.height,buttonY:a.y-r.y};});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const a=await metrics();await el.$eval('[data-option-quantity]',e=>{e.value='99';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const b=await metrics();report.views.push({id,width,before:a,quantity99:b});console.log(JSON.stringify({id,width,before:a,quantity99:b}));if(stage!=='before'){assert(Math.abs(a.height-b.height)<=1&&Math.abs(a.buttonY-b.buttonY)<=1,`Stable purchase geometry at ${width}`);}
  }
  if(id==='options') await el.$eval('[data-option-quantity]',e=>{e.value='1';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await el.evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:`${output}/${stage}-section-${id}-${width}.png`});
 }
 assert.deepEqual(report.errors,[]);
 await writeFile(`${output}/${stage}-sections.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({views:report.views,errors:report.errors}));
}finally{await browser.close();await chrome.kill();}
