import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import {writeFile} from 'node:fs/promises';
const target='https://pirogorsk.ru/delivery/';
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const attempts=[];
try {
 const page=await browser.newPage();await page.setViewport({width:1440,height:1100});
 for(const device of ['mobile','desktop']){
  try {
   await page.goto(`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(target)}&form_factor=${device}`,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(device=>[...document.links].some(a=>a.href.includes('scorecalc/#')&&a.href.includes(`device=${device}`))||/Не удалось перейти по адресу|Unable to resolve|Lighthouse returned error|Something went wrong/i.test(document.body.innerText),{timeout:180000,polling:1000},device);
   const result=await page.evaluate(()=>({url:location.href,text:document.body.innerText,calculators:[...document.links].filter(a=>a.href.includes('scorecalc')).map(a=>a.href),gauges:[...document.querySelectorAll('.lh-gauge__percentage,.lh-gauge__label')].map(e=>e.textContent)}));
   const success=result.calculators.some(h=>h.includes(`device=${device}`));
   attempts.push({device,success,...result});
   await page.screenshot({path:new URL(`./pagespeed-${device}.png`,import.meta.url).pathname,fullPage:true});
   console.log(JSON.stringify({device,success,url:result.url,calculators:result.calculators}));
  }catch(error){attempts.push({device,success:false,error:error.message});console.log(`${device}: ${error.message}`);}
 }
}finally{
 await writeFile(new URL('./public-psi.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),target,attempts},null,2)+'\n');
 await browser.close();await chrome.kill();
}
if(!attempts.every(a=>a.success))process.exitCode=1;
