import assert from 'node:assert/strict';
import {mkdir, stat, writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const base=process.env.QA_BASE||'http://127.0.0.1:4330';
const stage=process.env.QA_BASE?'production':'local';
const output=new URL('./',import.meta.url).pathname;
const slug='gde-pozavtrakat-v-zelenogradske', path='/journal/'+slug+'/';
const report={stage,base,widths:[],errors:[]};
await mkdir(output,{recursive:true});
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 for(const width of [320,390,768,1024,1280]){
  const page=await browser.newPage();await page.setViewport({width,height:1000});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.setRequestInterception(true);
  page.on('request',req=>{const u=new URL(req.url());if(req.method()!=='GET'||(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(base).origin))req.abort();else req.continue();});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+'/?qa=1',{waitUntil:'networkidle0'});
  assert.equal(await page.$$eval('.home-feed-card[data-product]',els=>els.length),154);
  const card=await page.$('.home-feed-card[data-product="meat"]');
  await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  const purchase=[];
  for(const quantity of [1,2,99,1]){
   await card.$eval('[data-feed-quantity]',(el,n)=>{el.value=String(n);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},quantity);
   const result=await card.evaluate(el=>{
    const box=el.querySelector('.catalog-purchase'),note=el.querySelector('[data-feed-price-note]'),portion=el.querySelector('.portion-price'),button=el.querySelector('[data-add]');
    const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
    return {box:rect(box),note:rect(note),portion:rect(portion),button:rect(button),noteFont:parseFloat(getComputedStyle(note).fontSize),portionFont:parseFloat(getComputedStyle(portion).fontSize),total:el.querySelector('[data-price]').textContent,overflow:box.scrollWidth>box.clientWidth+1};
   });
   assert(result.noteFont>=12&&result.portionFont>=12);
   assert(!result.overflow);assert(result.note.bottom<=result.portion.y+1);assert(result.portion.bottom<=result.button.y+1);
   if(purchase.length){assert(Math.abs(result.box.height-purchase[0].box.height)<1);assert(Math.abs(result.button.y-purchase[0].button.y)<1);}
   purchase.push({quantity,...result});
  }
  await card.$eval('[data-feed-increase]',el=>el.focus());
  assert(await card.$eval('[data-feed-increase]',el=>el.matches(':focus-visible')));
  if([390,768,1280].includes(width))await page.screenshot({path:output+stage+'-cards-'+width+'.png'});
  const longCard=await page.$('.home-feed-card[data-product="p39-497"]');
  assert(await longCard.evaluate(el=>!el.hidden&&el.getBoundingClientRect().height>100),'Long-title card must be visible');
  await longCard.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  const longRows=[];
  for(const q of [1,2,99,1]){
   await longCard.$eval('[data-feed-quantity]',(el,n)=>{el.value=String(n);el.dispatchEvent(new Event('input',{bubbles:true}));},q);
   const row=await longCard.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.querySelector('.catalog-purchase').getBoundingClientRect(),b=el.querySelector('[data-add]').getBoundingClientRect();return {height:r.height,purchase:p.height,button:b.y,overflow:el.scrollWidth>el.clientWidth+1};});
   assert(row.height>100&&row.purchase>100);assert(!row.overflow);if(longRows.length)for(const key of ['height','purchase','button'])assert(Math.abs(row[key]-longRows[0][key])<1);longRows.push(row);
  }
  await page.evaluate(()=>document.activeElement?.blur());
  await longCard.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await longCard.evaluate(async el=>{for(const img of el.querySelectorAll('img')){img.loading='eager';await img.decode();}});
  if([390,768,1280].includes(width))await page.screenshot({path:output+stage+'-long-card-'+width+'.png'});
  await page.goto(base+path+'?qa=1',{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{for(const img of document.querySelectorAll('article img')){img.loading='eager';await img.decode();}});
  const article=await page.evaluate(()=>({
   dates:[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(e=>JSON.parse(e.textContent)['@graph']||[]).find(e=>e['@type']==='BlogPosting'),
   sources:[...document.querySelectorAll('.article-sources ol a')].map(a=>a.href),
   catalogCTA:document.querySelectorAll('.ed-next-step [data-guide-catalog]').length,
   sections:document.querySelectorAll('.ed-article-section').length,tables:document.querySelectorAll('.ed-reading-table').length,
   h1:document.querySelectorAll('h1').length,canonical:document.querySelector('link[rel=canonical]').href,
   overflow:document.documentElement.scrollWidth>innerWidth+1,figures:document.querySelectorAll('.ed-body-figure').length,
   anchors:[...document.querySelectorAll('.article-contents a')].every(a=>document.getElementById(a.hash.slice(1))),
   text:document.querySelector('.ed-article').textContent,
   images:[...document.querySelectorAll('.ed-body-figure img')].map(i=>({src:i.getAttribute('src'),complete:i.complete&&i.naturalWidth>0,alt:i.alt})),
   tableWidths:[...document.querySelectorAll('.ed-table-scroll')].map(t=>({scroll:t.scrollWidth,width:t.clientWidth})),
   newTablesFit:[...document.querySelectorAll('.ed-table-scroll')].filter((_,i)=>i===1||i===3).every(t=>t.scrollWidth<=t.clientWidth+1),
   tableSemantics:[...document.querySelectorAll('.ed-reading-table')].every(t=>t.caption&&t.querySelector('th[scope=col]')&&t.querySelector('th[scope=row]')),
  }));
  assert.equal(article.sections,10);assert.equal(article.tables,4);assert.equal(article.figures,2);assert.equal(article.h1,1);
  await writeFile(output+stage+'-article-progress.json',JSON.stringify({width,article},null,2)+'\n');
  assert.equal(article.dates.datePublished,'2026-10-26');assert.equal(article.dates.dateModified,'2026-11-07');assert.equal(article.sources.length,5);assert.equal(article.catalogCTA,1);assert.equal(article.canonical,'https://pirogorsk.ru'+path);assert(!article.overflow);assert(article.anchors&&article.tableSemantics&&article.newTablesFit);
  for(const text of ['1580 ₽','Пограничная, 1','26 октября','исторический расчёт','404','Кофе и завтрак с собой'])assert(article.text.includes(text),text);
  for(const img of article.images){assert(img.complete&&img.alt);assert((await stat('site'+img.src)).size<200*1024);}
  assert(!article.sources.some(s=>s.includes('/restaurants/bereg-morya/')));
  delete article.text;
  if([390,768].includes(width)){
   await page.$eval('#section-8',el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:output+stage+'-breakfast-format-'+width+'.png'});
   await page.$$eval('.ed-body-figure',els=>els.at(-1).scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:output+stage+'-illustration-'+width+'.png'});
   await page.$eval('#section-4',el=>el.closest('.ed-article-section').querySelector('.ed-table-scroll').scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:output+stage+'-breakfast-budget-'+width+'.png'});
  }
  report.widths.push({width,purchase,longRows,article});await page.close();
 }
 const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.goto(base+path,{waitUntil:'networkidle0'});
 assert.equal(await page.$$eval('.ed-article-section',els=>els.length),10);assert(await page.$('.article-contents a[href="#section-5"]'));
 report.noJavaScript=true;assert.deepEqual(report.errors,[]);
 await writeFile(output+stage+'-focused.json',JSON.stringify(report,null,2)+'\n');
 console.log(`PASS ${stage}: five widths, 154 SKU, 12px notes/portions, 1→2→99→1 stable, keyboard focus, 10 guide sections/2 figures/4 tables/anchors/no-JS.`);
}finally{await browser.disconnect();await chrome.kill();}
