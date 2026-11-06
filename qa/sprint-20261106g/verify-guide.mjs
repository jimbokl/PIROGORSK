import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const out='qa/sprint-20261106g';
const origin='https://pirogorsk.ru';
const path='/journal/gde-poest-v-kaliningrade/';
const stage=process.env.QA_BASE?'production':'local';
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions','--no-first-run']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const report={stage,path,checked:new Date().toISOString(),views:[],errors:[]};
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
try {
 const page=await browser.newPage();
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.setRequestInterception(true);
 page.on('request',async request=>{
  const url=new URL(request.url());
  if(url.protocol==='data:')return request.continue();
  if(url.origin!==origin||request.method()!=='GET')return request.abort();
  if(process.env.QA_BASE)return request.continue();
  try {
   const file=resolve('site','.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
   await request.respond({status:200,contentType:types[extname(file)]||'application/octet-stream',body:await fs.readFile(file)});
  }catch(error){report.errors.push(error.message);await request.abort();}
 });
 const response=await page.goto(origin+path,{waitUntil:'networkidle0'});
 assert.equal(response.status(),200);
 await page.evaluate(async()=>{await document.fonts.ready;for(const img of document.querySelectorAll('.blog-article img'))img.loading='eager';await Promise.all([...document.querySelectorAll('.blog-article img')].map(img=>img.decode()));});
 const data=await page.evaluate(()=>({
  canonical:document.querySelector('link[rel="canonical"]').href,
  h1:document.querySelectorAll('h1').length,
  sources:document.querySelectorAll('#sources ol a').length,
  sections:[...document.querySelectorAll('.ed-article-section')].map(el=>el.textContent.replace(/\s+/gu,' ').trim()),
  toc:[...document.querySelectorAll('.article-contents a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href'),valid:Boolean(document.getElementById(a.hash.slice(1)))})),
  text:document.querySelector('.ed-article').textContent,
  structured:[...document.querySelectorAll('script[type="application/ld+json"]')].map(el=>el.textContent).join(''),
  tables:[...document.querySelectorAll('.ed-article table')].map(el=>({caption:el.caption?.textContent,rows:[...el.rows].map(row=>[...row.cells].map(cell=>cell.textContent.trim()))})),
 }));
 assert.equal(data.canonical,origin+path);assert.equal(data.h1,1);assert.equal(data.sources,8);
 assert(data.structured.includes('"datePublished":"2026-10-24"'));assert(data.structured.includes('"dateModified":"2026-11-07"'));
 assert(data.toc.every(a=>a.valid));
 const fish=data.tables.find(t=>t.caption.includes('Хофбург'));
 assert(fish);assert(fish.rows.some(row=>row.join(' ').includes('За 100 г')&&row.join(' ').includes('490 ₽')));
 for(const price of ['910 ₽','810 ₽','740 ₽'])assert(fish.rows.some(row=>row.join(' ').includes(price)));
 const views=data.tables.find(t=>t.rows.some(row=>row.join(' ').includes('Мадам Буше')));assert(views);assert.equal(views.rows.length,4);
 assert(data.text.includes('1 650 ₽'));assert(data.text.includes('1 960 ₽'));
 report.content={canonical:data.canonical,sources:data.sources,sections:data.sections.length,toc:data.toc,fishTable:fish,viewTable:views,published:'2026-10-24',modified:'2026-11-07'};
 if(process.argv.includes('--refresh-baseline')){
  assert.equal(stage,'local');
  const file='qa/journal-polish-20261101/baseline-sections.json';
  const baseline=JSON.parse(await fs.readFile(file,'utf8'));
  assert(Array.isArray(baseline['gde-poest-v-kaliningrade']));
  baseline['gde-poest-v-kaliningrade']=data.sections;
  await fs.writeFile(file,JSON.stringify(baseline,null,2)+'\n');
 }
 for(const width of [320,390,768,1024,1280]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});
  await page.evaluate(()=>scrollTo(0,0));
  const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,bodyFont:parseFloat(getComputedStyle(document.querySelector('.ed-article-section p')).fontSize),tocTargets:[...document.querySelectorAll('.article-contents a')].every(a=>a.getBoundingClientRect().height>=44)}));
  assert(!metrics.overflow,`Document overflow at ${width}`);assert(metrics.bodyFont>=16);assert(metrics.tocTargets);
  const compactTables=await page.$$eval('.ed-reading-table-compact',tables=>tables.map(table=>({width:table.getBoundingClientRect().width,container:table.parentElement.clientWidth})));
  assert(compactTables.length>=2);assert(compactTables.every(t=>t.width<=t.container+1),`Compact tables fit at ${width}`);
  if([390,768].includes(width))await page.screenshot({path:`${out}/${stage}-guide-top-${width}.png`});
  for(const [label,title] of [['fish','Рыбный обед'],['view','Где поесть с видом']]){
   const anchor=data.toc.find(a=>a.text.startsWith(title));assert(anchor);
   await page.click(`.article-contents a[href="${anchor.href}"]`);
   await page.waitForFunction(href=>location.hash===href,{},anchor.href);
   const top=await page.$eval(anchor.href,el=>el.getBoundingClientRect().top);
   assert(top>=0&&top<900,`TOC target visible ${width} ${label}: ${top}`);
   if([390,768].includes(width)){
    await page.screenshot({path:`${out}/${stage}-guide-${label}-${width}.png`});
    await page.$eval(anchor.href,el=>el.closest('.ed-article-section').querySelector('table').scrollIntoView({block:'center'}));
    await page.screenshot({path:`${out}/${stage}-guide-${label}-table-${width}.png`});
   }
  }
  report.views.push({width,...metrics,tocNavigation:true});
 }
 assert.deepEqual(report.errors,[]);
 await fs.writeFile(`${out}/${stage}-guide.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`Guide ${stage} PASS: 8 sources, original/modified dates, fish price units, views, TOC, 5 widths.`);
}finally{await browser.disconnect();await chrome.kill();}
