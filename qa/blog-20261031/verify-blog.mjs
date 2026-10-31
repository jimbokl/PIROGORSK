import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const articles=JSON.parse(await readFile('src/data/semantic-articles.json','utf8'));
const origin=process.argv.includes('--production')?'https://pirogorsk.ru':'http://127.0.0.1:4322';
const stage=process.argv.includes('--production')?'production':'local';
const root=`qa/blog-20261031/${stage}`;await mkdir(root,{recursive:true});
const results=[],errors=[],flows=[];
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
try {
 const page=await browser.newPage();
 await page.setCacheEnabled(false);
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(new URL(r.url()).origin===origin&&r.status()>=400)errors.push(`HTTP ${r.status()} ${r.url()}`)});
 await page.setRequestInterception(true);
 page.on('request',r=>new URL(r.url()).origin===origin||r.url().startsWith('data:')?r.continue():r.abort());
 async function visit(path,width){
  await page.setViewport({width,height:width===768?1024:844,deviceScaleFactor:1,isMobile:width<1100,hasTouch:width<1100});
  const response=await page.goto(`${origin}${path}?qa=1`,{waitUntil:'networkidle0',timeout:45000});assert.equal(response.status(),200,path);
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`document overflow ${path}/${width}`);
  assert.equal(await page.$$eval('h1',e=>e.length),1);
 }
 for(const width of [390,768]){
  for(const [i,article]of articles.entries()){
   const path=`/journal/${article.slug}/`;await visit(path,width);
   const result=await page.evaluate(()=>{
    const schema=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(el=>{const v=JSON.parse(el.textContent);return v['@graph']??[v]});
    const cover=document.querySelector('.ed-hero picture img');
    const table=document.querySelector('.ed-table-scroll');
    return {heading:document.querySelector('h1').textContent,canonical:document.querySelector('link[rel=canonical]').href,
     anchors:[...document.querySelectorAll('.blog-toc a')].map(el=>({href:el.hash,exists:!!document.querySelector(el.hash)})),
     cover:cover?{loaded:cover.complete&&cover.naturalWidth>0,alt:cover.alt,width:cover.clientWidth,height:cover.clientHeight,current:cover.currentSrc}:null,
     sources:[...document.querySelectorAll('.article-sources ol a')].map(el=>el.href),
     article:schema.find(s=>s['@type']==='BlogPosting'),table:table?{width:table.clientWidth,scroll:table.scrollWidth,font:getComputedStyle(table.querySelector('td')).fontSize}:null,
     headings:[...document.querySelectorAll('h1,h2')].map(el=>({x:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})),
     author:document.querySelector('.blog-byline a')?.textContent,
     recipeSteps:document.querySelectorAll('.ed-article-section ol li').length,
     missingAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(el=>el.hash&& !document.getElementById(decodeURIComponent(el.hash.slice(1)))).map(el=>el.hash)
    };
   });
   assert.equal(result.recipeSteps,article.sections.reduce((n,s)=>n+(s.steps?.length??0),0));
   assert.equal(result.heading,article.title);assert.equal(result.canonical,`https://pirogorsk.ru${path}`);
   assert.equal(result.anchors.length,article.sections.length+1);assert.ok(result.anchors.every(a=>a.exists));
   assert.ok(result.cover?.loaded,`${path} cover`);assert.ok(result.cover.alt.length>20);assert.ok(result.cover.width>200);
   assert.equal(result.author,'Редакция Пирогорска');assert.equal(result.article.author['@type'],'Organization');
   assert.equal(result.article.datePublished,'2026-10-31');assert.equal(result.article.dateModified,'2026-10-31');
   const citations=article.sources.map(s=>new URL(s.href,'https://pirogorsk.ru').href);
   assert.deepEqual(result.article.citation,citations);assert.equal(result.sources.length,citations.length);
   assert.ok(result.table);assert.ok(parseFloat(result.table.font)>=13);
   for(const h of result.headings)assert.ok(h.x>=-1&&h.right<=width+1,`${path} clipped heading`);
   assert.deepEqual(result.missingAnchors,[]);
   // All rows remain available through the independently scrollable, focusable table.
   await page.$eval('.ed-table-scroll',el=>{el.scrollLeft=el.scrollWidth;});
   const tableMoved=await page.$eval('.ed-table-scroll',el=>el.scrollLeft>0||el.scrollWidth===el.clientWidth);assert.ok(tableMoved);
   await page.$eval('.blog-toc a[href="#sources"]',el=>el.click());
   await page.waitForFunction(()=>location.hash==='#sources');
   await page.$eval('#sources',el=>el.scrollIntoView({block:'start',behavior:'instant'}));
   if([0,14,15,16,28].includes(i))await page.screenshot({path:`${root}/sources-${i+1}-${width}.jpg`,type:'jpeg',quality:84});
   if([0,14,15,16,28].includes(i)){
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`${root}/article-${i+1}-${width}.jpg`,type:'jpeg',quality:84});
    await page.$eval('.ed-table-scroll',el=>{el.scrollLeft=0;el.scrollIntoView({block:'center',behavior:'instant'});});await page.screenshot({path:`${root}/table-${i+1}-${width}.jpg`,type:'jpeg',quality:84});
   }
   results.push({slug:article.slug,width,...result});
  }
  await visit('/blog/',width);
  const links=await page.$$eval('main a',els=>els.map(e=>new URL(e.href).pathname));
  for(const a of articles)assert.ok(links.includes(`/journal/${a.slug}/`));
  assert.match(await page.$eval('main',e=>e.textContent),/53/);
  await page.screenshot({path:`${root}/blog-${width}.jpg`,type:'jpeg',quality:84});
  await visit('/about/',width);assert.ok(await page.$('#redaktsiya'));
  assert.match(await page.$eval('#redaktsiya',e=>e.textContent),/источник|источники/);
  await visit('/journal/skolko-piroga-na-cheloveka/',width);assert.ok(await page.$('.blog-toc'));
  flows.push(`${width}: all 30 articles, TOC → sources, table scroll, citations, loaded covers; 53-entry hub, editorial policy, existing article`);
 }
 for(const width of [320,1280]){
  for(const slug of [articles[0].slug,articles[14].slug,articles[28].slug]){
   await visit(`/journal/${slug}/`,width);await page.screenshot({path:`${root}/edge-${slug}-${width}.jpg`,type:'jpeg',quality:80});
  }
  await visit('/blog/',width);flows.push(`${width}: three representative articles + hub, no document overflow`);
 }
 assert.deepEqual(errors,[]);
 console.log(`PASS: ${results.length} new article phone/tablet views; ${flows.length} QA groups; no JS or same-origin HTTP errors.`);
}finally{
 await writeFile(`${root}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),origin,results,flows,errors},null,2)+'\n');
 await browser.close();chrome.kill();
}
