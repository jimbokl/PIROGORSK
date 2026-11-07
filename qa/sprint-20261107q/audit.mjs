import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import {writeFile} from 'node:fs/promises';
const out='qa/sprint-20261107q',base='http://127.0.0.1:4330';
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const report={views:[],dialogs:[],errors:[]};
try{
 const page=await browser.newPage();
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.setRequestInterception(true);page.on('request',r=>{const u=new URL(r.url());if(r.method()!=='GET'||(['http:','https:'].includes(u.protocol)&&u.origin!==base))r.abort();else r.continue();});
 const go=path=>page.goto(base+path+'?qa=1',{waitUntil:'networkidle0'});
 for(const width of [320,390,768,1280]){
  await page.setViewport({width,height:900});
  for(const path of ['/','/menu/','/pirogi/rybnyy-pirog/','/delivery/','/zelenogradsk/','/blog/']){
   await go(path);await page.evaluate(()=>document.fonts.ready);
   const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,tinyFields:[...document.querySelectorAll('input[type=number],input[type=search],select')].filter(e=>e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden'&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.outerHTML.slice(0,110))}));
   report.views.push({width,path,...data});
  }
  await page.evaluate(()=>{const p=JSON.parse(document.querySelector('#catalog-data').textContent);const long=[...p].sort((a,b)=>b.name.length-a.name.length)[0],expensive=[...p].sort((a,b)=>Math.max(...b.variants.map(v=>v.price))-Math.max(...a.variants.map(v=>v.price)))[0];localStorage.setItem('pirogorsk-selection',JSON.stringify([{id:long.id,value:long.defaultVariant,quantity:99},{id:expensive.id,value:expensive.defaultVariant,quantity:99},{id:'meat',value:500,quantity:1}]));});
  await go('/menu/');await page.click('.masthead-selection');
  const d=await page.$eval('#selection-dialog',d=>({overflow:d.scrollWidth>d.clientWidth+1,rows:[...d.querySelectorAll('[data-item]')].map(r=>({id:r.dataset.item,title:r.querySelector('h3').textContent,quantity:r.querySelector('output').textContent,width:r.clientWidth,scrollWidth:r.scrollWidth,price:r.querySelector('[data-item-price]').textContent}))}));
  report.dialogs.push({width,...d});await page.screenshot({path:`${out}/before-selection-${width}.png`});
  await page.keyboard.press('Escape');await page.evaluate(()=>localStorage.removeItem('pirogorsk-selection'));
 }
 await writeFile(`${out}/audit-before.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{await browser.disconnect();await chrome.kill();}
