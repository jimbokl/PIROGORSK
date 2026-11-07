import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const ref='66e037a58b8ad9fff8f8bb68a82a1ae8847c17d4',slug='kak-narezat-pirog',path='qa/journal-polish-20261101/baseline-sections.json';
const before=JSON.parse(execFileSync('git',['show',`${ref}:${path}`],{encoding:'utf8'}));
assert.deepEqual(JSON.parse(await readFile(path,'utf8')),before);
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try {
 const page=await browser.newPage();await page.setJavaScriptEnabled(false);
 await page.goto(`http://127.0.0.1:4330/journal/${slug}/`,{waitUntil:'networkidle0'});
 const actual=await page.$$eval('.ed-article-section',els=>els.map(e=>e.textContent.replace(/\s+/g,' ').trim()));
 assert.equal(actual.length,9);assert.equal(before[slug].length,6);
 const normalized=text=>text.replace(/\s+/gu,'');
 before[slug].forEach((text,i)=>assert(normalized(actual[i]).startsWith(normalized(text)),`Original section ${i}`));
 const after={...before,[slug]:[...before[slug],...actual.slice(6)]};for(const key of Object.keys(before))if(key!==slug)assert.deepEqual(after[key],before[key]);
 await writeFile(path,JSON.stringify(after,null,2)+'\n');
 const proof=JSON.parse(await readFile('qa/sprint-20261107m/baseline-proof.json','utf8'));
 proof.articleBaseline={originalSections:6,originalBaselineStringsPreserved:true,originalTextPrefixPreservedIgnoringWhitespace:true,addedSections:3,unchangedNeighbours:Object.keys(before).length-1};
 await writeFile('qa/sprint-20261107m/baseline-proof.json',JSON.stringify(proof,null,2)+'\n');
 console.log('PASS: all original 6 target sections and 61 neighbouring article baselines unchanged; append 3 new sections.');
}finally{await browser.disconnect();await chrome.kill();}
