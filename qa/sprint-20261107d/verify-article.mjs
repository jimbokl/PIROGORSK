import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const base=process.env.QA_BASE||'http://127.0.0.1:4330',stage=process.env.QA_BASE?'production':'local',out='qa/sprint-20261107d';
const path='/journal/napitki-kaliningradskoy-oblasti/';
const report={stage,base,path,views:[],errors:[]};
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions','--no-first-run']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 const page=await browser.newPage();
 await page.setCacheEnabled(false);
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.setRequestInterception(true);
 page.on('request',req=>{const u=new URL(req.url());if(req.method()!=='GET'||(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(base).origin))req.abort();else req.continue();});
 page.on('pageerror',e=>report.errors.push(e.message));
 for(const width of [320,390,768,1024,1280]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});
  const response=await page.goto(base+path,{waitUntil:'networkidle0'});assert.equal(response.status(),200);
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>Promise.all([...document.querySelectorAll('.blog-article img')].map(img=>{img.loading='eager';return img.decode();})));
  const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,font:parseFloat(getComputedStyle(document.querySelector('.ed-article p')).fontSize),sources:document.querySelectorAll('#sources ol a').length,toc:[...document.querySelectorAll('.article-contents a')].map(a=>({href:a.getAttribute('href'),height:a.getBoundingClientRect().height,target:!!document.querySelector(a.getAttribute('href'))})),prices:[...document.querySelectorAll('.ed-reading-table-prices')].map(t=>({fits:t.getBoundingClientRect().width<=t.parentElement.clientWidth+1,right:[...t.querySelectorAll('td:last-child')].every(c=>getComputedStyle(c).textAlign==='right'&&c.scrollWidth<=c.clientWidth)}))}));
  assert.equal(data.overflow,false);assert(data.font>=16);assert.equal(data.sources,3);assert(data.toc.length>=9);assert(data.toc.every(a=>a.target&&a.height>=44));assert.equal(data.prices.length,2);assert(data.prices.every(t=>t.fits&&t.right));
  if([390,768].includes(width))await page.screenshot({path:`${out}/${stage}-article-${width}.png`});
  const tableLink=data.toc.find(a=>a.href==='#section-1');assert(tableLink);
  await page.$eval('.article-contents',e=>e.scrollIntoView({block:'start'}));await page.click(`.article-contents a[href="${tableLink.href}"]`);
  await page.waitForFunction(href=>location.hash===href,{},tableLink.href);
  const top=await page.$eval(tableLink.href,e=>e.getBoundingClientRect().top);assert(top>=0&&top<900);
  if([390,768].includes(width)){await page.$eval(tableLink.href,e=>e.closest('.ed-article-section').querySelector('table').scrollIntoView({block:'center'}));await page.screenshot({path:`${out}/${stage}-article-table-${width}.png`});}
  report.views.push({width,...data,tocNavigation:true});
 }
 await page.goto(base+'/journal/gde-poest-s-detmi-v-zelenogradske/',{waitUntil:'networkidle0'});
 const family=await page.evaluate(()=>{
  const text=document.querySelector('.blog-article').textContent;
  return {text,sections:[...document.querySelectorAll('.ed-article-section')].map(e=>e.textContent.replace(/\s+/gu,' ').trim()),graph:[...document.querySelectorAll('script[type="application/ld+json"]')].map(x=>x.textContent).join(''),sourceLinks:[...document.querySelectorAll('#sources a')].map(a=>a.href)};
 });
 assert(family.text.includes('1 750 ₽'));assert(family.text.includes('2 × 480 + 220 + 570'));
 assert(family.text.includes('пандус'));assert(family.sourceLinks.includes('https://restoran-oblaka.ru/detyam'));
 assert(family.graph.includes('"datePublished":"2026-10-26"'));assert(family.graph.includes('"dateModified":"2026-11-07"'));
 if(process.argv.includes('--refresh-baseline')){
  assert.equal(stage,'local');
  const file='qa/journal-polish-20261101/baseline-sections.json';
  const baseline=JSON.parse(await fs.readFile(file,'utf8')),slug='gde-poest-s-detmi-v-zelenogradske';
  const old=baseline[slug],norm=s=>s.replace(/\s/gu,'');
  assert([4,8].includes(old.length));
  assert(family.sections[0].includes('Подробности зависят от заведения'));
  for(let i=1;i<4;i++)assert(norm(family.sections[i]).startsWith(norm(old[i])));
  assert.equal(family.sections.length,8);baseline[slug]=family.sections;
  await fs.writeFile(file,JSON.stringify(baseline,null,2)+'\n');
 }
 report.family={price:1750,published:'2026-10-26',modified:'2026-11-07',sources:family.sourceLinks};
 for(const width of [320,390,768,1024,1280]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert(await page.$$eval('#section-6',nodes=>nodes.length===1));
  assert(await page.$$eval('.ed-reading-table-prices',tables=>tables.length===2&&tables.every(t=>[...t.querySelectorAll('td:last-child')].every(c=>getComputedStyle(c).textAlign==='right'&&c.scrollWidth<=c.clientWidth))));
  await page.$eval('#section-6',e=>e.scrollIntoView({block:'start'}));
  if([390,768].includes(width))await page.screenshot({path:`${out}/${stage}-family-calculation-${width}.png`});
 }
 assert.deepEqual(report.errors,[]);await fs.writeFile(`${out}/${stage}-article.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`Article ${stage} PASS: 3 sources, TOC navigation, 2 price tables, 5 widths.`);
}finally{await browser.close();await chrome.kill();}
