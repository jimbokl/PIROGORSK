import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const production=process.argv.includes('--production');
const origin='https://pirogorsk.ru',site=resolve('site');
const output=resolve('qa/delivery-premium-20261030',production?'production':'local');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.jpg':'image/jpeg'};
const axe=await readFile('node_modules/axe-core/axe.min.js','utf8');
const results=[],flows=[],errors=[],failed=[],inventory=[];
const disclaimer=/Изображение концепта|Внешний вид[^<]{0,100}предстоит утвердить|иллюстрации концептов|Обложк[^<]{0,60}создан[^<]{0,40}ИИ|Иллюстрация[^<]{0,80}(?:концепта|помощью ИИ)|Авторская иллюстрация\. Комплектацию|Меню, цены(?: и изображения предварительные|, изображения и варианты)/iu;
async function inspect(dir){for(const file of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,file.name);if(file.isDirectory())await inspect(path);else if(file.name.endsWith('.html')){const html=await readFile(path,'utf8');assert.ok(!disclaimer.test(html),`Visual disclaimer: ${path}`);inventory.push(path.slice(site.length));}}}
if(!production)await inspect(site);
await mkdir(output,{recursive:true});
const chrome=await launch({chromeFlags:['--headless=new','--no-first-run','--disable-extensions']});
const browser=await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
async function pageFor(width){
 const context=await browser.createBrowserContext(),page=await context.newPage();
 await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:width<700,hasTouch:width<1100});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)failed.push(`${response.status()} ${response.url()}`);});
 await page.setRequestInterception(true);
 page.on('request',async request=>{const url=new URL(request.url());try{
  if(url.protocol==='data:')return await request.continue();
  if(url.origin==='https://mc.yandex.ru')return await request.respond({status:200,body:''});
  assert.equal(url.origin,origin);assert.equal(request.method(),'GET','No real form submissions');
  if(production)return await request.continue();
  const path=resolve(site,`.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/')?'index.html':''}`);
  assert.ok(path.startsWith(site+sep));await request.respond({status:200,contentType:types[extname(path)]||'application/octet-stream',body:await readFile(path)});
 }catch(error){failed.push(`${url.href}: ${error.message}`);await request.abort();}});
 return {context,page};
}
async function check(page,path,width){
 await page.goto(`${origin}${path}?qa=1`,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
 const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,canonical:document.querySelector('link[rel=canonical]').href,text:document.body.innerText}));
 assert.equal(state.overflow,false,`${path}@${width}: overflow`);assert.equal(state.h1,1);assert.ok(!disclaimer.test(state.text));delete state.text;
 await page.evaluate(axe);const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
 results.push({path,width,...state,violations});assert.deepEqual(violations,[],`${path}@${width}: accessibility`);
}
try{
 for(const width of [320,390,768,1024,1280,1536]){
  const {context,page}=await pageFor(width);await check(page,'/delivery/',width);
  await page.waitForFunction(()=>[...document.querySelectorAll('.delivery-hero-visual img')].every(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:`${output}/delivery-${width}.jpg`,type:'jpeg',quality:85,fullPage:true});
  await page.screenshot({path:`${output}/delivery-hero-${width}.jpg`,type:'jpeg',quality:85});
  const geometry=await page.evaluate(()=>({
   cards:[...document.querySelectorAll('.delivery-city-card')].map(card=>{const h=card.querySelector('h3').getBoundingClientRect(),p=card.querySelector('.delivery-city-bottom').getBoundingClientRect();return {city:card.dataset.deliveryCity,headingTop:h.top,headingRight:h.right,priceLeft:p.left,priceBottom:p.bottom,height:card.getBoundingClientRect().height};}),
   buttons:[...document.querySelectorAll('.delivery-button,.delivery-text-link,summary')].map(b=>b.getBoundingClientRect().height),
  }));
  assert.ok(geometry.buttons.every(height=>height>=44));
  if(width>760){assert.ok(Math.max(...geometry.cards.map(c=>c.headingTop))-Math.min(...geometry.cards.map(c=>c.headingTop))<2);assert.ok(Math.max(...geometry.cards.map(c=>c.priceBottom))-Math.min(...geometry.cards.map(c=>c.priceBottom))<2);}
  else assert.ok(geometry.cards.every(c=>c.headingRight<=c.priceLeft+1));
  await page.click('.delivery-hero .delivery-button');assert.equal(new URL(page.url()).hash,'#delivery-cities');
  assert.ok(await page.$eval('#delivery-cities',el=>el.getBoundingClientRect().top>=0&&el.getBoundingClientRect().top<100));
  for(let i=0;i<5;i++){const summary=(await page.$$('summary'))[i];await summary.click();assert.equal(await summary.evaluate(el=>el.parentElement.open),true);await summary.click();}
  const summary=await page.$('summary');await summary.focus();await page.keyboard.press('Enter');assert.equal(await summary.evaluate(el=>el.parentElement.open),true);await page.keyboard.press('Enter');
  await page.screenshot({path:`${output}/delivery-cities-${width}.jpg`,type:'jpeg',quality:85});
  const cityButton=width<=1000?'.masthead-city--mobile':'.masthead-city--desktop';
  await page.click(cityButton);assert.equal(await page.$eval('#city-dialog',d=>d.open),true);
  await page.click('[data-select-city="Калининград"]');assert.equal(await page.$eval('#city-dialog',d=>d.open),false);
  assert.equal(await page.$eval(`${cityButton} [data-city]`,el=>el.textContent),'Калининград');
  flows.push({width,geometry,anchor:true,faqPointerAndKeyboard:true,headerCity:true});
  for(const slug of ['kaliningrad','zelenogradsk','svetlogorsk']){await page.goto(`${origin}/delivery/?qa=1`,{waitUntil:'networkidle0'});await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click(`[data-delivery-city="${slug}"]`)]);assert.equal(new URL(page.url()).pathname,`/${slug}/`);}
  await context.close();
 }
 for(const width of [390,1280]){
  const {context,page}=await pageFor(width);
  for(const path of ['/','/menu/','/blog/','/about/','/pirogi/myasnoy-pirog/','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/','/catalog/nabor-posudy/','/journal/skolko-piroga-na-cheloveka/','/journal/gde-poest-v-zelenogradske/','/zelenogradsk/'])await check(page,path,width);
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log(`UI ${production?'production':'local'} PASS: ${results.length} page/viewport checks; six delivery flows, 18 city transitions, keyboard FAQ, aligned cards, no overflow, JS/HTTP errors or automated WCAG A/AA violations. ${inventory.length} HTML files scanned.`);
}finally{
 await writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),production,results,flows,inventory,errors,failed},null,2)+'\n');
 await browser.close();await chrome.kill();
}
