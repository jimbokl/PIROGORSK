import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import {writeFile,mkdir} from 'node:fs/promises';
const out=process.env.PSI_OUTPUT_DIR||'qa/performance-20261107';
await mkdir(out,{recursive:true});
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:1100});
 await page.goto('https://pagespeed.web.dev/',{waitUntil:'networkidle2',timeout:45000});
 const initial=await page.evaluate(()=>({url:location.href,inputs:[...document.querySelectorAll('input')].map(x=>({type:x.type,placeholder:x.placeholder,label:x.getAttribute('aria-label')})),buttons:[...document.querySelectorAll('button')].map(x=>x.textContent.trim())}));
 await writeFile(`${out}/public-ui-initial.json`,JSON.stringify(initial,null,2)+'\n');console.log(JSON.stringify(initial));
 const inputs=await page.$$('input');let input;
 for(const e of inputs){if(await e.evaluate(el=>el.type==='url'||/web page|URL|веб|адрес/i.test(el.placeholder+' '+el.getAttribute('aria-label')))){input=e;break;}}
 if(!input)throw new Error('No observed URL input');
 await input.type('https://pirogorsk.ru/',{delay:15});
 const buttons=await page.$$('button');let analyze;
 for(const b of buttons){if(await b.evaluate(el=>/^(Analyze|Анализировать)$/i.test(el.textContent.trim()))){analyze=b;break;}}
 if(!analyze)throw new Error('No observed Analyze button');
 await analyze.click();
 const started=Date.now();let state;
 while(Date.now()-started<180000){
  state=await page.evaluate(()=>({url:location.href,text:document.body.innerText}));
  await writeFile(`${out}/public-ui-progress.json`,JSON.stringify({checkedAt:new Date().toISOString(),elapsedMs:Date.now()-started,...state},null,2)+'\n');
  if(/Largest Contentful Paint/.test(state.text)&&/Speed Index/.test(state.text)&&!/^Analyzing/.test(state.text))break;
  if(/Unable to resolve|Unable to analyze|Не удалось|quota exceeded/i.test(state.text))break;
  await new Promise(resolve=>setTimeout(resolve,4000));
 }
 await page.screenshot({path:`${out}/public-ui-result.png`,fullPage:true});
 await writeFile(`${out}/public-ui-result.json`,JSON.stringify({checkedAt:new Date().toISOString(),elapsedMs:Date.now()-started,...state},null,2)+'\n');
 console.log(JSON.stringify({url:state.url,elapsedMs:Date.now()-started,text:state.text.slice(0,5200)}));
}finally{await browser.close();await chrome.kill();}
