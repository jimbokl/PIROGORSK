import puppeteer from 'puppeteer-core';
import {launch} from 'chrome-launcher';
import {mkdir,writeFile} from 'node:fs/promises';
const chrome=await launch({chromeFlags:['--headless=new','--no-sandbox','--disable-gpu']});
const browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
const routes=['/menu/','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/','/pirogi/myasnoy-pirog/','/povody/','/podbor/','/about/'];
await mkdir('qa/polish-20261030/before',{recursive:true});const results=[];
try {for(const width of [390,768,1280])for(const path of routes){const page=await browser.newPage();await page.setViewport({width,height:900});await page.goto(`http://127.0.0.1:4322${path}?qa=1`,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);const key=path.replaceAll('/','_')||'home';await page.screenshot({path:`qa/polish-20261030/before/${key}-${width}.jpg`,type:'jpeg',quality:75,fullPage:true});results.push({path,width,...await page.evaluate(()=>({title:document.title,h1:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,product:document.querySelector('.product-options')?.getBoundingClientRect().toJSON(),hero:document.querySelector('.product-hero,.town-hero')?.getBoundingClientRect().toJSON()}))});await page.close();}await writeFile('qa/polish-20261030/baseline.json',JSON.stringify(results,null,2));console.log(results);}finally{await browser.close();await chrome.kill();}
