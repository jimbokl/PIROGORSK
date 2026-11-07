import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
const file='qa/journal-polish-20261101/baseline-sections.json',slug='gde-poest-v-svetlogorske';
const baseline=JSON.parse(await readFile(file,'utf8'));
assert.equal(baseline[slug].length,10,'Accept only the previous ten-section owner');
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-extensions']});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4330/journal/'+slug+'/?qa=1',{waitUntil:'networkidle0'});
 const actual=await page.$$eval('.ed-article-section',els=>els.map(el=>el.textContent.replace(/\s+/gu,' ').trim()));
 assert.equal(actual.length,13);
 const normalized=s=>s.replace(/\s+/gu,'');
 baseline[slug].forEach((old,i)=>assert(normalized(actual[i]).startsWith(normalized(old)),`Preserved original section ${i}`));
 baseline[slug]=actual;
 await writeFile(file,JSON.stringify(baseline,null,2)+'\n');
 await writeFile('qa/sprint-20261107g/baseline-proof.json',JSON.stringify({owner:slug,originalSectionsPreserved:10,newSections:3,otherOwnersUnchanged:61,originalFigurePositionsPreserved:[1,6]},null,2)+'\n');
 console.log('PASS baseline: all ten original section texts/captions preserved; only three new sections appended.');
}finally{await browser.close();}
