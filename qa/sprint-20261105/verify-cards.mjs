import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const base=process.env.QA_BASE||'http://127.0.0.1:4330';
const stage=process.env.QA_BASE?'production':'local';
const out='qa/sprint-20261105';
const report={stage,base,pages:[],cards:[],errors:[]};
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions','--no-first-run']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 const page=await browser.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.setRequestInterception(true);
 page.on('request',r=>{const u=new URL(r.url());if(r.method()!=='GET'||(['http:','https:'].includes(u.protocol)&&u.origin!==new URL(base).origin))r.abort();else r.continue();});
 const settle=async selector=>{for(let i=0;i<3;i++){await page.$eval(selector,e=>e.scrollIntoView({block:'center',behavior:'instant'}));await new Promise(r=>setTimeout(r,100));}};
 for(const width of[320,390,768,1024,1440]){
  await page.setViewport({width,height:1000,deviceScaleFactor:1});
  for(const path of['/','/menu/']){
   await page.goto(base+path+'?qa=1',{waitUntil:'networkidle0'});
   await page.evaluate(()=>document.fonts.ready);
   // A fresh navigation clears the in-memory selection as well as persisted state.
   await page.evaluate(()=>localStorage.removeItem('pirogorsk-selection'));
   await page.reload({waitUntil:'networkidle0'});
   await page.$$eval('[data-home-more],[data-supplier-more]',buttons=>buttons.forEach(b=>{while(!b.hidden)b.click();}));
   const root=path==='/'?'.home-feed-card':'.menu-feed [data-supplier-id], .menu-feed [data-feed-id]';
   const ids=await page.$$eval(root,els=>els.map(e=>e.dataset.product||e.dataset.supplierId||e.dataset.feedId));
   assert.equal(ids.length,154);assert.equal(new Set(ids).size,154);
   const choices=await page.$$eval(root,els=>{
    const name=e=>e.querySelector('h3,h4')?.textContent||'';
    const available=els.filter(e=>e.querySelector('.menu-quantity:not([hidden])'));
    const longest=[...available].sort((a,b)=>name(b).length-name(a).length)[0];
    const three=available.find(e=>e.querySelectorAll('.catalog-purchase label').length>=3);
    const picnic=available.find(e=>/пикник-сет/.test(name(e)));
    return [...new Set([els[0],longest,three,picnic].filter(Boolean))].map((e,i)=>{e.dataset.sprintProbe=String(i);return {probe:i,name:name(e),id:e.dataset.product||e.dataset.supplierId||e.dataset.feedId};});
   });
   for(const choice of choices){
    const sel=`[data-sprint-probe="${choice.probe}"]`;
    await settle(sel);
    const rect=()=>page.$eval(sel,e=>{const b=e.getBoundingClientRect(),a=e.querySelector('[data-add],[data-feed-add],[data-supplier-link]').getBoundingClientRect();return {height:b.height,buttonY:a.top-b.top,buttonHeight:a.height};});
    const before=await rect();
    const unit=await page.$eval(sel+' [data-price],'+sel+' [data-feed-price-label],'+sel+' [data-supplier-price]',e=>Number(e.textContent.replace(/\D/g,'')));
    const states=[];
    for(const count of[2,99,1]){
     await page.$eval(sel+' [data-feed-quantity]',(e,n)=>{e.value=String(n);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},count);
     const after=await rect();
     assert.ok(Math.abs(before.height-after.height)<1,`${path}/${choice.id}/${width} height changes ${before.height} -> ${after.height}`);
     assert.ok(Math.abs(before.buttonY-after.buttonY)<1,`${path}/${choice.id}/${width} button moves`);
     const price=await page.$eval(sel+' [data-price],'+sel+' [data-feed-price-label],'+sel+' [data-supplier-price]',e=>Number(e.textContent.replace(/\D/g,'')));
     assert.equal(price,unit*count,`${choice.id} total`);
     assert.equal(await page.$eval(sel+' [data-feed-increase]',e=>e.disabled),count===99);
     const boxes=await page.$eval(sel,e=>{const a=e.querySelector('[data-price],[data-feed-price-label],[data-supplier-price]').getBoundingClientRect(),q=e.querySelector('.menu-quantity').getBoundingClientRect(),p=e.querySelector('.catalog-purchase').getBoundingClientRect();return {priceRight:a.right,priceBottom:a.bottom,qtyLeft:q.left,qtyTop:q.top,qtyBottom:q.bottom,panelRight:p.right,controls:[...e.querySelectorAll('.menu-quantity button')].map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height];})};});
     // Side-by-side price and counter must never overlap, including six-digit totals.
     assert.ok(boxes.priceBottom<=boxes.qtyTop||boxes.qtyBottom<=boxes.priceBottom-28||boxes.priceRight<=boxes.qtyLeft+1,`${choice.id} price/counter collision`);
     assert.ok(boxes.priceRight<=boxes.panelRight,`${choice.id} price outside panel`);
     assert.ok(boxes.controls.every(([w,h])=>w>=44&&h>=44),`${path}/${choice.id}/${width}: targets ${JSON.stringify(boxes.controls)}`);states.push({quantity:count,price,...after});
    }
    const formats=await page.$$eval(sel+' .catalog-purchase input[type=radio]',els=>els.map(e=>e.value));
    for(const value of formats){await page.$eval(sel+' .catalog-purchase input[type=radio]',(e,v)=>{const r=[...e.closest('fieldset').querySelectorAll('input')].find(r=>r.value===v);r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));},value);assert.equal(await page.$eval(sel+' .catalog-purchase input:checked',e=>e.value),value);}
    await page.focus(sel+' [data-feed-increase]');await page.keyboard.press('Enter');
    assert.equal(await page.$eval(sel+' [data-feed-quantity]',e=>e.value),'2');
    if(choice.probe===0){
     await settle(sel);await page.screenshot({path:`${out}/${stage}-${path==='/'?'home':'menu'}-cards-${width}.png`});
     const add=sel+' [data-add],'+sel+' [data-feed-add],'+sel+' [data-supplier-link]';await page.click(add);
     const selection=await page.evaluate(()=>JSON.parse(localStorage.getItem('pirogorsk-selection')||'[]'));
     assert.equal(selection.find(x=>x.id===choice.id)?.quantity,2,'add exact selected quantity');
    }
    report.cards.push({path,width,...choice,states,formats});
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${path} overflow ${width}`);
   report.pages.push({path,width,catalogCount:ids.length});
  }
  for(const path of['/delivery/','/zelenogradsk/','/pirogi/pirog-s-tvorogom-i-malinoy/','/catalog/baltiyskiy-piknik-set/','/journal/']){
   const response=await page.goto(base+path+'?qa=1',{waitUntil:'networkidle0'});assert.equal(response.status(),200,path);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${path} overflow ${width}`);
   assert.equal(await page.$$eval('h1',els=>els.length),1);
   report.pages.push({path,width});
  }
 }
 assert.deepEqual(report.errors,[]);
 console.log(`${stage}: ${report.pages.length} page views, ${report.cards.length} representative cards, quantity/format/add/overflow PASS`);
}finally{await fs.writeFile(`${out}/${stage}-cards-report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();await chrome.kill();}
