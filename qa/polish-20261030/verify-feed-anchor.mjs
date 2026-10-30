import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const production=process.argv.includes('--production');
const origin=production?'https://pirogorsk.ru':'http://127.0.0.1:4322';
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run']});
const browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
try {
  const page=await browser.newPage(); await page.setViewport({width:1280,height:900});
  await page.goto(`${origin}/menu/?qa=1`,{waitUntil:'networkidle0'});
  await page.type('#menu-search','вишн'); await page.click('[data-menu-reset]');
  await page.click('#holland [data-supplier-filter=dough]');
  const top=()=>page.$eval('#holland [data-supplier-filter=all]',el=>el.getBoundingClientRect().top);
  const before=await top();
  await page.click('#holland [data-supplier-filter=all]');
  await page.waitForFunction(()=>document.querySelector('#pirogi39 [data-supplier-more]').hidden);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const after=await top();
  assert.ok(before>=0&&after>=0&&after<900,'the controls stay visible');
  assert.ok(Math.abs(before-after)<2,`later section shifted by ${after-before}px`);
  assert.equal(await page.$eval('#holland [data-supplier-filter=all]',el=>el.getAttribute('aria-pressed')),'true');
  await writeFile(`qa/polish-20261030/feed-anchor-${production?'production':'local'}.json`,JSON.stringify({checkedAt:new Date().toISOString(),origin,width:1280,before,after,passed:true},null,2)+'\n');
  console.log(`PASS: earlier feed batches preserve later controls (${before} → ${after}px), real pointer clicks work`);
} finally {await browser.close();await chrome.kill();}
