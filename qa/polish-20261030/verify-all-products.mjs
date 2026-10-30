import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import {catalog} from '../../src/data/catalog.ts';
import {catalogProductHref} from '../../src/lib/product-paths.ts';
import {productPage} from '../../src/data/product-pages.ts';
const production=process.argv.includes('--production'), origin=production?'https://pirogorsk.ru':'http://127.0.0.1:4322';
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run']});
const browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
const queue=catalog.flatMap(product=>[390,768].map(width=>({product,width}))),results=[],errors=[];
assert.equal(catalog.length,153);
try {
  await Promise.all(Array.from({length:2},async()=>{
    const page=await browser.newPage();
    await page.setCacheEnabled(false);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(new URL(r.url()).origin===origin&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    for(let task;(task=queue.shift());){
      const {product,width}=task;
      await page.setViewport({width,height:1000,isMobile:true,hasTouch:true});
      const response=await page.goto(`${origin}${catalogProductHref(product)}?qa=1`,{waitUntil:'domcontentloaded',timeout:45000});
      assert.equal(response.status(),200);
      await page.waitForFunction(()=>document.querySelector('[data-option-quantity-control]')?.hidden===false);
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>[...document.querySelectorAll('.product-hero-art img')].every(img=>img.complete&&img.naturalWidth>0));
      await page.$eval('[data-product-options] label:last-of-type input',el=>el.click());
      await page.$eval('[data-option-increase]',el=>el.click());
      const result=await page.evaluate(()=>({
        name:document.querySelector('h1').textContent,h1s:document.querySelectorAll('h1').length,
        overflow:document.documentElement.scrollWidth>innerWidth,
        clipped:[...document.querySelectorAll('h1,[data-option-price],[data-option-link]')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent),
        quantity:Number(document.querySelector('[data-option-quantity]').value),
        price:Number(document.querySelector('[data-option-price]').textContent.replace(/\D/g,'')),
        buttons:[...document.querySelectorAll('[data-option-quantity-control] button,[data-option-link]')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})),
      }));
      assert.equal(result.name,product.kind==='pie'?product.name:productPage(product).heading,`${product.id}/${width} title`);assert.equal(result.h1s,1);assert.equal(result.overflow,false,`${product.id}/${width} overflow`);
      assert.deepEqual(result.clipped,[],`${product.id}/${width} clipped text`);assert.equal(result.quantity,2);
      assert.equal(result.price,product.variants.at(-1).price*2,`${product.id}/${width} price`);
      assert.ok(result.buttons.every(b=>b.width>=44&&b.height>=44),`${product.id}/${width} touch target`);
      results.push({id:product.id,path:catalogProductHref(product),width,price:result.price,passed:true});
    }
    await page.close();
  }));
  assert.equal(results.length,306);assert.deepEqual(errors,[]);
  console.log('PASS: all 153 product pages × phone/tablet = 306 views, artwork, titles, prices, formats, quantity and touch targets');
} finally {
  await writeFile(`qa/polish-20261030/all-products-${production?'production':'local'}.json`,JSON.stringify({checkedAt:new Date().toISOString(),origin,results:results.sort((a,b)=>a.id.localeCompare(b.id)||a.width-b.width),errors},null,2)+'\n');
  await browser.close();await chrome.kill();
}
