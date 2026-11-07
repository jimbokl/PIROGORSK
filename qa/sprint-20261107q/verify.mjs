import assert from 'node:assert/strict';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import {writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:4330',stage=new URL(base).hostname==='pirogorsk.ru'?'production':'local',out='qa/sprint-20261107q';
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const report={base,widths:[],errors:[],postRequests:[]};
try{
 const page=await browser.newPage();await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);page.on('pageerror',e=>report.errors.push(e.message));
 await page.setRequestInterception(true);page.on('request',r=>{const u=new URL(r.url());if(r.method()!=='GET'){report.postRequests.push({method:r.method(),url:r.url()});r.abort();}else if(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(base).origin)r.abort();else r.continue();});
 const go=path=>page.goto(base+path+'?qa=1',{waitUntil:'networkidle0'});
 const click=async selector=>{await page.$eval(selector,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.click(selector);};
 for(const width of [320,390,768,1024,1440]){
  await page.setViewport({width,height:900});const row={width,emptyNavigation:[]};
  for(const path of ['/','/menu/']){
   await go(path);await page.evaluate(()=>localStorage.removeItem('pirogorsk-selection'));await page.reload({waitUntil:'networkidle0'});await click('.masthead-selection');
   await page.$eval('#selection-dialog [data-go-catalog]',e=>e.focus());await page.keyboard.press('Enter');
   await page.waitForFunction(()=>!document.querySelector('#selection-dialog').open&&!document.activeElement.closest('dialog'),{timeout:3000}).catch(async e=>{console.log(JSON.stringify({path,width,debug:await page.evaluate(()=>({open:document.querySelector('#selection-dialog').open,active:document.activeElement.outerHTML.slice(0,400),dest:document.querySelector('[data-menu-finder], #pirogi')?.outerHTML.slice(0,100)}))}));throw e;});
   const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,inCatalog:!!document.activeElement.closest('[data-menu-finder], #pirogi'),input:document.activeElement.matches('input,textarea,select')}));
   assert(focus.inCatalog&&!focus.input,JSON.stringify(focus));row.emptyNavigation.push({path,...focus});
  }
  const seeded=await page.evaluate(()=>{const products=JSON.parse(document.querySelector('#catalog-data').textContent),long=[...products].sort((a,b)=>b.name.length-a.name.length)[0];const items=[{id:long.id,value:long.defaultVariant,quantity:99},{id:'meat',value:500,quantity:98}];localStorage.setItem('pirogorsk-selection',JSON.stringify(items));return items;});
  await page.reload({waitUntil:'networkidle0'});await click('.masthead-selection');await page.evaluate(()=>document.fonts.ready);
  const geometry=await page.$eval('#selection-dialog',d=>({overflow:d.scrollWidth>d.clientWidth+1,rows:[...d.querySelectorAll('[data-item]')].map(e=>{const r=e.getBoundingClientRect(),h=e.querySelector('h3').getBoundingClientRect(),m=e.querySelector('.item-meta').getBoundingClientRect(),p=e.querySelector('[data-item-price]').getBoundingClientRect();return {title:e.querySelector('h3').textContent,titleWidth:h.width,rowWidth:r.width,priceBelowTitle:p.top>=h.bottom-1,priceFits:p.right<=m.right+1,controlSizes:[...e.querySelectorAll('.item-controls button')].map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))};})}));
  assert(!geometry.overflow);for(const r of geometry.rows){assert(r.titleWidth>=r.rowWidth*.95&&r.priceBelowTitle&&r.priceFits);assert(r.controlSizes.every(b=>b.width>=44&&b.height>=44));}row.geometry=geometry;
  const increase='[data-item="meat-500"] [data-increase]';await click(increase);assert.equal(await page.$eval(increase,e=>e.getAttribute('aria-disabled')),'true');
  await page.$eval(increase,e=>e.focus());await page.keyboard.press('Space');
  assert.equal(await page.$eval('[data-item="meat-500"] output',e=>e.textContent),'99');assert(await page.$eval(increase,e=>e===document.activeElement));assert.match(await page.$eval('[data-selection-feedback]',e=>e.textContent),/99/);row.limit99={quantityUnchanged:true,inlineFeedback:true,focusPreserved:true};
  await click('[data-item="meat-500"] [data-decrease]');assert.equal(await page.$eval(increase,e=>e.getAttribute('aria-disabled')),'false');
  if([320,390,768].includes(width))await page.screenshot({path:`${out}/${stage}-selection-${width}.png`});
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new DOMException('Denied by QA','NotAllowedError');}}}));
  row.copyFallback=[];
  for(const [button,field] of [['[data-share-selection]','[data-share-fallback]'],['[data-copy]','[data-copy-fallback]']]){
   await click(button);await page.waitForFunction(selector=>!document.querySelector(selector).hidden,{},field);
   const f=await page.$eval(field,e=>({font:parseFloat(getComputedStyle(e).fontSize),focused:e===document.activeElement,selected:e.selectionStart===0&&e.selectionEnd===e.value.length,readonly:e.readOnly,value:e.value,inViewport:e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().bottom<=innerHeight+1}));
   assert(f.font>=16&&f.focused&&f.selected&&f.readonly&&f.inViewport);assert(f.value.includes(button==='[data-share-selection]'?new URL(base).origin:'https://pirogorsk.ru/'));if(button==='[data-copy]')assert(f.value.includes('Мясной пирог')&&f.value.includes('98'));delete f.value;row.copyFallback.push({button,...f});
  }
  if([390,768].includes(width))await page.screenshot({path:`${out}/${stage}-copy-${width}.png`});
  await click('.selection-city');await click('#city-dialog [data-select-city="Калининград"]');await page.waitForFunction(()=>document.querySelector('#selection-dialog').open&&!document.querySelector('#city-dialog').open);
  assert.equal(await page.$eval('#selection-dialog [data-city]',e=>e.textContent),'Калининград');
  const totals=await page.$eval('#selection-dialog',d=>{const n=s=>Number(d.querySelector(s).textContent.replace(/\D/g,''));return {products:n('[data-total]'),delivery:n('[data-selection-delivery]'),grand:n('[data-selection-grand-total]')};});
  const expected=await page.evaluate(items=>{const products=JSON.parse(document.querySelector('#catalog-data').textContent);return items.reduce((sum,i)=>sum+products.find(p=>p.id===i.id).prices[i.value]*i.quantity,0);},seeded);
  assert.equal(totals.products,expected);assert.equal(totals.grand,totals.products+totals.delivery);row.cityAndTotals={city:'Калининград',...totals};
  await click('[data-order]');await page.waitForFunction(()=>document.querySelector('#interest-dialog').open);row.interestOpened=true;await page.keyboard.press('Escape');
  await page.evaluate(()=>{localStorage.removeItem('pirogorsk-selection');localStorage.removeItem('pirogorsk-city');});report.widths.push(row);
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.postRequests,[]);
 await writeFile(`${out}/${stage}-focused.json`,JSON.stringify(report,null,2)+'\n');console.log(`PASS ${stage}: five widths, home/menu keyboard destination, full-width names, 99-limit feedback/focus, denied-clipboard fallbacks16px, city/totals once and interest dialog; no submissions/errors.`);
}finally{await browser.disconnect();await chrome.kill();}
