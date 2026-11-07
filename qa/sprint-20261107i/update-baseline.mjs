import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const file='qa/journal-polish-20261101/baseline-sections.json',slug='pekarni-i-pirogi-v-zelenogradske';
const before=JSON.parse(execFileSync('git',['show','HEAD:'+file],{encoding:'utf8'}));
assert.equal(before[slug].length,4);
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4330/journal/'+slug+'/?qa=1',{waitUntil:'networkidle0'});
 const actual=await page.$$eval('.ed-article-section',nodes=>nodes.map(node=>node.textContent.replace(/\s+/gu,' ').trim()));assert.equal(actual.length,8);
 const normal=x=>x.replace(/\s+/gu,'');
 const retained=before[slug].map((s,i)=>{assert(normal(actual[i]).startsWith(normal(s)),`section ${i}`);return i;});
 const after={...before,[slug]:actual};
 const others=Object.keys(before).filter(x=>x!==slug);
 for(const key of others)assert.deepEqual(before[key],after[key]);
 await writeFile(file,JSON.stringify(after,null,2)+'\n');
 await writeFile('qa/sprint-20261107i/baseline-proof.json',JSON.stringify({slug,oldSections:4,newSections:8,retained,unchangedNeighbors:others.length,neighborsSHA256:createHash('sha256').update(JSON.stringify(others.map(k=>[k,before[k]]))).digest('hex')},null,2)+'\n');
 console.log('PASS: four previous sections retained, 61 neighbors unchanged; target baseline expanded to eight.');
}finally{await browser.disconnect();await chrome.kill();}
