import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const base=process.env.QA_BASE||'http://127.0.0.1:4330';
const out='qa/sprint-20261107d',stage=process.env.QA_BASE?'production':'local';
const report={base,stage,views:[],errors:[]};
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions','--no-first-run']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 const page=await browser.newPage();
 await page.setCacheEnabled(false);
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.setRequestInterception(true);
 page.on('request',req=>{
  const u=new URL(req.url());
  if(req.method()!=='GET'||(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(base).origin))req.abort();else req.continue();
 });
 for(const width of [320,390,768,1024,1280]){
  await page.setViewport({width,height:1000,deviceScaleFactor:1});
  const response=await page.goto(base+'/blog/',{waitUntil:'networkidle0'});
  assert.equal(response.status(),200);await page.evaluate(()=>document.fonts.ready);
  const pairQuery=await page.$$eval('[data-blog-category]',categories=>{
   for(const category of categories){
    const texts=[...category.querySelectorAll('[data-blog-entry]')].map(e=>e.dataset.blogSearch.toLocaleLowerCase('ru-RU').replaceAll('ё','е'));
    const words=new Set(texts.join(' ').match(/[\p{L}]{5,}/gu));
    for(const word of words)if(texts.filter(text=>text.includes(word)).length===2)return word;
   }
  });
  assert.ok(pairQuery,'A real search with two results in a category is available');
  for(const query of ['', 'Что пить на Балтике',pairQuery,'Калининград','кофе','несуществующийзапрос']){
   await page.$eval('[data-blog-search-form] input',(input,q)=>{input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));},query);
   const data=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    visible:document.querySelectorAll('[data-blog-entry]:not([hidden])').length,
    status:document.querySelector('[data-blog-search-status]').textContent,
    emptyVisible:!document.querySelector('[data-blog-empty]').hidden,
    query:new URL(location.href).searchParams.get('q'),
    grids:[...document.querySelectorAll('[data-blog-category]')].filter(c=>!c.hidden).map(c=>{
     const grid=c.querySelector('.blog-card-grid'),cards=[...grid.querySelectorAll('[data-blog-entry]:not([hidden])')];
     return {count:cards.length,single:grid.classList.contains('blog-card-grid-single'),even:grid.classList.contains('blog-card-grid-even'),columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,cards:cards.map(e=>{
      const r=e.getBoundingClientRect(),image=e.querySelector('.blog-card-image').getBoundingClientRect(),title=e.querySelector('h3').getBoundingClientRect(),meta=e.querySelector('.blog-card-meta').getBoundingClientRect(),copy=e.querySelector('p').getBoundingClientRect();
      return {width:r.width,right:r.right,bottom:r.bottom,imageWidth:image.width,titleTop:title.top,titleBottom:title.bottom,metaTop:meta.top,copyBottom:copy.bottom,sizes:[...e.querySelectorAll('[sizes]')].map(i=>i.sizes)};
     })};
    })
   }));
   assert.equal(data.overflow,false,`${width}/${query}: overflow`);
   assert.equal(data.query,query||null);assert.equal(data.emptyVisible,data.visible===0);
   assert.ok(data.status.endsWith(String(data.visible)));
   if(!query){
    assert.equal(data.visible,80);
    const grouping=await page.evaluate(()=>[
     ['kofe-i-vypechka-v-zelenogradske','zelenogradsk'],
     ['zavtraki-v-kaliningrade','kaliningrad'],
     ['kofeyni-kaliningrada','kaliningrad'],
     ['gde-poest-ryadom-s-ostrovom-kanta','kaliningrad'],
     ['kaliningrad-zimoy-gde-poest','kaliningrad'],
     ['kraftovoe-pivo-kaliningrada','za-stolom']
    ].map(([slug,expected])=>({slug,expected,actual:document.querySelector(`[data-blog-entry] a[href="/journal/${slug}/"]`)?.closest('[data-blog-category]')?.id})));
    for(const entry of grouping)assert.equal(entry.actual,entry.expected,`City category: ${entry.slug}`);
    if(width<=650){
     assert.ok(await page.$$eval('.blog-card p',nodes=>nodes.every(p=>parseFloat(getComputedStyle(p).fontSize)>=15)));
     assert.ok(await page.$$eval('.blog-card-meta',nodes=>nodes.every(p=>parseFloat(getComputedStyle(p).fontSize)>=13)));
    }
   }
   for(const grid of data.grids){
    assert.equal(grid.single,grid.count===1);assert.equal(grid.even,grid.count===2||grid.count===4);
    assert.equal(grid.columns,width<=650||grid.count===1?1:width<=900||grid.even?2:3);
    for(const card of grid.cards){
     assert.ok(card.width>0&&card.right<=width+1);assert.ok(card.titleBottom<=card.metaTop+1);
     assert.ok(card.copyBottom<=card.bottom+1);
     assert.ok(card.sizes.every(s=>s.includes(grid.single||grid.even?'560px':'360px')));
     if(grid.single)assert.ok(card.imageWidth>=card.width*(width<=650?.99:.45));
    }
   }
   if(query==='Что пить на Балтике'){
    const card=await page.$('[data-blog-category]:not([hidden]) [data-blog-entry]:not([hidden])');
    assert.ok(card,'New article appears in search');
    await card.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest'}));
    await page.waitForFunction(()=>{
     const image=document.querySelector('[data-blog-category]:not([hidden]) [data-blog-entry]:not([hidden]) img');
     return image?.complete&&image.naturalWidth>0;
    });
    await card.$eval('img',image=>image.decode());
    await card.screenshot({path:`${out}/${stage}-blog-single-${width}.png`,captureBeyondViewport:false});
   }
   if(query===pairQuery)assert.ok(data.grids.some(g=>g.count===2));
   report.views.push({width,query,count:data.visible,grids:data.grids.map(g=>({count:g.count,columns:g.columns,single:g.single,even:g.even}))});
  }
  await page.$eval('[data-blog-search-form] input',input=>{input.value='Что пить на Балтике';input.dispatchEvent(new Event('input',{bubbles:true}));});
  const target='[data-blog-category]:not([hidden]) [data-blog-entry]:not([hidden]) a';
  await page.focus(target);
  const focus=await page.$eval(target,a=>{
   const h=a.querySelector('h3'),arrow=a.querySelector('.blog-card-arrow');
   return {visible:a.matches(':focus-visible'),outline:getComputedStyle(a).outlineStyle,heading:getComputedStyle(h).color,arrow:getComputedStyle(arrow).backgroundColor,titleWidth:a.querySelector('.blog-card-title').getBoundingClientRect().width};
  });
  assert.equal(focus.visible,true);assert.equal(focus.outline,'solid');assert.equal(focus.heading,focus.arrow);assert(focus.titleWidth>0);
  if([390,768,1280].includes(width)){
   await page.$eval(target,e=>e.scrollIntoView({block:'center'}));
   await page.screenshot({path:`${out}/${stage}-blog-focus-${width}.png`});
  }
  await page.focus('[data-blog-search-reset]');await page.keyboard.press('Enter');
  assert.equal(await page.$eval('[data-blog-search-form] input',e=>e.value),'');
  assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('[data-blog-search-form] input')),true);
 }
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 await page.focus('[data-blog-search-form] input');await page.focus('.blog-card[data-blog-entry]:not([hidden]) a');
 await page.waitForFunction(()=>{
  const a=document.querySelector('.blog-card[data-blog-entry]:not([hidden]) a');
  return a.matches(':focus-visible')&&getComputedStyle(a.querySelector('h3')).color===getComputedStyle(a.querySelector('.blog-card-arrow')).backgroundColor;
 });
 report.animatedFocus=true;
 assert.deepEqual(report.errors,[]);
 await fs.writeFile(`${out}/${stage}-blog-cards.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`Blog cards PASS: ${report.views.length} searches/viewports, result layouts, reset and responsive sizes.`);
}finally{await browser.close();await chrome.kill();}
