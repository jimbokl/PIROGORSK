import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const slug='sloenoe-ili-drozhzhevoe-testo';
const baselinePath='qa/journal-polish-20261101/baseline-sections.json';
const baseRef='5de409d5ea265da8e5be05935d7119a23f853909';
const head=p=>JSON.parse(execFileSync('git',['show',`${baseRef}:${p}`],{encoding:'utf8'}));
const baseline=head(baselinePath),original=head('src/data/semantic-articles.json'),current=JSON.parse(await readFile('src/data/semantic-articles.json','utf8'));
const oldUpdates=head('src/data/article-updates.json'),updates=JSON.parse(await readFile('src/data/article-updates.json','utf8'));
assert.deepEqual(current.filter(x=>x.slug!==slug),original.filter(x=>x.slug!==slug));
assert.deepEqual(current.find(x=>x.slug===slug).sections,original.find(x=>x.slug===slug).sections);
assert.deepEqual(updates.slice(0,-1),oldUpdates);
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith('http://127.0.0.1:4330/')?r.continue():r.abort());
 await page.goto(`http://127.0.0.1:4330/journal/${slug}/`,{waitUntil:'networkidle0'});
 const sections=await page.$$eval('.ed-article-section',els=>els.map(e=>e.textContent.replace(/\s+/g,' ').trim()));
 assert.equal(sections.length,9);assert.equal(baseline[slug].length,6);
 const norm=s=>s.replace(/\s/g,'');
 baseline[slug].forEach((text,i)=>assert(norm(sections[i]).startsWith(norm(text)),`Original section ${i+1}`));
 const next={...baseline,[slug]:sections};
 for(const [key,value] of Object.entries(baseline))if(key!==slug)assert.deepEqual(next[key],value);
 await writeFile(baselinePath,JSON.stringify(next,null,2)+'\n');
 await writeFile('qa/sprint-20261107k/baseline-proof.json',JSON.stringify({semanticNeighborsPreserved:current.length-1,priorUpdatesPreserved:oldUpdates.length,originalTargetSectionsPreserved:6,baselineNeighborsPreserved:Object.keys(baseline).length-1,updatedTargetSections:9},null,2)+'\n');
 console.log('PASS: 29 semantic neighbours, 9 prior updates, original 6 target sections and 61 baseline neighbours preserved; target baseline 9 sections.');
}finally{await browser.disconnect();await chrome.kill();}
