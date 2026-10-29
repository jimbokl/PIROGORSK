import puppeteer from 'puppeteer-core';
import {launch} from 'chrome-launcher';
const chrome=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
try {
 const page=await browser.newPage();
 for(const width of [390,1280]) {
  await page.setViewport({width,height:980,deviceScaleFactor:1});
  for(const [name,route] of [['meat','/pirogi/myasnoy-pirog/'],['holland','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/'],['tableware','/catalog/nabor-posudy/']]){
   await page.goto(`http://127.0.0.1:4322${route}?qa=1`,{waitUntil:'networkidle0'});
   await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:`qa/product-detail-style-20261029/before-${name}-${width}.png`});
  }
 }
} finally {await browser.close();await chrome.kill();}
