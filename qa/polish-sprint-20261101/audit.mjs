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
try{
for(const width of [320,390,768,1280]){
await page.setViewport({width,height:1000});
for(const [id,path] of [['home','/'],['menu','/menu/'],['delivery','/delivery/'],['product','/pirogi/myasnoy-pirog/'],['bundles','/nabory/'],['blog','/blog/'],['article','/journal/skolko-piroga-na-cheloveka/']]){
await page.goto('https://pirogorsk.ru'+path+'?qa=1',{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
const audit=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,smallInputs:[...document.querySelectorAll('input:not([type=hidden]),textarea,select')].filter(e=>e.getBoundingClientRect().width>0&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>({tag:e.tagName,type:e.type,placeholder:e.placeholder,name:e.name,font:getComputedStyle(e).fontSize,selector:e.outerHTML.slice(0,200)})),overflows:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right>innerWidth+2&&getComputedStyle(e).position!=='absolute'&&!e.closest('[class*=track],[class*=rail],[class*=tabs],table');}).slice(0,8).map(e=>({tag:e.tagName,cls:e.className}))}));
result.push({id,width,...audit});
if(width===390||width===768)await page.screenshot({path:output+'/before-'+id+'-'+width+'.png'});
}
}
await writeFile(output+'/audit-before.json',JSON.stringify({result,errors},null,2)+'\n');
console.log(JSON.stringify({views:result.length,errors,overflow:result.filter(r=>r.overflow),smallInputs:result.filter(r=>r.smallInputs.length).map(({id,width,smallInputs})=>({id,width,smallInputs}))},null,2));
}finally{await browser.disconnect();chrome.kill();}
