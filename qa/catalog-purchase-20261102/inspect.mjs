import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { catalog } from '../../src/data/catalog.ts';
import { verifyMenuQuantity } from '../../worker/scripts/qa-menu-quantity.mjs';

const output='qa/catalog-purchase-20261102';
const stage=process.env.QA_STAGE||'local';
const origin='https://pirogorsk.ru';
const cache=new Map();
const report={stage,views:[],errors:[]};
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
await mkdir(output,{recursive:true});
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
  for(const width of [320,390,768,1024,1280,1440]){
    const context=await browser.createBrowserContext();
    const page=await context.newPage();
    await page.setViewport({width,height:1050});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    page.on('pageerror',e=>report.errors.push(e.message));
    await page.setRequestInterception(true);
    page.on('request',async request=>{
      if(request.url().startsWith('data:'))return request.continue();
      if(!request.url().startsWith(origin+'/')||request.method()!=='GET')return request.abort();
      const path=new URL(request.url()).pathname;
      try{
        if(!cache.has(path)){
          if(process.env.QA_BASE){
            const response=await fetch(process.env.QA_BASE+path);
            assert(response.ok,`${response.status} ${path}`);
            cache.set(path,{status:200,contentType:response.headers.get('content-type')||'',body:Buffer.from(await response.arrayBuffer())});
          }else cache.set(path,{status:200,contentType:types[extname(path)]||'text/html',body:await readFile(resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':'')))});
        }
        await request.respond(cache.get(path));
      }catch(e){report.errors.push(e.message);await request.abort();}
    });
    for(const surface of ['home','menu']){
      await page.goto(origin+(surface==='home'?'/':'/menu/')+'?qa=1#nabory',{waitUntil:'networkidle0'});
      await page.evaluate(()=>document.fonts.ready);
      const mini=catalog.find(p=>p.category==='mini-pies'&&p.variants.length===3).id;
      for(const id of ['meat','p39-497',mini,'tableware']){
        const selector=surface==='home'?`[data-home-catalog] [data-product="${id}"]`:`.menu-feed [data-feed-id="${id}"],.menu-feed [data-supplier-id="${id}"]`;
        const card=await page.$(selector);
        await card.evaluate(async el=>{
          el.scrollIntoView({block:'center',behavior:'instant'});
          await Promise.all([...el.querySelectorAll('img')].map(img=>{img.loading='eager';return img.decode().catch(()=>{});}));
        });
        const metrics=await card.evaluate(el=>{
          const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
          const panel=el.querySelector('.catalog-purchase');
          const controls=el.querySelector('[data-feed-quantity-control]');
          const button=el.querySelector('[data-add],[data-feed-add],[data-supplier-link]');
          return {card:box(el),panel:panel&&box(panel),quantity:box(controls),price:box(el.querySelector('[data-price],[data-feed-price-label],[data-supplier-price]')),button:box(button),overflow:el.scrollWidth>el.clientWidth+1,weightPriceHidden:getComputedStyle(el.querySelector('.variant-summary small')).display==='none',formats:el.querySelectorAll('fieldset label').length};
        });
        if(stage!=='before'){
          assert(metrics.panel,`${surface} ${id}: common purchase panel`);
          assert(!metrics.overflow,`${surface} ${id} ${width}: fits`);
          assert.equal(metrics.weightPriceHidden,metrics.formats===1,'Single-format price appears once visually');
          assert(metrics.quantity.h>=44&&metrics.button.h>=44,'Touch targets');
          if(metrics.panel.w>=330)assert(Math.abs(metrics.quantity.y-metrics.price.y)<=8,'Wide panel: total and quantity share a row');
          else assert(metrics.quantity.y>metrics.price.y,'Narrow panel: total precedes quantity');
        }
        report.views.push({surface,id,width,...metrics});
        if([390,768,1440].includes(width))await card.screenshot({path:`${output}/${stage}-${surface}-${id}-${width}.png`});
        if(id==='p39-497'&&[390,1440].includes(width))await page.screenshot({path:`${output}/${stage}-${surface}-context-${width}.png`});
      }
    }
    if(stage!=='before')await verifyMenuQuantity(page,origin,width,`${output}/${stage}-quantity`);
    await context.close();
  }
  assert.deepEqual(report.errors,[]);
  console.log(`PASS: ${report.views.length} card states; ${stage==='before'?'baseline':'all three menu quantity renderers at six widths'}`);
}finally{
  await writeFile(`${output}/${stage}-visual.json`,JSON.stringify(report,null,2)+'\n');
  await browser.close();await chrome.kill();
}
