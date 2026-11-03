import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import {catalog} from '../src/data/catalog.ts';
import {hasPortionPrice,portionPriceLabel} from '../src/lib/product-portions.ts';
import {catalogProductHref} from '../src/lib/product-paths.ts';
import {verifyCatalogFormats} from '../worker/scripts/qa-catalog-formats.mjs';
const stage=process.env.QA_BASE?'production':'local';
const output=process.env.QA_OUTPUT||'qa/catalog-polish-20261101';
await mkdir(output,{recursive:true});
const origin='https://pirogorsk.ru';
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.woff2':'font/woff2','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.json':'application/json'};
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const report={stage,widths:[],errors:[],networkRetries:[]};
// Immutable Astro assets need only one production read per run. Share in-flight
// requests too, so lazy pictures do not fan out identical CDN downloads.
const productionAssets=new Map();
async function fetchProduction(path){
 const read=async()=>{
  for(let attempt=1;attempt<=3;attempt++){
   try{
    const response=await fetch(process.env.QA_BASE+path,{signal:AbortSignal.timeout(20000)});
    return {status:response.status,contentType:response.headers.get('content-type')||'',body:Buffer.from(await response.arrayBuffer())};
   }catch(error){
    if(attempt===3)throw error;
    report.networkRetries.push({path,attempt,error:error.message,cause:error.cause?.code||error.cause?.message});
   }
  }
 };
 if(!path.startsWith('/_astro/'))return read();
 if(!productionAssets.has(path))productionAssets.set(path,read().catch(error=>{productionAssets.delete(path);throw error;}));
 return productionAssets.get(path);
}
try{
 for(const width of [320,390,768,1024,1280,1440]){
  const context=await browser.createBrowserContext();const page=await context.newPage();
  await page.setViewport({width,height:1000});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request',async req=>{
   if(req.url().startsWith('data:'))return req.continue();
   if(!req.url().startsWith(origin+'/')||req.method()!=='GET')return req.abort();
   try{
    const path=new URL(req.url()).pathname;
    if(process.env.QA_BASE){const r=await fetchProduction(path);if(r.status<200||r.status>=300)report.errors.push(`${r.status} ${path}`);await req.respond(r);}
    else await req.respond({status:200,contentType:types[path.endsWith('/')?'.html':extname(path)]||'application/octet-stream',body:await readFile(resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':'')))});
   }catch(e){report.errors.push(`${new URL(req.url()).pathname}: ${e.message}`);await req.abort();}
  });
  const row={width,surfaces:[]};
  for(const surface of ['home','menu']){
   await page.goto(origin+(surface==='home'?'/':'/menu/')+'?qa=1#nabory',{waitUntil:'networkidle0'});
   await page.evaluate(()=>document.fonts.ready);
   if(surface==='menu')for(const group of ['pirogi39','holland']){
    const more=`#${group} [data-supplier-more]`;
    while(await page.$eval(more,button=>!button.hidden))await page.$eval(more,button=>button.click());
   }
   const selector=surface==='home'?'[data-home-catalog] [data-product]':'.menu-feed [data-feed-id],.menu-feed [data-supplier-id]';
   const data=await page.evaluate(({selector,products})=>{
    const cards=[...document.querySelectorAll(selector)];
    const errors=[];let checked=0;
    const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const snapshot=card=>({card:box(card),purchase:box(card.querySelector('.catalog-purchase')),button:box(card.querySelector('[data-add],[data-feed-add],[data-supplier-link]'))});
    for(const card of cards){
     if(!card.getBoundingClientRect().height)continue;
     const input=card.querySelector('[data-feed-quantity]');
     const id=card.dataset.product||card.dataset.feedId||card.dataset.supplierId;
     const product=products.find(p=>p.id===id);
     const estimate=card.querySelector('[data-portion-price]');
     if(Boolean(estimate)!==product.eligible)errors.push({id,portionPricePresence:true});
     const checkEstimate=()=>{
      if(!estimate)return;
      const selected=Number(card.querySelector('input[type="radio"]:checked').value);
      if(estimate.textContent!==product.labels[selected])errors.push({id,selected,portionPrice:estimate.textContent,expected:product.labels[selected]});
     };
     const set=q=>{input.value=String(q);input.dispatchEvent(new Event('input',{bubbles:true}));};
     set(1);const before=snapshot(card);
     for(const q of [2,99,1]){
      set(q);const after=snapshot(card);
      checkEstimate();
      for(const key of ['card','purchase','button'])for(const prop of ['y','width','height'])if(Math.abs(after[key][prop]-before[key][prop])>1)errors.push({id,q,key,prop,before:before[key][prop],after:after[key][prop]});
      const price=card.querySelector('[data-price],[data-feed-price-label],[data-supplier-price]').getBoundingClientRect();
      const button=card.querySelector('[data-add],[data-feed-add],[data-supplier-link]').getBoundingClientRect();
      if(price.right>button.left-3&&price.bottom>button.top&&price.top<button.bottom)errors.push({id,q,overlap:true,priceRight:price.right,buttonLeft:button.left});
      if(card.scrollWidth>card.clientWidth+1)errors.push({id,q,overflow:true});
     }
     for(const radio of card.querySelectorAll('input[type="radio"]')){
      radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));checkEstimate();
     }
     const initial=card.querySelector(`input[type="radio"][value="${product.defaultVariant}"]`);
     initial.checked=true;initial.dispatchEvent(new Event('change',{bubbles:true}));
     checked++;
    }
    return {ids:cards.map(c=>c.dataset.product||c.dataset.feedId||c.dataset.supplierId),checked,errors,overflow:document.documentElement.scrollWidth>innerWidth+1};
   },{selector,products:catalog.map(product=>({id:product.id,defaultVariant:product.defaultVariant,eligible:hasPortionPrice(product),labels:Object.fromEntries(product.variants.map(v=>[v.value,portionPriceLabel(v.price,v.value,product.supplier?.priceFrom)]))}))});
   assert.deepEqual(data.ids.slice().sort(),catalog.map(p=>p.id).sort(),`${surface}: 154 SKU`);
   assert.equal(data.checked,catalog.length,`${surface}: measure every loaded SKU`);
   row.surfaces.push({surface,...data});
   // Save failure details before asserting so geometry regressions remain inspectable.
   await writeFile(`${output}/${stage}-progress.json`,JSON.stringify({...report,current:row},null,2)+'\n');
   assert.deepEqual(data.errors,[],`${surface} quantity geometry at ${width}px`);
   assert.equal(data.overflow,false,`${surface} overflow ${width}`);
   if([390,768,1440].includes(width)){
    await page.$eval('.scenario-entries',el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    await page.screenshot({path:`${output}/${stage}-${surface}-links-${width}.png`});
    const first=await page.$(selector);await first.evaluate(el=>{el.scrollIntoView({block:'start',behavior:'instant'});window.scrollBy({top:-140,behavior:'instant'});});
    await page.screenshot({path:`${output}/${stage}-${surface}-cards-${width}.png`});
    await page.$eval('#nabory',el=>{el.scrollIntoView({block:'start',behavior:'instant'});window.scrollBy({top:-90,behavior:'instant'});});
    await page.evaluate(()=>Promise.all([...document.querySelectorAll('#nabory img')].map(img=>{img.loading='eager';return img.decode();})));
    await page.screenshot({path:`${output}/${stage}-${surface}-bundles-${width}.png`});
   }
   const links=await page.$$eval('.scenario-entries a',els=>els.map(a=>({href:a.getAttribute('href'),measured:a.hasAttribute('data-guide-catalog'),height:a.getBoundingClientRect().height})));
   assert.equal(links.length,3);assert(links.every(a=>a.measured&&a.height>=44));
   const ingredients=await page.$$eval('.offer-body li a',els=>els.map(a=>({href:a.getAttribute('href'),height:a.getBoundingClientRect().height,overflow:a.scrollWidth>a.clientWidth+1})));
   assert.deepEqual(ingredients.filter(a=>!a.href.startsWith('/')||a.height<44||a.overflow),[],`Bundle links ${surface} ${width}`);
   const estimates=await page.$$eval('.offer-card [data-portion-price]',els=>els.map(el=>el.textContent));
   assert.deepEqual(estimates,['≈ 320 ₽ за порцию 250 г','≈ 289 ₽ за порцию 250 г','≈ 557 ₽ за порцию 250 г','≈ 557 ₽ за порцию 250 г','≈ 583 ₽ за порцию 250 г']);
  }
  for(const id of ['meat','p39-10',catalog.find(p=>p.category==='mini-pies').id]){
   const product=catalog.find(p=>p.id===id);
   await page.goto(origin+catalogProductHref(product)+'?qa=1',{waitUntil:'networkidle0'});
   assert.equal(await page.$eval('html',el=>el.scrollWidth<=innerWidth+1),true,`Product overflow ${width} ${id}`);
   const expected=hasPortionPrice(product);
   assert.equal(await page.$$eval('[data-product-options] [data-portion-price]',els=>els.length),expected?1:0);
   for(const variant of product.variants){
    await page.$eval(`[data-product-options] input[type="radio"][value="${variant.value}"]`,el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
    for(const quantity of [1,2,99]){
     await page.$eval('[data-option-quantity]',(el,q)=>{el.value=String(q);el.dispatchEvent(new Event('input',{bubbles:true}));},quantity);
     if(expected)assert.equal(await page.$eval('[data-product-options] [data-portion-price]',el=>el.textContent),portionPriceLabel(variant.price,variant.value,product.supplier?.priceFrom));
     const total=await page.$eval('[data-option-price]',el=>Number(el.textContent.replace(/[^0-9]/g,'')));
     assert.equal(total,variant.price*quantity);
    }
   }
   if(id==='meat'&&[390,768].includes(width)){
    await page.$eval('[data-option-quantity]',el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.$eval('[data-product-options]',el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    await page.screenshot({path:`${output}/${stage}-portion-product-${width}.png`});
   }
  }
  if([390,768,1280].includes(width))await verifyCatalogFormats(page,origin,width,`${output}/${stage}-formats`);
  report.widths.push(row);await context.close();
 }
 assert.deepEqual(report.errors,[]);
 await writeFile(`${output}/${stage}-report.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`Catalog polish PASS (${stage}): 154 SKU on home/menu; 1→2→99→1 geometry on six widths; portion prices across variants/quantities on cards, bundles and product pages; links, format/price/add synchronization.`);
}finally{await browser.disconnect();await chrome.kill();}
