import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const base=process.env.QA_BASE||'http://127.0.0.1:4330',stage=process.env.QA_BASE?'production':'local';
const output=new URL('./',import.meta.url).pathname,href='/journal/yablochnyy-pirog-v-duhovke/';
const report={base,widths:[],errors:[]};
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 for(const width of [320,390,768,1024,1440]){
  const page=await browser.newPage();await page.setCacheEnabled(false);await page.setViewport({width,height:1000});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.setRequestInterception(true);page.on('request',r=>{const u=new URL(r.url());if(r.method()!=='GET'||(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(base).origin))r.abort();else r.continue();});
  page.on('pageerror',e=>report.errors.push(e.message));
  const response=await page.goto(base+href+'?qa=1',{waitUntil:'networkidle0'});assert.equal(response.status(),200);
  await page.evaluate(async()=>{await document.fonts.ready;for(const img of document.querySelectorAll('.blog-article .ed-hero-art img, .ed-body-figure img')){img.loading='eager';await img.decode();}});
  const data=await page.evaluate(()=>{
   const posting=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(e=>JSON.parse(e.textContent)['@graph']||[]).find(e=>e['@type']==='BlogPosting');
   return {sections:document.querySelectorAll('.ed-article-section').length,tables:document.querySelectorAll('.ed-reading-table').length,steps:document.querySelectorAll('#section-1 + div ol li').length,
    sources:[...document.querySelectorAll('.article-sources ol a')].map(a=>a.href),h1:document.querySelectorAll('h1').length,canonical:document.querySelector('link[rel=canonical]').href,
    posting,overflow:document.documentElement.scrollWidth>innerWidth+1,figures:document.querySelectorAll('.ed-body-figure').length,
    anchors:[...document.querySelectorAll('.article-contents a')].map(a=>({href:a.getAttribute('href'),exists:!!document.getElementById(a.hash.slice(1))})),
    images:[...document.querySelectorAll('.blog-article .ed-hero-art img, .ed-body-figure img')].map(i=>({src:i.getAttribute('src'),decoded:i.complete&&i.naturalWidth>0,alt:i.alt})),
    tablesFit:[...document.querySelectorAll('.ed-table-scroll')].every(t=>t.scrollWidth<=t.clientWidth+1),
    tableSemantics:[...document.querySelectorAll('.ed-reading-table')].every(t=>t.caption&&t.querySelector('th[scope=col]')&&t.querySelector('th[scope=row]')),
    inboundRelated:!!document.querySelector('.ed-reading-links a[href="/journal/yabloki-dlya-piroga/"]'),
    text:document.querySelector('.ed-article').textContent};
  });
  await writeFile(output+stage+'-article-progress.json',JSON.stringify({width,...data},null,2)+'\n');
  assert.equal(data.sections,7);assert.equal(data.tables,2);assert.equal(data.steps,6);assert.equal(data.sources.length,3);assert.equal(data.figures,1);assert.equal(data.h1,1);
  assert.equal(data.canonical,'https://pirogorsk.ru'+href);assert.equal(data.posting.datePublished,'2026-11-07');assert.equal(data.posting.dateModified,'2026-11-07');
  assert(!data.overflow&&data.tablesFit&&data.tableSemantics&&data.inboundRelated);assert(data.anchors.length>=8&&data.anchors.every(a=>a.exists));assert(data.images.length>=2&&data.images.every(i=>i.decoded&&i.alt));
  for(const text of ['500 г','115 г','180 °C','40–45','900 ÷ 8','Кристин'])assert(data.text.includes(text),text);
  delete data.text;
  if([390,768].includes(width)){
   await page.screenshot({path:output+stage+'-hero-'+width+'.png'});
   await page.$eval('.ed-body-figure',el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:output+stage+'-preparation-'+width+'.png'});
   await page.$eval('#section-4',el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:output+stage+'-portions-'+width+'.png'});
  }
  await page.$eval('.article-contents a[href="#section-1"]',el=>el.focus());assert(await page.$eval('.article-contents a[href="#section-1"]',el=>el.matches(':focus-visible')));
  await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#section-1');
  await page.goto(base+'/journal/yabloki-dlya-piroga/?qa=1',{waitUntil:'networkidle0'});assert(await page.$(`.ed-reading-links a[href="${href}"]`));
  report.widths.push({width,...data,keyboardAnchor:true,incomingLink:true});await page.close();
 }
 const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.goto(base+href,{waitUntil:'networkidle0'});assert.equal(await page.$$eval('.ed-article-section',els=>els.length),7);assert.equal(await page.$$eval('#section-1 + div ol li',els=>els.length),6);report.noJavaScript=true;
 assert.deepEqual(report.errors,[]);await writeFile(output+stage+'-focused.json',JSON.stringify(report,null,2)+'\n');
 console.log(`PASS ${stage}: recipe at five widths; 7 sections/2 tables/6 steps/3 sources, decoded artwork, anchors/keyboard, incoming link and no-JS.`);
}finally{await browser.disconnect();await chrome.kill();}
