import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const output='qa/polish-sprint-20261101';
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const page=await browser.newPage();
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.setRequestInterception(true);
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',async r=>{if(r.url().startsWith('data:'))return r.continue();if(!r.url().startsWith('https://pirogorsk.ru/')||r.method()!=='GET')return r.abort();const p=new URL(r.url()).pathname;try{await r.respond({status:200,contentType:types[extname(p)]||'text/html',body:await readFile(resolve('site','.'+decodeURIComponent(p)+(p.endsWith('/')?'index.html':'')))});}catch(e){errors.push(p+': '+e.code);await r.abort();}});
const result=[];
try {
for (const width of [320,390,768,1280]) {
await page.setViewport({width,height:740});
await page.goto('https://pirogorsk.ru/?qa=1',{waitUntil:'networkidle0'});
await page.evaluate(()=>{const products=JSON.parse(document.querySelector('#catalog-data').textContent);localStorage.setItem('pirogorsk-selection',JSON.stringify(products.slice(0,8).map(p=>({id:p.id,value:p.defaultVariant,quantity:1}))));});
await page.reload({waitUntil:'networkidle0'});
await page.locator('.masthead [data-open="selection-dialog"]').click();
await page.$eval('#selection-dialog',e=>e.scrollTop=e.scrollHeight);
await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
const visibility=await page.$eval('#selection-dialog',e=>{const r=e.getBoundingClientRect();const b=e.querySelector('[data-close]').getBoundingClientRect();return {dialogTop:r.top,dialogBottom:r.bottom,closeTop:b.top,closeBottom:b.bottom,closeVisible:b.top>=r.top&&b.bottom<=r.bottom,scrollTop:e.scrollTop,scrollHeight:e.scrollHeight};});
result.push({width,...visibility});
await page.screenshot({path:output+'/before-selection-bottom-'+width+'.png'});
await page.keyboard.press('Escape');
}
await writeFile(output+'/dialogs-before.json',JSON.stringify({result,errors},null,2)+'\n');
console.log(JSON.stringify({result,errors},null,2));
}finally{await browser.disconnect();chrome.kill();}
