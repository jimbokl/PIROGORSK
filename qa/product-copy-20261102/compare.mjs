import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const output='qa/product-copy-20261102';
const stage=process.env.QA_STAGE||'before';
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const page=await browser.newPage();
await page.setRequestInterception(true);
page.on('request',req=>req.method()==='GET'&&(req.url().startsWith('https://pirogorsk.ru/')||req.url().startsWith('data:'))?req.continue():req.abort());
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
try{
 const rows=[];
 for(const width of [390,768,1280]){
  await page.setViewport({width,height:1000});
  await page.goto('https://pirogorsk.ru/pirogi/pirog-s-tvorogom-i-malinoy/?qa=1',{waitUntil:'networkidle0'});
  await page.evaluate(()=>document.fonts.ready);
  const row=await page.evaluate(()=>{const el=document.querySelector('[data-product-notes]')||document.querySelector('.ed-article');return{height:el.getBoundingClientRect().height,words:el.innerText.trim().split(/\s+/).length};});
  rows.push({width,...row});
 }
 const result={stage,rows};
 if(stage==='production'){const before=JSON.parse(await readFile(`${output}/before-density.json`,'utf8'));result.comparison=rows.map((row,i)=>{assert(row.words<before.rows[i].words);assert(row.height<before.rows[i].height);return{width:row.width,wordsBefore:before.rows[i].words,wordsAfter:row.words,heightBefore:before.rows[i].height,heightAfter:row.height};});}
 await writeFile(`${output}/${stage}-density.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();await chrome.kill();}
