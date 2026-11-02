import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { verifyProductAddOns } from '../../worker/scripts/qa-product-addons.mjs';
import { verifyCatalogFormats } from '../../worker/scripts/qa-catalog-formats.mjs';

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
 for (const width of [320,390,768,1280]) {
  await page.setViewport({width,height:1000});
  await verifyCatalogFormats(page,origin,width,output+'/'+stage+'-formats');
  await verifyProductAddOns(page,origin,width,output+'/'+stage+'-addons');
  await page.goto(origin+'/povody/zelenogradsk/semeynyy-uzhin/?qa=1',{waitUntil:'networkidle0'});
  await page.focus('.guide-faq summary');await page.keyboard.press('Enter');
  assert.equal(await page.$eval('.guide-faq details',e=>e.open),true,'FAQ opens by keyboard');
  await page.keyboard.press('Enter');assert.equal(await page.$eval('.guide-faq details',e=>e.open),false,'FAQ closes by keyboard');
  assert.equal(await page.$$eval('.guide-faq summary',els=>els.every(e=>e.offsetHeight>=44)),true,'FAQ touch targets');
  await page.setJavaScriptEnabled(false);await page.reload({waitUntil:'networkidle0'});
  await page.$eval('.guide-faq summary',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click('.guide-faq summary');
  assert.equal(await page.$eval('.guide-faq details',e=>e.open),true,'FAQ works without JS');
  await page.goto(origin+'/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/?qa=1',{waitUntil:'networkidle0'});
  assert.equal(await page.$$eval('[data-product-options] [data-variant-price]',els=>els.every(e=>e.textContent.includes('₽'))),true,'format prices in HTML');
  assert.equal(await page.$eval('[data-option-quantity-control]',e=>e.hidden),true,'no dead quantity controls without JS');
  assert.equal(await page.$eval('[data-option-link]',e=>new URL(e.href).searchParams.has('interest')),true,'no-JS selection link');
  await page.setJavaScriptEnabled(true);report.views.push({width,formats:'PASS',quantityGeometry:'PASS',addons:'PASS',faqKeyboardAndNoJS:'PASS',fallback:'PASS'});
 }
 assert.deepEqual(report.errors,[]);
 await writeFile(`${output}/${stage}-targeted.json`,JSON.stringify(report,null,2));console.log('PASS: targeted product, add-ons and FAQ QA on four widths');
}finally{await browser.close();await chrome.kill();}
