import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const slug='gde-pozavtrakat-v-zelenogradske',ref='fa33528';
const path='qa/journal-polish-20261101/baseline-sections.json';
const original=p=>JSON.parse(execFileSync('git',['show',`${ref}:${p}`],{encoding:'utf8'}));
const baseline=original(path),updates=JSON.parse(await readFile('src/data/article-updates.json','utf8')),before=original('src/data/article-updates.json');
assert.deepEqual(updates.filter(x=>!x.ownerURL.includes(slug)),before.filter(x=>!x.ownerURL.includes(slug)));
assert.equal(before.find(x=>x.ownerURL.includes(slug)).sections.length,2);
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 const page=await browser.newPage();await page.setJavaScriptEnabled(false);
 await page.goto('http://127.0.0.1:4330/journal/'+slug+'/',{waitUntil:'networkidle0'});
 const sections=await page.$$eval('.ed-article-section',els=>els.map(e=>e.textContent.replace(/\s+/g,' ').trim()));
 assert.equal(sections.length,10);assert.equal(baseline[slug].length,8);
 // Deliberate fact corrections are recorded in the source diff and evidence ledger.
 // Preserve all eight section positions; only the hotel heading changes to explain the broken source.
 const headings=await page.$$eval('.ed-article-section h2',els=>els.map(e=>e.textContent.trim()));
 const kept=['Куда идти в зависимости от времени','Завтра’К 7:45: если ищете кафе до девяти','Бранч на море: завтрак у пирса до полудня','Берег Моря: что изменилось на сайте отеля','Как посчитать завтрак на двоих','Перед прогулкой или поездкой','Ещё два утренних окна: «Гранд Монополь» и «Ривьера»','Как выбрать время до прогулки по Зеленоградску'];
 assert.deepEqual(headings.slice(0,8),kept);
 const next={...baseline,[slug]:sections};
 for(const [k,v] of Object.entries(baseline))if(k!==slug)assert.deepEqual(next[k],v);
 await writeFile(path,JSON.stringify(next,null,2)+'\n');
 await writeFile('qa/sprint-20261107l/baseline-proof.json',JSON.stringify({baselineRef:ref,priorSections:8,currentSections:10,baselineNeighborsPreserved:Object.keys(baseline).length-1,otherUpdateOwnersPreserved:before.length-1,intentionalFactCorrections:'See src/data/breakfast-guide.ts diff and research/content-sprint-20261107l/README.md; no claim of byte-identical target text.'},null,2)+'\n');
 console.log('PASS: 61 baseline neighbours and 9 other update owners unchanged; target baseline explicitly refreshed 8→10 after dated source corrections.');
}finally{await browser.disconnect();await chrome.kill();}
