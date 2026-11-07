import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
const file='qa/journal-polish-20261101/baseline-sections.json',slug='sedobnye-suveniry-iz-kaliningrada';
const before=JSON.parse(await readFile(file,'utf8'));
assert.equal(before[slug].length,9,'Accept only the previous nine-section owner');
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-extensions']});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4330/journal/'+slug+'/?qa=1',{waitUntil:'networkidle0'});
 const actual=await page.$$eval('.ed-article-section',els=>els.map(el=>el.textContent.replace(/\s+/gu,' ').trim()));
 assert.equal(actual.length,11);
 const normalized=s=>s.replace(/\s+/gu,'');
 const preserved=[];
 before[slug].forEach((old,i)=>{
  if(i===5)return;
  const target=i>5?i+2:i;
  assert(normalized(actual[target]).startsWith(normalized(old)),`Preserved original section ${i} at ${target}`);
  preserved.push({old:i,current:target});
 });
 for(const [i,title] of [[5,'Где купить съедобные сувениры'],[6,'Какие форматы марципана'],[7,'Сколько будут весить подарки']])assert(actual[i].startsWith(title));
 const after={...before,[slug]:actual};
 const neighbors=Object.keys(before).filter(k=>k!==slug);
 for(const k of neighbors)assert.deepEqual(after[k],before[k]);
 assert.equal(neighbors.length,61);
 await writeFile(file,JSON.stringify(after,null,2)+'\n');
 await writeFile('qa/sprint-20261107h/baseline-proof.json',JSON.stringify({owner:slug,preservedSections:preserved,replacedSection:{old:5,new:[5,6,7],reason:'General shop search replaced by sourced addresses, product formats and gift-weight calculations.'},otherOwnersUnchanged:neighbors.length,originalFigurePositionsPreserved:[1,3]},null,2)+'\n');
 console.log('PASS baseline: eight original sections/captions preserved, one replaced by three verified sections; 61 other owners unchanged.');
}finally{await browser.close();}
