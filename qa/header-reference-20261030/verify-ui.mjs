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
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await mkdir(output,{recursive:true});
 for(const width of [320,390,768,1024,1280]){
  const context=await browser.createBrowserContext(),page=await context.newPage();
  await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:width<700,hasTouch:width<1000});
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
  for(const [name,route]of [['home','/'],['menu','/menu/'],['product','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/'],['delivery','/delivery/'],['blog','/blog/']]){
   await page.goto(`${origin}${route}?qa=1`,{waitUntil:'networkidle0'});
   await page.evaluate(()=>document.fonts.ready);
   const state=await page.evaluate(()=>{
    const header=document.querySelector('[data-site-header]'),brand=header.querySelector('.pirogorsk-brand').getBoundingClientRect();
    return {overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,brandOffset:Math.abs((brand.left+brand.right)/2-innerWidth/2),smallControls:[...header.querySelectorAll('button,a')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height<43).map(e=>e.textContent.trim()),height:header.getBoundingClientRect().height};
   });
   assert.equal(state.overflow,false,`${name}/${width} overflow`);assert.equal(state.h1,1);assert.ok(state.brandOffset<2,`${name}/${width} logo centre ${state.brandOffset}`);
   // Small status text is a secondary link; primary tools are >=44px.
   assert.deepEqual(state.smallControls.filter(s=>s!=='Готовим запуск'),[]);
   await page.screenshot({path:`${output}/${name}-${width}.jpg`,type:'jpeg',quality:85});
   await page.click('[data-menu-open]');
   assert.equal(await page.$eval('#site-menu-dialog',e=>e.open),true);
   assert.equal(await page.$eval('#site-menu-dialog',e=>e.contains(document.activeElement)),true);
   await page.keyboard.press('Escape'); await pause(60);
   assert.equal(await page.$eval('[data-menu-open]',e=>document.activeElement===e),true);
   const citySelector=width<=1000?'.masthead-city--mobile':'.masthead-city--desktop';
   await page.click(citySelector);
   await page.click('#city-dialog [data-select-city="Калининград"]'); await pause(60);
   assert.equal(await page.$eval('#city-dialog [data-select-city="Калининград"]',e=>e.getAttribute('aria-pressed')),'true');
   assert.equal(await page.$eval(citySelector,e=>document.activeElement===e),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('pirogorsk-city')),'Калининград');
   results.push({name,width,...state});
  }
  await page.goto(`${origin}/menu/?qa=1`,{waitUntil:'networkidle0'});
  await page.evaluate(()=>localStorage.removeItem('pirogorsk-selection'));
  assert.equal(await page.$$eval('.menu-feed [data-supplier-id][hidden]', cards=>cards.every(card=>getComputedStyle(card).display==='none')),true,'hidden batches must also be visually hidden');
  const first='#pirogi39 [data-supplier-id]:first-child';
  await page.$eval(first,e=>e.scrollIntoView({block:'start',behavior:'instant'}));await pause(300);
  await page.screenshot({path:`${output}/feed-${width}.jpg`,type:'jpeg',quality:85});
  await page.click(`${first} [data-supplier-link]`); await pause(100);
  assert.equal(new URL(page.url()).pathname,'/menu/');
  assert.equal(await page.$eval('.masthead [data-count]',e=>e.textContent),'1');
  assert.equal(await page.$eval('[data-feed-feedback]',e=>e.hidden),false);
  assert.equal(await page.$eval('[data-feed-feedback]',e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}),true,'selection feedback stays in the viewport');
  await page.screenshot({path:`${output}/added-${width}.jpg`,type:'jpeg',quality:85});
  await page.$eval('#holland [data-supplier-filter=dough]',e=>e.click());
  const card='#holland [data-supplier-id]:not([hidden])';
  await page.$eval(`${card} label:last-of-type input`,e=>e.click());
  const expected=await page.$eval(`${card} input:checked`,e=>Number(e.value));
  const id=await page.$eval(card,e=>e.dataset.supplierId);
  await page.$eval(`${card} [data-supplier-link]`,e=>e.click());
  assert.ok(await page.evaluate((id,value)=>JSON.parse(localStorage.getItem('pirogorsk-selection')).some(i=>i.id===id&&i.value===value),id,expected));
  await page.$eval('[data-feed-id=cranberry] label:last-of-type input',e=>e.click());
  await page.$eval('[data-feed-id=cranberry] [data-feed-add]',e=>e.click());
  assert.equal(await page.$eval('.masthead [data-count]',e=>e.textContent),'3');
  await page.$eval('[data-menu-reset]',e=>e.click());
  for(const root of ['pirogi39','holland']){
   let before=0;
   for(let i=0;i<5;i++){
    const count=await page.$$eval(`#${root} [data-supplier-id]:not([hidden])`,e=>e.length);
    if(count===await page.$$eval(`#${root} [data-supplier-id]`,e=>e.length))break;
    before=count;
    await page.$eval(`#${root} [data-supplier-more]`,e=>e.scrollIntoView({block:'center',behavior:'instant'}));
    await page.waitForFunction((root,before)=>document.querySelectorAll(`#${root} [data-supplier-id]:not([hidden])`).length>before,{},root,before);
   }
   assert.equal(await page.$$eval(`#${root} [data-supplier-id]:not([hidden])`,e=>e.length),await page.$$eval(`#${root} [data-supplier-id]`,e=>e.length));
  }
  await page.evaluate(()=>scrollTo(0,0));await page.click('[data-menu-open]');
  await page.screenshot({path:`${output}/drawer-${width}.jpg`,type:'jpeg',quality:85});
  await page.keyboard.press('Escape');await pause(60);
  await page.$eval('[data-header-selection]',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('[data-header-selection]')]);
  assert.equal(await page.$eval('#selection-dialog',e=>e.open),true);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pirogorsk-selection')).reduce((n,i)=>n+i.quantity,0)),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),production,results,errors,failed,feed:'PASS: automatic reveal, direct add, exact variants, cross-page selection'},null,2));
 console.log(`PASS: ${results.length} page/viewport checks; menu, city, focus, feed and selection flows on all widths`);
}finally{await browser.close();await chrome.kill()}
