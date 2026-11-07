import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const output='qa/sprint-20261107c';
const origin='https://pirogorsk.ru';
const path='/journal/gde-poest-v-zelenogradske/';
const stage=process.env.QA_BASE?'production':'local';
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions','--no-first-run']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const report={stage,path,checked:new Date().toISOString(),views:[],errors:[]};
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
try{
 const page=await browser.newPage();
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.setRequestInterception(true);
 page.on('request',async request=>{
  const url=new URL(request.url());
  if(url.protocol==='data:')return request.continue();
  if(url.origin!==origin||request.method()!=='GET')return request.abort();
  if(process.env.QA_BASE)return request.continue();
  try{
   const file=resolve('site','.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
   await request.respond({status:200,contentType:types[extname(file)]||'application/octet-stream',body:await fs.readFile(file)});
  }catch(error){report.errors.push(error.message);await request.abort();}
 });
 const response=await page.goto(origin+path,{waitUntil:'networkidle0'});
 assert.equal(response.status(),200);
 await page.evaluate(async()=>{await document.fonts.ready;for(const img of document.querySelectorAll('.blog-article img'))img.loading='eager';await Promise.all([...document.querySelectorAll('.blog-article img')].map(img=>img.decode()));});
 const content=await page.evaluate(()=>({
  canonical:document.querySelector('link[rel="canonical"]').href,
  headings:document.querySelectorAll('h1').length,
  sections:[...document.querySelectorAll('.ed-article-section')].map(el=>el.textContent.replace(/\s+/gu,' ').trim()),
  dates:[...document.querySelectorAll('.venue-menu time')].map(el=>el.dateTime),
  toc:[...document.querySelectorAll('.article-contents a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href'),valid:Boolean(document.getElementById(a.hash.slice(1)))})),
  text:document.querySelector('.blog-article').textContent,
  structured:[...document.querySelectorAll('script[type="application/ld+json"]')].map(el=>el.textContent).join(''),
  venues:document.querySelectorAll('.venue').length,
  tables:[...document.querySelectorAll('.venue-menu table,.ed-article table')].map(el=>({caption:el.caption?.textContent,rows:[...el.rows].map(row=>[...row.cells].map(cell=>cell.textContent.trim()))})),
  menuLink:document.querySelector('#horizont .menu-source a').href,
 }));
 assert.equal(content.canonical,origin+path);assert.equal(content.headings,1);
 assert.equal(content.venues,4);assert.equal(content.sections.length,6);assert.equal(content.tables.length,5);
 assert(content.structured.includes('"datePublished":"2026-10-24"'));
 assert(content.structured.includes('"dateModified":"2026-11-07"'));
 assert.deepEqual(content.dates,['2026-10-24','2026-11-07','2026-11-07']);
 assert.equal(content.menuLink,'https://cafehorizont.ru/#menu');
 assert(content.toc.every(a=>a.valid));assert.equal(content.toc.length,11);
 for(const token of ['2 700 ₽','4 900 ₽','анчоус','Курортный проспект, 28б'])assert(content.text.includes(token),token);
 const budget=content.tables.find(t=>t.rows.length===8);assert(budget);
 assert(budget.rows.slice(1).every(row=>Number(row[1].replace(/\D/g,''))<=700));
 report.content={canonical:content.canonical,venues:content.venues,sections:content.sections.length,dates:content.dates,toc:content.toc,tables:content.tables};
 if(process.argv.includes('--refresh-baseline')){
  assert.equal(stage,'local');
  const file='qa/journal-polish-20261101/baseline-sections.json';
  const baseline=JSON.parse(await fs.readFile(file,'utf8'));
  const old=baseline['gde-poest-v-zelenogradske'];
  assert([2,5,6].includes(old.length));
  old.slice(0,2).forEach((text,i)=>assert(content.sections[i].replace(/\s/gu,'').startsWith(text.replace(/\s/gu,'')),`Original section ${i} retained`));
  baseline['gde-poest-v-zelenogradske']=[...old.slice(0,2),...content.sections.slice(2)];
  await fs.writeFile(file,JSON.stringify(baseline,null,2)+'\n');
 }
 for(const width of [320,390,768,1024,1280]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});
  await page.evaluate(()=>scrollTo(0,0));
  const metrics=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth>innerWidth+1,
   bodyFont:parseFloat(getComputedStyle(document.querySelector('.ed-article-section p')).fontSize),
   cardFont:parseFloat(getComputedStyle(document.querySelector('.choice-card p')).fontSize),
   cardColumns:getComputedStyle(document.querySelector('.choice-grid')).gridTemplateColumns.split(' ').length,
   cards:[...document.querySelectorAll('.choice-card')].map(a=>({height:a.getBoundingClientRect().height,contentFits:a.scrollWidth<=a.clientWidth,actionHeight:a.querySelector('.choice-action').getBoundingClientRect().height})),
   tocTargets:[...document.querySelectorAll('.article-contents a')].every(a=>a.getBoundingClientRect().height>=44),
   tableCells:[...document.querySelectorAll('.venue-menu td,.ed-article td')].every(td=>td.scrollWidth<=td.clientWidth+1),
  }));
  assert(!metrics.overflow,`Document overflow ${width}`);assert(metrics.bodyFont>=16);assert(metrics.cardFont>=15);
  assert.equal(metrics.cardColumns,width<=600?1:2);assert(metrics.cards.every(c=>c.contentFits&&c.actionHeight>=44));assert(metrics.tableCells,`Table cells ${width}`);assert(metrics.tocTargets);
  if(width>600){assert(Math.abs(metrics.cards[0].height-metrics.cards[1].height)<1);assert(Math.abs(metrics.cards[2].height-metrics.cards[3].height)<1);}
  await page.$eval('.guide-choices',el=>el.scrollIntoView({block:'start'}));
  if([390,768,1280].includes(width))await page.screenshot({path:`${output}/${stage}-choices-${width}.png`});
  await page.focus('.choice-card[href="#horizont"]');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>location.hash==='#horizont');
  assert(await page.$eval('#horizont',el=>el.getBoundingClientRect().top>=0&&el.getBoundingClientRect().top<900));
  if([390,768].includes(width))await page.screenshot({path:`${output}/${stage}-menu-${width}.png`});
  await page.click('.article-contents a[href="#section-4"]');
  await page.waitForFunction(()=>location.hash==='#section-4');
  await page.$eval('#section-4',el=>el.closest('.ed-article-section').querySelector('table').scrollIntoView({block:'center'}));
  if([390,768].includes(width))await page.screenshot({path:`${output}/${stage}-budget-${width}.png`});
  report.views.push({width,...metrics,keyboardCardNavigation:true,tocNavigation:true});
 }
 await page.setJavaScriptEnabled(false);await page.goto(origin+path,{waitUntil:'networkidle0'});
 assert.equal(await page.$$eval('.choice-card',els=>els.length),4);
 await page.click('.choice-card[href="#dacha"]');assert.equal(new URL(page.url()).hash,'#dacha');
 assert.deepEqual(report.errors,[]);report.noJavaScript={content:true,choiceAnchor:true};
 await fs.writeFile(`${output}/${stage}-guide.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`PASS ${stage}: 4 cards, 3 menus, 6 sections/5 tables, dates/prices, 5 widths, keyboard and no JS.`);
}finally{await browser.disconnect();await chrome.kill();}
