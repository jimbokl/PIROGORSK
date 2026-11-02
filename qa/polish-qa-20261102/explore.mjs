import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const dir='qa/polish-qa-20261102', origin='https://pirogorsk.ru';
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions','--disable-features=OverlayScrollbar']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const page=await browser.newPage();const cache=new Map(),report=[];
await page.evaluateOnNewDocument(()=>{delete window.IntersectionObserver;});
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.setRequestInterception(true);
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
page.on('request',async r=>{if(r.url().startsWith('data:'))return r.continue();if(!r.url().startsWith(origin+'/')||r.method()!=='GET')return r.abort();try{const path=new URL(r.url()).pathname;if(!cache.has(path))cache.set(path,await readFile(resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':''))));await r.respond({status:200,contentType:types[extname(path)]||'text/html',body:cache.get(path)});}catch{await r.abort();}});
const metrics=()=>page.evaluate(()=>{const f=document.querySelector('[data-home-finder],[data-menu-finder]'),r=f.getBoundingClientRect(),m=f.querySelector('.home-search-meta,.menu-search-meta').getBoundingClientRect(),a=document.activeElement;return{height:r.height,metaHeight:m.height,active:a?.tagName,activeCategory:[...document.querySelectorAll('[data-home-category][aria-current],[data-menu-jump][aria-current]')].map(e=>({id:e.dataset.homeCategory||e.dataset.menuJump,hidden:e.hidden})),visibleCount:document.querySelectorAll('[data-product]:not([hidden]),[data-menu-product]:not([hidden]),[data-supplier-id]:not([hidden])').length};});
try{
 for(const width of [320,390,768,1280])for(const path of ['/','/menu/']){
  await page.setViewport({width,height:900});await page.goto(origin+path+'?qa=1',{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
  const before=await metrics();await page.$eval('[data-catalog-query]',e=>{e.value='морс';e.focus();e.dispatchEvent(new Event('input',{bubbles:true}));});await new Promise(r=>setTimeout(r,80));
  const filtered=await metrics();await page.screenshot({path:`${dir}/before-search-${path==='/'?'home':'menu'}-${width}.png`});
  await page.$eval('[data-home-finder],[data-menu-finder]',f=>f.requestSubmit());await new Promise(r=>setTimeout(r,80));const submitted=await metrics();
  await page.$eval('[data-catalog-reset]',b=>b.click());const cleared=await metrics();report.push({path,width,before,filtered,submitted,cleared});
 }
 await page.setViewport({width:390,height:900});await page.goto(origin+'/menu/?qa=1',{waitUntil:'networkidle0'});
 const more='[data-supplier-catalog] [data-supplier-more]:not([hidden])';
 await page.$eval(more,e=>e.focus());await page.keyboard.press('Enter');
 await page.$eval(more,e=>e.focus());await page.keyboard.press('Enter');await new Promise(r=>setTimeout(r,80));
 report.push({case:'supplier-more-keyboard-final',focus:await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent.trim().slice(0,100),hidden:document.activeElement.hidden}))});
 await writeFile(`${dir}/before-dynamic.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await chrome.kill();}
