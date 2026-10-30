import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import {catalog} from '../../src/data/catalog.ts';
import {catalogProductHref} from '../../src/lib/product-paths.ts';
const production=process.argv.includes('--production'),stage=production?'production':'local';
const origin=production?'https://pirogorsk.ru':'http://127.0.0.1:4322';
const root=`qa/polish-20261030/${stage}`;await mkdir(root,{recursive:true});
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
const results=[],flows=[],errors=[];
const supplier=catalog.find(p=>p.id==='hb-osetinskiy-pirog-s-kuritsey-i-syrom');
const fresh=catalog.find(p=>p.id.startsWith('p39-'));
const bread=catalog.find(p=>p.category==='bread');
const meat=catalog.find(p=>p.id==='meat');
const routes=[['home','/'],['menu','/menu/'],['supplier',catalogProductHref(supplier)],['fresh',catalogProductHref(fresh)],['meat',catalogProductHref(meat)],['bread',catalogProductHref(bread)],['occasions','/povody/'],['about','/about/'],['partners','/partners/'],['planner','/podbor/']];
async function visit(page,path){await page.goto(`${origin}${path}${path.includes('?')?'&':'?'}qa=1`,{waitUntil:'networkidle0',timeout:45000});await page.evaluate(()=>document.fonts.ready);}
async function inspect(page,name,width){
 const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,h1s:document.querySelectorAll('h1').length,title:document.querySelector('h1')?.textContent,firstProductY:document.querySelector('.supplier-card')?.getBoundingClientRect().y,headings:[...document.querySelectorAll('h1,.product-recommendations h2')].map(el=>({text:el.textContent,x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right})),options:document.querySelector('[data-product-options]')?{quantity:document.querySelector('[data-option-quantity]').value,buttons:[...document.querySelectorAll('[data-option-quantity-control] button')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))}:null}));
 assert.equal(result.overflow,false,`${name}/${width} page overflow`);assert.equal(result.h1s,1);for(const h of result.headings)assert.ok(h.x>=0&&h.right<=width+1,`${name}/${width} clipped heading`);
 if(result.options)for(const button of result.options.buttons)assert.ok(button.width>=44&&button.height>=44,`${name}/${width} quantity touch target`);
 if(name==='menu'){assert.ok(result.firstProductY<1250,`catalog too far down ${width}: ${result.firstProductY}`);assert.equal(await page.$eval('[data-menu-status]',el=>el.textContent),'Позиций по вашему выбору: 153');}
 if([390,768,1280].includes(width))await page.screenshot({path:`${root}/${name}-${width}.jpg`,type:'jpeg',quality:85});
 results.push({name,width,...result});
}
try{
 for(const width of [320,390,768,1024,1280]){
  const context=await browser.createBrowserContext(),page=await context.newPage();await page.setViewport({width,height:1000,isMobile:width<1100,hasTouch:width<1100});
  page.on('pageerror',e=>errors.push(`${width}: ${e.message}`));page.on('response',r=>{if(new URL(r.url()).origin===origin&&r.status()>=400)errors.push(`HTTP ${r.status()} ${r.url()}`);});
  for(const[name,path]of routes){await visit(page,path);await inspect(page,name,width);}
  await visit(page,'/menu/');
  await page.type('#menu-search','НЕСУЩЕСТВУЮЩИЙпирог');assert.ok(await page.$eval('[data-menu-empty]',el=>!el.hidden));
  await page.click('[data-menu-empty-reset]');assert.equal(await page.$eval('#menu-search',el=>document.activeElement===el),true);
  assert.equal(await page.$eval('#menu-search',el=>el.value),'');assert.equal(new URL(page.url()).searchParams.has('q'),false);
  await page.click('[data-menu-jump=holland]');await page.waitForFunction(()=>document.querySelector('[data-menu-jump=holland]').getAttribute('aria-current')==='location');
  await page.$eval('#holland .supplier-info summary',el=>el.click());assert.equal(await page.$eval('#holland .supplier-info',el=>el.open),true);
  flows.push(`${width}: empty state reset + focus, section tracking, supplier disclosure`);
  await visit(page,catalogProductHref(supplier));await page.evaluate(()=>localStorage.removeItem('pirogorsk-selection'));await page.reload({waitUntil:'networkidle0'});
  await page.select('[data-upsell-choice=morse]','cranberry:500:1');
  await page.$eval('[data-upsell-add=morse]',el=>el.click());
  await page.$eval('[data-product-options] label:last-of-type input',el=>el.click());
  const variant=await page.$eval('[data-product-options] input[type=radio]:checked',el=>({value:Number(el.value),price:Number(el.dataset.price)}));
  await page.$eval('[data-option-increase]',el=>el.click());
  assert.equal(await page.$eval('[data-option-price]',el=>Number(el.textContent.replace(/\D/g,''))),variant.price*2);
  const oldUrl=page.url();await page.$eval('[data-option-link]',el=>el.click());assert.equal(page.url(),oldUrl);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pirogorsk-selection')));
  assert.deepEqual(saved,[{id:'cranberry',value:500,quantity:1},{id:supplier.id,value:variant.value,quantity:2}]);
  assert.match(await page.$eval('[data-addon-selection]',el=>el.textContent),/\(3\)/);
  assert.match(await page.$eval('[data-option-selection]',el=>el.textContent),/3 шт/);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-product-options] input[type=radio]:checked + span')).color==='rgb(255, 255, 255)');
  if([390,768].includes(width)){await page.$eval('[data-product-options]',el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:`${root}/product-options-${width}.jpg`,type:'jpeg',quality:85});}
  await page.reload({waitUntil:'networkidle0'});assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pirogorsk-selection'))),saved);
  await page.$eval('[data-product-options] label:last-of-type input',el=>el.click());
  await page.$eval('[data-option-quantity]',el=>{el.value='99';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.$eval('[data-option-increase]',el=>el.disabled),true);
  assert.equal(await page.$eval('[data-option-price]',el=>Number(el.textContent.replace(/\D/g,''))),variant.price*99);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`quantity 99 overflow ${width}`);
  assert.ok(await page.$eval('[data-option-price]',el=>el.scrollWidth<=el.clientWidth),`quantity 99 price clipped ${width}`);
  await page.$eval('[data-option-link]',el=>el.click());assert.match(await page.$eval('[data-option-feedback]',el=>el.textContent),/заполнена/);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('pirogorsk-selection'))),saved,'full variant never overwrites selection');
  const recommendations=await page.$('.product-recommendations');assert.ok(recommendations);
  await recommendations.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  await page.waitForFunction(()=>[...document.querySelectorAll('.recommendation-art img')].every(img=>img.complete&&img.naturalWidth>0));
  if([390,768].includes(width))await page.screenshot({path:`${root}/recommendations-${width}.jpg`,type:'jpeg',quality:85});
  if(width<600){const moved=await page.$eval('.recommendation-grid',el=>{el.scrollLeft=300;return el.scrollWidth>el.clientWidth;});assert.ok(moved);}
  flows.push(`${width}: product variant × 2 + morse, totals, in-page save, reload, 99 limit + no overwrite, recommendation artwork/scroll`);
  await context.close();
 }
 const fallbackContext=await browser.createBrowserContext(),fallbackPage=await fallbackContext.newPage();await fallbackPage.setViewport({width:390,height:844});await visit(fallbackPage,catalogProductHref(supplier));
 await fallbackPage.$eval('[data-product-options] label:last-of-type input',el=>el.click());
 const fallbackVariant=await fallbackPage.$eval('[data-product-options] input:checked',el=>Number(el.value));
 await fallbackPage.$eval('[data-option-quantity]',el=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await fallbackPage.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('QA storage denied','QuotaExceededError');};});
 await Promise.all([fallbackPage.waitForNavigation({waitUntil:'networkidle0'}),fallbackPage.$eval('[data-option-link]',el=>el.click())]);
 assert.equal(new URL(fallbackPage.url()).pathname,'/');assert.equal(await fallbackPage.$eval('#selection-dialog',el=>el.open),true);
 assert.deepEqual(await fallbackPage.evaluate(()=>JSON.parse(localStorage.getItem('pirogorsk-selection'))),[{id:supplier.id,value:fallbackVariant,quantity:3}]);
 flows.push('main product storage failure transfers exact format × 3 through existing URL fallback');await fallbackContext.close();
 const context=await browser.createBrowserContext(),page=await context.newPage();await page.setJavaScriptEnabled(false);await page.setViewport({width:390,height:844});await visit(page,catalogProductHref(supplier));
 const fallback=await page.$eval('[data-option-link]',el=>el.getAttribute('href'));assert.equal(new URL(fallback,origin).searchParams.get('interest'),supplier.id);assert.ok(await page.$eval('[data-option-quantity-control]',el=>el.hidden));assert.ok(await page.$('.recommendation-card'));flows.push('no-JS product fallback + recommendations');await context.close();
 assert.deepEqual(errors,[]);console.log(`PASS: ${results.length} responsive views, ${flows.length} functional groups, no JS/HTTP errors`);
}finally{await writeFile(`${root}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),production,results,flows,errors},null,2)+'\n');await browser.close();await chrome.kill();}
