import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { catalog, products } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';

const output='qa/product-copy-20261102';
const stage=process.env.QA_STAGE||'local';
const origin='https://pirogorsk.ru';
const sampleIds=['p39-10','hb-osetinskiy-pirog-s-kuritsey-i-syrom','cranberry','tableware','picnic-set'];
const samples=sampleIds.map(id=>{const p=catalog.find(p=>p.id===id);assert(p,id);return p;});
const report={stage,views:[],errors:[],integrity:{}};
const getHTML=p=>readFile(`site${catalogProductHref(p)}index.html`,'utf8');
for(const p of products){const html=await getHTML(p);assert(html.includes('data-product-notes'));assert(!html.includes('К запуску меню'));assert(!html.includes('Точные пропорции'));assert(!html.includes('town-invitation'));}
const others=catalog.filter(p=>!products.some(original=>original.id===p.id));
let disclosures=0;
for(const p of others){const html=await getHTML(p);if(p.id!=='picnic-set'){assert(html.includes('data-product-disclosure'),p.id);disclosures++;}}
const ingredients=[...JSON.parse(await readFile('src/data/pirogi39-content.json','utf8')),...JSON.parse(await readFile('src/data/supplier-content.json','utf8'))];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
for(const facts of ingredients){const p=catalog.find(p=>p.id===facts.id);assert(p);const html=await getHTML(p);if(facts.ingredients)assert(html.includes(escape(facts.ingredients)),`${p.id}: full composition remains in HTML`);assert(html.includes(facts.sourceUrl),`${p.id}: source remains`);}
report.integrity={originals:products.length,catalog:others.length,servingDisclosures:disclosures,supplierFacts:ingredients.length};
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const page=await browser.newPage();const cache=new Map();
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
page.on('pageerror',e=>report.errors.push(e.message));
await page.setRequestInterception(true);
page.on('request',async req=>{
 if(req.url().startsWith('data:'))return req.continue();
 if(!req.url().startsWith(origin+'/')||req.method()!=='GET')return req.abort();
 const path=new URL(req.url()).pathname;
 try{
  if(!cache.has(path)){
   if(process.env.QA_BASE){const res=await fetch(process.env.QA_BASE+path);assert(res.ok,`${res.status} ${path}`);cache.set(path,{status:200,contentType:res.headers.get('content-type')||'',body:Buffer.from(await res.arrayBuffer())});}
   else cache.set(path,{status:200,contentType:types[extname(path)]||'text/html',body:await readFile(resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':'')))});
  }
  await req.respond(cache.get(path));
 }catch(e){report.errors.push(e.message);await req.abort();}
});
const go=async p=>{await page.goto(origin+catalogProductHref(p)+'?qa=1',{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);};
const fits=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal overflow');
const screenshot=async options=>{
 await page.waitForFunction(()=>[...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;}).every(img=>img.complete&&img.naturalWidth>0),{timeout:15000});
 await page.screenshot(options);
};
try{
 for(const width of [320,390,768,1280]){
  await page.setViewport({width,height:1000});
  for(const p of [...products,...samples]){
   await go(p);await fits();
   if(products.some(original=>original.id===p.id)){
    const note=await page.$eval('[data-product-notes]',el=>({height:el.offsetHeight,words:el.innerText.trim().split(/\s+/).length,links:[...el.querySelectorAll('a')].map(a=>({href:a.pathname,height:a.offsetHeight}))}));
    assert(note.words<=42,`${p.id}: concise note`);assert(note.height<=330,`${p.id}: compact height ${note.height}`);assert.equal(note.links.length,2);
    for(const link of note.links){assert(link.height>=44);assert(products.some(p=>catalogProductHref(p)===link.href));}
    if(p.id==='curd') {await page.$eval('[data-product-notes]',el=>el.scrollIntoView({block:'center',behavior:'instant'}));await screenshot({path:`${output}/${stage}-curd-${width}.png`});}
    report.views.push({id:p.id,width,note});
   }else{
    const rows=await page.$$eval('[data-product-disclosure]',els=>els.map(el=>({open:el.open,height:el.querySelector('summary').offsetHeight,hiddenBody:el.querySelector('.disclosure-body').getBoundingClientRect().height, title:el.querySelector('summary').textContent.trim()})));
    assert(rows.every(row=>!row.open&&row.height>=44));
    for(let i=0;i<rows.length;i++){
     const handles=await page.$$('[data-product-disclosure] summary');await handles[i].focus();await page.keyboard.press('Enter');
     assert.equal(await page.$$eval('[data-product-disclosure]',(els,i)=>els[i].open,i),true,'keyboard opens');await fits();
     if(p.id==='p39-10'&&i===1){await handles[0].evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await screenshot({path:`${output}/${stage}-facts-open-${width}.png`});}
     await handles[i].focus();await page.keyboard.press('Enter');assert.equal(await page.$$eval('[data-product-disclosure]',(els,i)=>els[i].open,i),false,'keyboard closes');
    }
    if(p.id==='p39-10'){await page.$eval('[data-product-disclosure]',el=>el.scrollIntoView({block:'center',behavior:'instant'}));await screenshot({path:`${output}/${stage}-catalog-${width}.png`});}
    report.views.push({id:p.id,width,rows});
   }
  }
  for(const p of [products.find(p=>p.id==='curd'),samples[1]]){
   await go(p);await page.evaluate(()=>localStorage.removeItem('pirogorsk-selection'));await page.reload({waitUntil:'networkidle0'});
   const variants=p.variants;const last=variants.at(-1);
   await page.$eval('[data-product-options] label:last-of-type',el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.click('[data-product-options] label:last-of-type');
   const geometry=()=>page.$eval('[data-product-options]',el=>({height:el.offsetHeight,button:el.querySelector('[data-option-link]').getBoundingClientRect().top-el.getBoundingClientRect().top}));
   const baseline=await geometry();
   for(const n of [2,99,1]){
    await page.$eval('[data-option-quantity]',(el,n)=>{el.value=String(n);el.dispatchEvent(new Event('input',{bubbles:true}));},n);
    assert.equal(await page.$eval('[data-option-price]',el=>Number(el.textContent.replace(/\D/g,''))),last.price*n);assert.deepEqual(await geometry(),baseline);
   }
   await page.$eval('[data-option-increase]',el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.click('[data-option-increase]');
   await page.$eval('[data-option-link]',el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.click('[data-option-link]');
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pirogorsk-selection'))),[{id:p.id,value:last.value,quantity:2}]);
  }
  await page.setJavaScriptEnabled(false);await go(samples[0]);
  const rows=await page.$$('[data-product-disclosure] summary');assert(rows.length===2);
  for(const row of rows){await row.focus();await page.keyboard.press('Enter');}
  assert.equal(await page.$$eval('[data-product-disclosure]',els=>els.every(el=>el.open)),true,'both disclosures work without JS');await fits();
  assert.equal(await page.$eval('[data-option-link]',el=>new URL(el.href).searchParams.has('interest')),true);
  await page.setJavaScriptEnabled(true);
 }
 assert.deepEqual(report.errors,[]);await writeFile(`${output}/${stage}-report.json`,JSON.stringify(report,null,2)+'\n');console.log(`PASS: ${report.views.length} responsive product views; ${disclosures} serving disclosures; ${ingredients.length} full supplier facts; keyboard/no-JS and quantity/selection at four widths`);
}finally{await browser.close();await chrome.kill();}
