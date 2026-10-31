import assert from 'node:assert/strict';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const output=process.env.PIROGORSK_QA_OUTPUT||'qa/content-month-202611';
const articles=JSON.parse(await readFile('src/data/monthly-articles.json','utf8'));
const plan=JSON.parse(await readFile('research/content-month-202611/topic-map.json','utf8'));
const source=await readFile('research/backlog-intake-20261031/A6.txt','utf8');
assert.deepEqual(plan.topics.map(x=>x.number),Array.from({length:100},(_,i)=>i+1));
for(const x of plan.topics){
 assert.ok(source.includes(`${x.number}. ${x.sourceTitle}`),`Original title ${x.number}`);
 assert.ok(x.intent&&x.ownerURL&&x.week>=1&&x.week<=4&&x.scenario,`Complete plan ${x.number}`);
 assert.ok(x.status.startsWith('integrated_')||x.dataGap,`Outcome/gap ${x.number}`);
}
assert.ok(!/рыбу без мяса/.test(plan.topics[30].topic));
for(const n of [42,56,62,65,82])assert.ok(plan.topics[n-1].brandReframe);
assert.equal(articles.length,6);
for(const article of articles)assert.ok(!/^#|\*\*|\]\(/u.test(article.intro),`Plain-text intro ${article.slug}`);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const site=resolve('site');
const server=createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=resolve(site,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(site+'/')){res.writeHead(403);res.end();return;}
 const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(body);
}catch{res.writeHead(404);res.end();}});
let chrome,browser;
await mkdir(output,{recursive:true});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const local=`http://127.0.0.1:${server.address().port}`;
const base=process.env.QA_BASE||local;
const stage=process.env.QA_BASE?'production':'local';
const report={stage,base:stage==='local'?'local static build':base,coverage:100,articles:[],updates:[],errors:[]};
try{
 chrome=await launch({chromeFlags:['--headless=new','--disable-extensions','--no-first-run']});
 browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
 const page=await browser.newPage();
 await page.setRequestInterception(true);
 page.on('request',req=>{
  const u=new URL(req.url());
  if(req.method()!=='GET'||(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(base).origin))req.abort();else req.continue();
 });
 page.on('pageerror',e=>report.errors.push(e.message));
 for(const article of articles){
  const path=`/journal/${article.slug}/`;
  await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
  const response=await page.goto(base+path,{waitUntil:'networkidle0'});assert.equal(response.status(),200,path);
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>Promise.all([...document.querySelectorAll('.blog-article img')].map(img=>{img.loading='eager';return img.decode();})));
  const data=await page.evaluate(()=>{
   const body=document.querySelector('.ed-article').cloneNode(true);body.querySelectorAll('nav,figcaption').forEach(x=>x.remove());
   const main=[document.querySelector('.ed-hero-intro')?.textContent||document.querySelector('.ed-intro')?.textContent||'',document.querySelector('.blog-takeaway p')?.textContent||'',[...body.querySelectorAll('h2,p,li,caption,th,td')].map(x=>x.textContent).join(' ')].join(' ');
   const graphs=[...document.querySelectorAll('script[type="application/ld+json"]')].map(x=>JSON.parse(x.textContent));
   const flatten=x=>Array.isArray(x)?x.flatMap(flatten):x&&typeof x==='object'?[x,...Object.values(x).flatMap(flatten)]:[];
   const all=graphs.flatMap(flatten);
   return{title:document.title,description:document.querySelector('meta[name="description"]').content,canonical:document.querySelector('link[rel="canonical"]').href,h1:document.querySelectorAll('h1').length,words:main.trim().split(/\s+/u).length,bodyWords:body.textContent.trim().split(/\s+/u).length,blogPosting:all.filter(x=>x['@type']==='BlogPosting'),faq:all.some(x=>x['@type']==='FAQPage'),cta:[...document.querySelectorAll('.ed-next-step a')].map(x=>({href:x.getAttribute('href'),measured:x.hasAttribute('data-guide-catalog')})),bodyLinks:[...document.querySelectorAll('.ed-article a[href^="/"]')].map(x=>x.getAttribute('href')),sourceCount:document.querySelectorAll('#sources ol a').length,images:[...document.querySelectorAll('.blog-article img')].map(x=>({src:x.currentSrc,srcAttribute:x.getAttribute('src'),alt:x.alt,width:x.getAttribute('width'),height:x.getAttribute('height'),srcset:x.getAttribute('srcset'),complete:x.complete&&x.naturalWidth>0})),captions:[...document.querySelectorAll('.blog-article figcaption')].map(x=>x.textContent)};
  });
  // The editorial source count includes intro/takeaway and visible list/table text, never navigation or references.
  const text=[article.intro,article.takeaway,...article.sections.flatMap(s=>[s.title,...s.paragraphs||[],...s.items||[],...s.steps||[],...(s.table?[s.table.caption,...s.table.headers,...s.table.rows.flat()]:[])])].join(' ');
  data.sourceWords=text.trim().split(/\s+/u).length;
  assert.ok(Math.abs(data.words-data.sourceWords)<=2,`Rendered text count ${path}: ${data.words}/${data.sourceWords}`);
  assert.ok(data.words>=1200&&data.words<=1800,`${path}: ${data.words} words`);
  assert.ok(data.title.length<=60&&data.description.length<=160,`Metadata length ${path}`);
  assert.equal(data.canonical,'https://pirogorsk.ru'+path);assert.equal(data.h1,1);assert.equal(data.blogPosting.length,1);assert.equal(data.faq,false);
  assert.equal(data.blogPosting[0].datePublished,'2026-10-31');assert.equal(data.blogPosting[0].dateModified,'2026-10-31');
  assert.equal(data.cta.length,1);assert.ok(data.cta[0].measured);
  assert.ok(data.bodyLinks.length>=3&&data.bodyLinks.length<=5,`Context links ${path}`);
  assert.ok(article.sources.length>=3&&article.sources.length<=5,`Sources ${path}`);
  assert.equal(data.sourceCount,article.sources.length,`Rendered sources ${path}`);
  assert.equal(data.images.length,3);assert.equal(data.captions.length,3);assert.ok(data.captions[0].includes('Не фотография'));
  for(const image of data.images){
   assert.ok(image.alt&&image.width&&image.height&&image.srcset&&image.complete,`Image attributes ${path}`);
   assert.ok(image.srcAttribute.endsWith('.webp'),`WebP fallback ${path}`);
   const bytes=(await stat(resolve(site,'.'+new URL(image.srcAttribute,base).pathname))).size;
   image.fallbackBytes=bytes;assert.ok(bytes<200*1024,`Image weight ${path}: ${bytes}`);
  }
  for(const link of data.bodyLinks)assert.ok((await stat(resolve(site,'.'+link+'index.html'))).isFile(),`Internal link ${link}`);
  data.viewports=[];
  for(const width of [320,390,768,1024,1280]){
   await page.setViewport({width,height:900,deviceScaleFactor:1});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(overflow,false,`${path} overflow at ${width}`);data.viewports.push({width,overflow});
   if([390,1280].includes(width)){
    await page.screenshot({path:`${output}/${stage}-${article.slug}-${width}.png`});
    if(width===390){await page.$eval('.ed-body-figure',el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:`${output}/${stage}-${article.slug}-diagram-${width}.png`});await page.evaluate(()=>scrollTo(0,0));}
   }
  }
  report.articles.push({path,...data});
 }
 const updates=JSON.parse(await readFile('src/data/article-updates.json','utf8'));
 for(const update of updates){
  await page.goto(base+update.ownerURL,{waitUntil:'networkidle0'});
  const data=await page.evaluate(()=>({text:document.querySelector('.blog-article').textContent,structured:[...document.querySelectorAll('script[type="application/ld+json"]')].map(x=>x.textContent).join(''),links:[...document.querySelectorAll('.ed-article a[href^="/"]')].map(a=>a.getAttribute('href'))}));
  for(const section of update.sections)assert.ok(data.text.includes(section.title));
  assert.ok(data.text.includes('Обновлено')&&data.structured.includes('"dateModified":"2026-10-31"'),`Updated date ${update.ownerURL}`);
  for(const href of data.links){const path=new URL(href,base).pathname;assert.ok((await stat(resolve(site,'.'+path+'index.html'))).isFile(),`Updated internal link ${href}`);}
  const viewports=[];
  for(const width of [320,390,768,1024,1280]){
   await page.setViewport({width,height:900,deviceScaleFactor:1});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(overflow,false,`${update.ownerURL} overflow at ${width}`);viewports.push({width,overflow});
   if([390,768].includes(width)){
    await page.screenshot({path:`${output}/${stage}-updated-${update.ownerURL.split('/')[2]}-${width}.png`});
    await page.$eval('.ed-article table',el=>el.scrollIntoView({block:'center'}));
    await page.screenshot({path:`${output}/${stage}-updated-${update.ownerURL.split('/')[2]}-table-${width}.png`});
    await page.evaluate(()=>scrollTo(0,0));
   }
  }
  report.updates.push({path:update.ownerURL,sections:update.sections.length,modified:'2026-10-31',links:data.links,viewports});
 }
 assert.deepEqual(report.errors,[]);
 await writeFile(`${output}/${stage}-report.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`Content month PASS (${stage}): 100 topics; ${articles.length} new articles, ${updates.length} updated owners; ${(articles.length+updates.length)*5} viewport checks.`);
}finally{await browser?.disconnect();await chrome?.kill();await new Promise(done=>server.close(done));}
