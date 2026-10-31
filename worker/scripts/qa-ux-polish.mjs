import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { catalog } from '../../src/data/catalog.ts';
import { readCompositionLink } from '../../src/lib/selection-tools.ts';
const base = process.env.QA_BASE || 'http://127.0.0.1:4322';
const stage = process.env.QA_STAGE || 'local';
const output = process.env.QA_OUTPUT || new URL('../dist/ux-polish/', import.meta.url).pathname;
await mkdir(output, {recursive:true});
const origin = 'https://pirogorsk.ru';
const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.ico':'image/x-icon'};
const chrome = await launch({chromeFlags:['--headless=new','--disable-extensions']});
const browser = await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`});
const results=[];
try {
 for (const width of [320,390,768,1024,1280]) {
  const context=await browser.createBrowserContext(); const page=await context.newPage();
  await page.setViewport({width,height:960});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request',async req=>{
   if(req.url().startsWith('data:')) return req.continue();
   if(!req.url().startsWith(origin+'/') || req.method()!=='GET') return req.abort();
   try {
    const path=new URL(req.url()).pathname;
    if(base.startsWith('http://127.0.0.1')) {
     const file=resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':''));
     await req.respond({status:200,contentType:types[extname(file)]||'application/octet-stream',body:await readFile(file)});
    } else {
     const res=await fetch(base+path); if(!res.ok) errors.push(`${res.status} ${path}`);
     await req.respond({status:res.status,contentType:res.headers.get('content-type')||'',body:Buffer.from(await res.arrayBuffer())});
    }
   } catch(e) {errors.push(e.message);await req.abort();}
  });
  await page.evaluateOnNewDocument(()=>{
   window.__goals=[]; window.ym=(...args)=>{if(args[1]==='reachGoal')window.__goals.push({name:args[2],params:args[3]});};
   localStorage.setItem('pirogorsk-city','Калининград');
   Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.__denyClipboard)throw Error('denied');window.__copied=text;}}});
  });
  const click=async selector=>{await page.$eval(selector,el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.click(selector);};
  const goals=()=>page.evaluate(()=>window.__goals);
  await page.goto(origin+'/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/',{waitUntil:'networkidle0'});
  assert.equal((await goals()).filter(g=>g.name==='product_view').length,1);
  assert.equal((await goals()).filter(g=>g.name==='city_select').length,0,'storage hydration is silent');
  await page.$eval('[data-select-city="Светлогорск"]',el=>el.click());
  await page.$eval('[data-select-city="Светлогорск"]',el=>el.click());
  assert.equal((await goals()).filter(g=>g.name==='city_select').length,1,'only explicit changed city');
  await page.evaluate(()=>{localStorage.setItem('pirogorsk-selection',JSON.stringify([{id:'meat',value:500,quantity:2}]));window.dispatchEvent(new Event('focus'));});
  await click('.masthead-selection');
  assert.match(await page.$eval('[data-order]',el=>el.textContent),/Отметить интерес/);
  await click('[data-increase]');await click('[data-decrease]');
  await click('[data-copy]');
  const copied=await page.evaluate(()=>window.__copied);
  assert.match(copied,/Открыть эту подборку: https:\/\/pirogorsk.ru\/#selection=/);
  const link=copied.split('Открыть эту подборку: ')[1];
  const restored=readCompositionLink(new URL(link).hash,catalog).composition;
  assert.deepEqual(restored.items,[{id:'meat',value:500,quantity:2}]);
  assert(!JSON.stringify(restored).includes('price'),'link contains no prices');
  await page.evaluate(()=>window.__denyClipboard=true);await click('[data-copy]');
  assert.equal(await page.$eval('[data-copy-fallback]',el=>document.activeElement===el&&el.selectionStart===0&&el.selectionEnd===el.value.length),true);
  await click('[data-guest-tools] summary');
  if(width<=390) assert(await page.$eval('.guest-drink select',el=>el.clientWidth>200),'long flavor receives full row');
  await click('[data-order]');await click('[data-interest-submit]');
  assert.equal(await page.$eval('#interest-day',el=>el.getAttribute('aria-invalid')),'true');
  assert.equal(await page.$eval('#interest-website',el=>el.tabIndex),-1);
  const ax = await page.createCDPSession();
  const tree = await ax.send('Accessibility.getFullAXTree');
  assert(!tree.nodes.some(n=>!n.ignored&&n.name?.value==='Ваш сайт'),'honeypot absent from accessibility tree');
  await ax.detach();
  if([390,768].includes(width)) await page.screenshot({path:output+stage+'-form-'+width+'.png'});
  await page.keyboard.press('Escape');
  if(!await page.$eval('#selection-dialog',el=>el.open)) await click('.masthead-selection');
  await click('[data-remove]');
  const events=await goals();
  assert(events.some(g=>g.name==='catalog_add'&&g.params.source==='selection'&&g.params.qty===1));
  assert(events.some(g=>g.name==='catalog_remove'&&g.params.source==='selection'&&g.params.qty===1));
  assert(events.some(g=>g.name==='catalog_remove'&&g.params.source==='selection'&&g.params.qty===2));
  await page.evaluate(()=>{localStorage.setItem('pirogorsk-selection',JSON.stringify([{id:'meat',value:500,quantity:99}]));window.dispatchEvent(new Event('focus'));});
  const beforeLimit=(await goals()).length;
  await page.$eval('[data-increase]',el=>el.click());
  assert.equal((await goals()).length,beforeLimit,'99 limit emits no goal');
  await page.evaluate(()=>localStorage.removeItem('pirogorsk-selection'));
  await page.goto(origin+'/osetinskie-pirogi/?qa=1',{waitUntil:'networkidle0'});
  assert.equal(await page.$$eval('[data-feed-id]',els=>els.length),28);
  const card='[data-feed-id]:first-child';
  await click(card+' [data-feed-increase]');await click(card+' [data-feed-add]');
  const firstId=await page.$eval(card,el=>el.dataset.feedId);
  assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('pirogorsk-selection')).find(i=>i.id===id).quantity,firstId),2);
  assert.equal((await goals()).length,0,'QA page suppresses events');
  await page.evaluate(async ()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('[data-feed-id] .product-artwork-subject img')].slice(0,2).map(img=>img.decode()));});
  assert.equal(await page.$$eval('[data-feed-id] .product-artwork-subject img',imgs=>imgs.length),28,'every supplier pie has a subject layer');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1),'hub does not overflow');
  if([390,768,1280].includes(width)) await page.screenshot({path:output+stage+'-hub-'+width+'.png'});
  const count=await page.$$eval('[data-feed-id] a.menu-feed-art',els=>new Set(els.map(el=>el.pathname)).size);
  assert.equal(count,28);
  await page.setJavaScriptEnabled(false);await page.reload({waitUntil:'networkidle0'});
  assert.equal(await page.$$eval('[data-feed-id] a[data-feed-add]',els=>els.filter(el=>new URL(el.href).searchParams.has('interest')).length),28);
  assert.deepEqual(errors,[]);
  results.push({width,hubItems:count,analyticsAndCopy:'PASS',noJS:'PASS',errors});
  await context.close();
 }
 await writeFile(output+stage+'-functional.json',JSON.stringify({base,results},null,2));
 console.log(JSON.stringify({stage,results}));
} finally {await browser.disconnect();await chrome.kill();}
