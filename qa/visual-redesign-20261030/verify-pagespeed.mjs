import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import {writeFile} from 'node:fs/promises';
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const reports=[];
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:1100});
 await page.goto('https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fpirogorsk.ru%2F&form_factor=mobile',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>[...document.links].some(a=>a.href.includes('scorecalc/#')&&a.href.includes('LCP=')),{timeout:300000,polling:2000});
 const reportUrl=new URL(page.url());
 for(const device of ['mobile','desktop']){
  if(device==='desktop'){
   reportUrl.searchParams.set('form_factor',device);await page.goto(reportUrl.href,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>[...document.links].some(a=>a.href.includes('scorecalc/#')&&a.href.includes('device=desktop')),{timeout:300000,polling:2000});
  }
  const data=await page.evaluate(()=>({url:location.href,text:document.body.innerText,calculators:[...document.links].filter(a=>a.href.includes('scorecalc')).map(a=>a.href),gauges:[...document.querySelectorAll('.lh-gauge__percentage,.lh-gauge__label')].map(e=>e.textContent)}));
  reports.push({device,...data});await page.screenshot({path:new URL(`./pagespeed-${device}.png`,import.meta.url).pathname,fullPage:true});
  console.log(device,data.url,data.calculators,data.gauges);
 }
 await writeFile(new URL('./public-psi-raw.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),reports},null,2));
}finally{await browser.close();await chrome.kill()}
