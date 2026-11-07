import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const base=process.env.QA_BASE||'http://127.0.0.1:4330',stage=process.env.QA_BASE?'production':'local';
const output=new URL('./',import.meta.url).pathname,path='/journal/kak-narezat-pirog/';
const report={stage,base,views:[],errors:[]};
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try {
 for(const width of [320,390,768,1024,1280]) {
  const page=await browser.newPage();await page.setViewport({width,height:1000});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.setRequestInterception(true);
  page.on('request',r=>{const u=new URL(r.url());if(r.method()!=='GET'||(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(base).origin))r.abort();else r.continue();});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+path+'?qa=1',{waitUntil:'networkidle0'});
  await page.evaluate(()=>document.fonts.ready);
  const article=await page.evaluate(()=>({
   sections:document.querySelectorAll('.ed-article-section').length,tables:document.querySelectorAll('.ed-reading-table').length,
   h1:document.querySelectorAll('h1').length,canonical:document.querySelector('link[rel=canonical]').href,
   sources:[...document.querySelectorAll('.article-sources ol a')].map(a=>a.href),
   anchors:[...document.querySelectorAll('.article-contents a')].every(a=>document.getElementById(a.hash.slice(1))),
   overflow:document.documentElement.scrollWidth>innerWidth+1,
   text:document.querySelector('.ed-article').textContent,
   schema:[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(e=>JSON.parse(e.textContent)['@graph']||[]).find(x=>x['@type']==='BlogPosting')
  }));
  assert.equal(article.sections,9);assert.equal(article.tables,3);assert.equal(article.h1,1);assert.equal(article.sources.length,3);
  assert.equal(article.canonical,'https://pirogorsk.ru'+path);assert(article.anchors&&!article.overflow);
  assert.equal(article.schema.datePublished,'2026-10-31');assert.equal(article.schema.dateModified,'2026-11-07');
  for(const text of ['187,5 г','40 кусочков','36°','5 кг'])assert(article.text.includes(text),text);
  const controls='.cutting-controls',weight='[name="cut-weight"]',count='[name="cut-count"]';
  assert.equal(await page.$eval(controls,e=>e.hidden),false);
  const measure=()=>page.$eval('.cutting-diagrams',e=>{const r=e.getBoundingClientRect();return {height:r.height,width:r.width,overflow:e.scrollWidth>e.clientWidth+1};});
  const initial=await measure(),states=[];
  for(const [w,n,expected] of [['1200','8',['200','150','100']],['1500','8',['250','187,5','125']],['1500','10',['250','150','125']],['1500','12',['250','125','125']],['1000','12',['166,7','83,3','83,3']]]) {
   await page.select(weight,w);await page.select(count,n);
   const data=await page.$eval('.cutting-diagrams',e=>({
    mass:[...e.querySelectorAll('[data-cut-mass]')].map(x=>x.textContent),
    variableLines:e.querySelectorAll('[data-cut-variable] line').length,
    visibleLines:[...e.querySelectorAll('line')].every(x=>getComputedStyle(x).stroke!=='none'&&parseFloat(getComputedStyle(x).strokeWidth)>0),
    equalRadii:[...e.querySelectorAll('[data-cut-variable] line')].every(x=>Math.abs(Math.hypot(Number(x.getAttribute('x2'))-120,Number(x.getAttribute('y2'))-95)-76)<.001),
    status:e.querySelector('[data-cut-status]').textContent,
    labels:[...e.querySelectorAll('select')].every(x=>x.labels.length===1&&x.labels[0].textContent.trim().length>10&&x.getBoundingClientRect().height>=44)
   }));
   assert.deepEqual(data.mass,expected.map(x=>`≈ ${x} г каждый`));assert.equal(data.variableLines,Number(n));
   assert(data.visibleLines&&data.equalRadii&&data.labels);assert(data.status.includes(`${n} кусочков`));
   const after=await measure();assert(!after.overflow);assert(Math.abs(after.height-initial.height)<1,'Diagram height stable');
   states.push({weight:w,parts:n,...data,geometry:after});
  }
  await page.focus(weight);await page.keyboard.press('Tab');
  assert.equal(await page.$eval(count,e=>e===document.activeElement&&e.matches(':focus-visible')),true);
  await page.keyboard.type('10');await page.keyboard.press('Tab');
  assert.equal(await page.$eval(count,e=>e.value),'10');
  assert.equal(await page.$$eval('[data-cut-variable] line',e=>e.length),10);
  await page.select(weight,'1500');await page.select(count,'10');
  await page.$eval('.cutting-diagrams',e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  if([390,768,1280].includes(width))await page.screenshot({path:output+stage+'-cutting-'+width+'.png'});
  const calculator=await page.$('.ed-article-section a[href="/podbor/?guests=20&grams=250"]');assert(calculator);
  await calculator.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),calculator.click()]);
  assert.equal(new URL(page.url()).searchParams.get('guests'),'20');
  assert.equal(await page.$eval('[name="guests"]',e=>e.value),'20');
  assert.equal(await page.$eval('[name="grams"]',e=>e.value),'250');
  const formula=await page.$eval('[data-planner-formula]',e=>e.textContent);assert(formula.includes('5 кг'));
  await page.setJavaScriptEnabled(false);await page.goto(base+path+'?qa=1',{waitUntil:'networkidle0'});
  assert.equal(await page.$eval(controls,e=>e.hidden),true);assert.equal(await page.$$eval('.cutting-diagrams line',e=>e.length),19);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  report.views.push({width,article,states,calculator:{guests:20,grams:250,formula},keyboard:true,noJS:true});
  await page.close();
 }
 assert.deepEqual(report.errors,[]);
 await writeFile(output+stage+'-focused.json',JSON.stringify(report,null,2)+'\n');
 console.log(`PASS ${stage}: article/diagram five widths; 25 calculation states, stable geometry, styled lines, keyboard, no-JS, physical calculator links.`);
}finally {await browser.disconnect();await chrome.kill();}
