import assert from 'node:assert/strict';
import {mkdir, stat, writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const base=process.env.QA_BASE||'http://127.0.0.1:4330';
const stage=process.env.QA_BASE?'production':'local';
const output=new URL('./',import.meta.url).pathname;
const slug='sedobnye-suveniry-iz-kaliningrada', path='/journal/'+slug+'/';
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
  await page.goto(base+path+'?qa=1',{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{for(const img of document.querySelectorAll('article img')){img.loading='eager';await img.decode();}});
  const article=await page.evaluate(()=>({
   sections:document.querySelectorAll('.ed-article-section').length,tables:document.querySelectorAll('.ed-reading-table').length,
   h1:document.querySelectorAll('h1').length,canonical:document.querySelector('link[rel=canonical]').href,
   overflow:document.documentElement.scrollWidth>innerWidth+1,figures:document.querySelectorAll('.ed-body-figure').length,
   anchors:[...document.querySelectorAll('.article-contents a')].every(a=>document.getElementById(a.hash.slice(1))),
   text:document.querySelector('.ed-article').textContent,
   images:[...document.querySelectorAll('.ed-body-figure img')].map(i=>({src:i.getAttribute('src'),complete:i.complete&&i.naturalWidth>0,alt:i.alt})),
   newTablesFit:[...document.querySelectorAll('.ed-article-section')].slice(5,8).every(s=>{const t=s.querySelector('.ed-table-scroll');return t&&t.scrollWidth<=t.clientWidth+1;}),
   tableSemantics:[...document.querySelectorAll('.ed-reading-table')].every(t=>t.caption&&t.querySelector('th[scope=col]')&&t.querySelector('th[scope=row]')),
  }));
  assert.equal(article.sections,11);assert.equal(article.tables,4);assert.equal(article.figures,3);assert.equal(article.h1,1);
  assert.equal(article.canonical,'https://pirogorsk.ru'+path);assert(!article.overflow);assert(article.anchors&&article.tableSemantics&&article.newTablesFit);
  for(const text of ['Курортный проспект, 16','Курортный проспект, 22','ул. Володарского, 2а','ул. Ленина, 18а','средиземноморского миндаля','240 г','200 г','255 г'])assert(article.text.includes(text),text);
  for(const img of article.images){assert(img.complete&&img.alt);assert((await stat('site'+img.src)).size<200*1024);}
  delete article.text;
  if([390,768].includes(width)){
   await page.$eval('#section-5',el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:output+stage+'-shops-'+width+'.png'});
   await page.$eval('.ed-article-section:nth-child(6) figure',el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:output+stage+'-illustration-'+width+'.png'});
   await page.$eval('#section-7',el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:output+stage+'-weights-'+width+'.png'});
  }
  report.widths.push({width,purchase,article});await page.close();
 }
 const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.goto(base+path,{waitUntil:'networkidle0'});
 assert.equal(await page.$$eval('.ed-article-section',els=>els.length),11);assert(await page.$('.article-contents a[href="#section-5"]'));
 report.noJavaScript=true;assert.deepEqual(report.errors,[]);
 await writeFile(output+stage+'-focused.json',JSON.stringify(report,null,2)+'\n');
 console.log(`PASS ${stage}: five widths, 154 SKU, 12px notes/portions, 1→2→99→1 stable, keyboard focus, 11 guide sections/3 figures/tables/anchors/no-JS.`);
}finally{await browser.disconnect();await chrome.kill();}
