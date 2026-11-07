import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const output='qa/content-daily-20261107',path='/journal/kopchenie-na-sosnovyh-shishkah/';
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{
 const p=new URL(req.url,'http://localhost').pathname;
 const file=resolve('site','.'+p+(p.endsWith('/')?'index.html':''));
 if(!file.startsWith(resolve('site')+'/'))throw Error('path');
 res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
}catch{res.writeHead(404);res.end();}});
let chrome,browser;
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=process.env.QA_BASE||`http://127.0.0.1:${server.address().port}`,stage=process.env.QA_BASE?'production':'local';
const report={base,stage,viewports:[]};
try{
 chrome=await launch({chromeFlags:['--headless=new','--disable-extensions','--no-first-run']});
 browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
 const page=await browser.newPage();
 await page.setRequestInterception(true);
 page.on('request',req=>new URL(req.url()).origin===new URL(base).origin?req.continue():req.abort());
 const response=await page.goto(base+path,{waitUntil:'networkidle0'});assert.equal(response.status(),200);
 await page.evaluate(()=>Promise.all([...document.querySelectorAll('.blog-article img')].map(img=>{img.loading='eager';return img.decode();})));
 for(const width of [320,390,768,1280]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});
  const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,date:document.querySelector('.blog-article').textContent.includes('Опубликовано 7 ноября 2026'),tables:[...document.querySelectorAll('.ed-table-scroll')].map(el=>({label:el.getAttribute('aria-label'),width:el.clientWidth,scrollWidth:el.scrollWidth,tabIndex:el.tabIndex,text:el.textContent}))}));
  assert.equal(data.overflow,false);assert.equal(data.date,true);assert.equal(data.tables.length,2);
  for(const [i,table] of data.tables.entries()){
   assert.equal(table.tabIndex,0);
   const element=(await page.$$('.ed-table-scroll'))[i];
   await element.evaluate(el=>el.scrollIntoView({block:'center'}));
   await element.focus();
   await page.keyboard.press('ArrowRight');
   await page.waitForFunction((index)=>{const el=document.querySelectorAll('.ed-table-scroll')[index];return el.scrollWidth<=el.clientWidth||el.scrollLeft>0;},{timeout:3000},i);
   table.keyboardScroll=await element.evaluate(el=>el.scrollWidth<=el.clientWidth||el.scrollLeft>0);
   if([390,768].includes(width))await page.screenshot({path:`${output}/${stage}-detail-table${i+1}-${width}.png`});
  }
  assert.ok(data.tables[1].text.includes('Полоцкая, 45Б')&&data.tables[1].text.includes('Заливная, 2А'));
  if(width===390){
   await page.$eval('.ed-hero-art',el=>el.scrollIntoView({block:'center'}));
   await page.screenshot({path:`${output}/${stage}-detail-cover-390.png`});
   await page.$$eval('.ed-body-figure',els=>els[1].scrollIntoView({block:'center'}));
   await page.screenshot({path:`${output}/${stage}-detail-diagram2-390.png`});
  }
  report.viewports.push({width,...data});
 }
 await writeFile(`${output}/${stage}-detail.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`Detail PASS (${stage}): four widths, two tables, keyboard scroll and visible date.`);
}finally{await browser?.disconnect();await chrome?.kill();await new Promise(done=>server.close(done));}
