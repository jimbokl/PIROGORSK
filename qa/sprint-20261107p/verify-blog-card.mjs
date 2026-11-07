import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const base=process.env.QA_BASE||'http://127.0.0.1:4330',stage=new URL(base).hostname==='pirogorsk.ru'?'production':'local';
const output=new URL('./',import.meta.url).pathname,href='/journal/kish-s-kuritsey-i-gribami/';
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const report={base,widths:[],errors:[]};
try{
 for(const width of [320,390,768,1024,1440]){
  const page=await browser.newPage();await page.setCacheEnabled(false);await page.setViewport({width,height:1000});
  await page.setRequestInterception(true);page.on('request',r=>{const u=new URL(r.url());if(r.method()!=='GET'||(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(base).origin))r.abort();else r.continue();});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+'/blog/?qa=1',{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
  const gallery=await page.$$eval('.blog-card',cards=>({count:cards.length,issues:cards.flatMap(card=>{const time=card.querySelector('.blog-card-meta>span:last-child'),meta=time.parentElement,r=time.getBoundingClientRect(),m=meta.getBoundingClientRect(),style=getComputedStyle(time);return card.scrollWidth>card.clientWidth+1||r.right>m.right+1||r.height>parseFloat(style.lineHeight)+1?[card.querySelector('h3').textContent]:[];})}));
  assert.equal(gallery.count,86);assert.equal(await page.$$eval('[data-blog-entry]',entries=>entries.length),87);assert.deepEqual(gallery.issues,[]);
  const link=await page.$(`.blog-card a[href="${href}"]`);assert(link);
  await link.evaluate(async el=>{el.scrollIntoView({block:'center',behavior:'instant'});for(const img of el.querySelectorAll('img')){img.loading='eager';await img.decode();}el.focus();});
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.blog-card img')].filter(img=>{const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}).map(async img=>{img.loading='eager';await img.decode();}));});
  const data=await link.evaluate(el=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};const card=el.closest('.blog-card'),title=el.querySelector('.blog-card-title'),arrow=el.querySelector('.blog-card-arrow'),img=el.querySelector('img'),desc=el.querySelector('p');return {card:rect(card),title:rect(title),arrow:rect(arrow),image:rect(img),description:rect(desc),alt:img.alt,decoded:img.complete&&img.naturalWidth>0,focus:el.matches(':focus-visible'),overflow:card.scrollWidth>card.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1};});
  assert(!data.overflow&&data.decoded&&data.alt&&data.focus);assert(data.title.right<=data.arrow.x+1);assert(data.image.bottom<=data.title.y+1);assert(data.description.bottom<=data.card.bottom+1);assert(data.image.width>100&&data.image.height>100);
  const readingTime=await link.$eval('.blog-card-meta>span:last-child',el=>({nowrap:getComputedStyle(el).whiteSpace==='nowrap',height:el.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(el).lineHeight)}));
  assert(readingTime.nowrap&&readingTime.height<=readingTime.lineHeight+1);data.readingTime=readingTime;
  if([390,768].includes(width))await page.screenshot({path:output+stage+'-blog-card-'+width+'.png'});
  if(width===1440){
   await link.hover();await page.waitForFunction(href=>{const img=document.querySelector(`.blog-card a[href="${href}"] img`);return new DOMMatrixReadOnly(getComputedStyle(img).transform).a>1.02;},{timeout:3000},href);
   await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
   await page.waitForFunction(href=>getComputedStyle(document.querySelector(`.blog-card a[href="${href}"] img`)).transform==='none',{},href);
   data.hoverZoom=true;data.reducedMotion=true;
  }
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),link.click()]);assert.equal(new URL(page.url()).pathname,href);
  report.widths.push({width,...data,gallery,destination:href});await page.close();
 }
 assert.deepEqual(report.errors,[]);await writeFile(output+stage+'-blog-card.json',JSON.stringify(report,null,2)+'\n');
 console.log(`PASS ${stage}: new blog card on five widths; cover/title/arrow/description fit, keyboard focus and physical navigation.`);
}finally{await browser.disconnect();await chrome.kill();}
