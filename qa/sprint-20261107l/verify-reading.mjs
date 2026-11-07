import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const base=process.env.QA_BASE||'http://127.0.0.1:4330',stage=process.env.QA_BASE?'production':'local';
const updates=JSON.parse(await readFile('src/data/article-updates.json','utf8'));
const owners=[...updates.map(x=>x.ownerURL),'/journal/skolko-piroga-na-cheloveka/','/journal/pirogi-na-kofe-breyk/','/journal/sladkie-pirogi-k-chayu/'];
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);
 page.on('request',r=>r.isNavigationRequest()&&new URL(r.url()).origin===new URL(base).origin?r.continue():r.abort());
 await page.goto(base+'/blog/',{waitUntil:'domcontentloaded'});
 const cards=await page.$$eval('.blog-card a',els=>Object.fromEntries(els.map(a=>[new URL(a.href).pathname,Number(a.querySelector('.blog-card-meta').textContent.match(/≈\s*(\d+)\s*мин/)[1])])));
 const rows=[];
 for(const owner of owners){
  assert(cards[owner],`Card minutes for ${owner}`);await page.goto(base+owner,{waitUntil:'domcontentloaded'});
  const article=await page.$$eval('.blog-byline',els=>els.map(e=>e.textContent).find(x=>/мин чтения/.test(x)));
  const minutes=Number(article?.match(/≈\s*(\d+)\s*мин чтения/)?.[1]);
  assert.equal(minutes,cards[owner],`Reading estimate differs: ${owner}`);
  rows.push({owner,cardMinutes:cards[owner],articleMinutes:minutes});
 }
 const target=rows.find(x=>x.owner==='/journal/gde-pozavtrakat-v-zelenogradske/');assert(target.cardMinutes>3);
 await writeFile(new URL(`./${stage}-reading.json`,import.meta.url),JSON.stringify({stage,rows},null,2)+'\n');
 console.log(`PASS ${stage}: all ${rows.length} updated owners show identical reading time on cards and articles; target ${target.cardMinutes} min.`);
}finally{await browser.disconnect();await chrome.kill();}
