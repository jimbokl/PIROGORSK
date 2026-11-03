import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {launch} from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const output='qa/stageshow-cards-20261103', origin='https://pirogorsk.ru';
const stage=process.env.QA_BASE?'production':'local';
const report={stage,destinations:0,pages:0,views:[],errors:[]};
const baseline=JSON.parse(await readFile(`${output}/link-baseline.json`,'utf8'));
for(const [path,before] of Object.entries(baseline)){
 const html=await readFile(resolve('site',path),'utf8');
 const tags=[...html.matchAll(/<a\b([^>]*class="scene-card"[^>]*)>/g)];
 const actual=tags.map(m=>m[1].match(/href="([^"]*)"/)?.[1]);
 assert.deepEqual(actual,before,`${path}: preserve ordered destinations`);
 for(const href of actual){const path=new URL(href,origin).pathname;await access(resolve('site','.'+decodeURIComponent(path),'index.html'));}
 report.destinations+=actual.length;report.pages++;
}
const c=await launch({chromeFlags:['--headless=new','--disable-extensions']});
const b=await puppeteer.connect({browserURL:`http://localhost:${c.port}`});
const p=await b.newPage(),cache=new Map();
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
await p.setRequestInterception(true);
p.on('pageerror',e=>report.errors.push(e.message));
p.on('request',async r=>{
 if(r.url().startsWith('data:'))return r.continue();
 if(!r.url().startsWith(origin+'/')||r.method()!=='GET')return r.abort();
 const path=new URL(r.url()).pathname;
 try{
  if(!cache.has(path)){
   if(process.env.QA_BASE){const response=await fetch(process.env.QA_BASE+path);assert(response.ok,`${response.status} ${path}`);cache.set(path,{status:200,contentType:response.headers.get('content-type')||'',body:Buffer.from(await response.arrayBuffer())});}
   else cache.set(path,{status:200,contentType:types[extname(path)]||'text/html',body:await readFile(resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':'')))});
  }
  await r.respond(cache.get(path));
 }catch(e){report.errors.push(e.message);await r.abort();}
});
const go=path=>p.goto(origin+path+'?qa=1',{waitUntil:'networkidle0'});
const ready=()=>p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.scene-card img')].map(img=>{img.loading='eager';return img.decode()}));});
const sample=['/','/menu/','/journal/dostavka-edy-v-zelenogradske/','/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/','/nabor/piknik-u-morya/','/zelenogradsk/'];
const scroll=selector=>p.$eval(selector,e=>e.scrollIntoView({block:'start',behavior:'instant'}));
try{
 await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 for(const width of [320,390,768,1280])for(const path of sample){
  await p.setViewport({width,height:1000});await go(path);await ready();
  const metrics=await p.evaluate(()=>{
   const cards=[...document.querySelectorAll('.scene-card')];
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,cards:cards.map(e=>{
    const title=e.querySelector('.scene-card-title'),img=e.querySelector('img'),r=e.getBoundingClientRect();
    return {href:e.getAttribute('href'),compact:e.classList.contains('scene-card--compact'),title:title.textContent,titleSize:parseFloat(getComputedStyle(title).fontSize),fullTitle:title.scrollHeight<=title.clientHeight+1&&getComputedStyle(title).webkitLineClamp==='none',image:img.complete&&img.naturalWidth>0,naturalWidth:img.naturalWidth,width:r.width,height:r.height,top:r.top,overflow:e.scrollWidth>e.clientWidth+1,actionY:e.querySelector('.scene-card-action').getBoundingClientRect().bottom-r.top};
   })};
  });
  assert(metrics.cards.length>0);assert(!metrics.overflow,`${path} ${width}: page overflow`);
  assert(metrics.cards.every(e=>e.image&&e.fullTitle&&!e.overflow&&e.titleSize>=(e.compact?16:24)),`${path} ${width}: readable, decoded cards`);
  for(const group of await p.$$eval('.ed-link-grid',es=>es.map(e=>[...e.querySelectorAll('.scene-card')].map(c=>{const r=c.getBoundingClientRect();return{top:r.top,height:r.height,action:c.querySelector('.scene-card-action').getBoundingClientRect().bottom};})))){
   for(const a of group)for(const b of group)if(Math.abs(a.top-b.top)<1){assert(Math.abs(a.height-b.height)<1);assert(Math.abs(a.action-b.action)<1,'action baseline aligned');}
  }
  if(path==='/'||path==='/menu/'){
   assert.equal(await p.$$eval('[data-product], [data-menu-product], [data-supplier-id]',es=>new Set(es.map(e=>e.dataset.product||e.dataset.feedId||e.dataset.supplierId)).size),154,'full product assortment');
   const links=metrics.cards.filter(c=>c.compact);assert.equal(links.length,3);assert(links.every(e=>e.href.endsWith('?pg_channel=scenario')));
   await scroll('.scenario-entries');
   if(width<600){
    const rail=await p.$eval('.scenario-rail',e=>({scrollable:e.scrollWidth>e.clientWidth,height:e.offsetHeight}));assert(rail.scrollable);
    // Every intermediate card must be fully revealed, including partially visible ones.
    await p.$eval('.scenario-rail a',e=>e.focus());
    for(const [index,back] of [[0,false],[1,false],[2,false],[1,true],[0,true]]){
     if(back)await p.keyboard.down('Shift');
     if(index || back)await p.keyboard.press('Tab');
     if(back)await p.keyboard.up('Shift');
     await p.waitForFunction(i=>{const e=document.querySelectorAll('.scenario-rail a')[i],r=e.getBoundingClientRect(),rail=e.parentElement.getBoundingClientRect();return e===document.activeElement&&r.left>=rail.left&&r.right<=rail.right+1;},{timeout:5000},index);
    }
    await p.keyboard.press('Tab');await p.keyboard.press('Tab');
    const last=await p.$eval('.scenario-rail a:last-child',e=>{const r=e.getBoundingClientRect(),rail=e.parentElement.getBoundingClientRect();return{focused:e===document.activeElement,visible:r.left>=rail.left&&r.right<=rail.right+1,outline:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth};});
    assert(last.focused&&last.visible&&last.outline==='solid'&&last.width==='3px','last card visible and focused');
    await p.screenshot({path:`${output}/${stage}-${path==='/'?'home':'menu'}-focus-${width}.png`});
    await p.$eval('.scenario-rail',e=>{e.scrollLeft=0;});await p.$eval('.scenario-rail a',e=>e.blur());
   }else assert(Math.max(...links.map(x=>x.height))-Math.min(...links.map(x=>x.height))<1);
   await p.screenshot({path:`${output}/${stage}-${path==='/'?'home':'menu'}-${width}.png`});
  }
  if(path===sample[2]){
   await scroll('.ed-links-section');await p.screenshot({path:`${output}/${stage}-article-${width}.png`});
   await p.$$eval('.ed-links-section',es=>es.at(-1).scrollIntoView({block:'start',behavior:'instant'}));await p.screenshot({path:`${output}/${stage}-related-${width}.png`});
  }
  report.views.push({path,width,...metrics});
 }
 // Full mobile link activation and query attribution with scripts disabled.
 await p.setJavaScriptEnabled(false);await p.setViewport({width:390,height:1000});await go('/');await ready();
 await p.$eval('.scenario-rail a:nth-child(2)',e=>e.focus());
 await Promise.all([p.waitForNavigation({waitUntil:'networkidle0'}),p.keyboard.press('Enter')]);
 assert.equal(new URL(p.url()).pathname,'/nabor/piknik-u-morya/');assert.equal(new URL(p.url()).searchParams.get('pg_channel'),'scenario');
 await go(sample[2]);await p.$eval('.ed-link-grid a',e=>e.focus());
 await Promise.all([p.waitForNavigation({waitUntil:'networkidle0'}),p.keyboard.press('Enter')]);assert.equal(new URL(p.url()).pathname,'/zelenogradsk/');report.noJS=true;
 await p.setJavaScriptEnabled(true);
 // Real hover should move only art and arrow, never the card's geometry.
 await p.setViewport({width:1280,height:1000});await go('/');await ready();await scroll('.scenario-entries');
 await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);await p.mouse.move(1279,999);
 const bounds=()=>p.$eval('.scenario-rail a',e=>{const r=e.getBoundingClientRect();return{width:r.width,height:r.height,top:r.top,left:r.left};});
 const before=await bounds();const first=await p.$('.scenario-rail a');await first.hover();await new Promise(r=>setTimeout(r,650));
 assert.deepEqual(await bounds(),before,'hover geometry fixed');
 const motion=await p.$eval('.scenario-rail a',e=>({art:getComputedStyle(e.querySelector('img')).transform,arrow:getComputedStyle(e.querySelector('.scene-card-arrow')).transform}));assert.notEqual(motion.art,'none');
 await p.screenshot({path:`${output}/${stage}-hover-1280.png`});
 await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 const reduced=await p.$eval('.scenario-rail a',e=>({art:getComputedStyle(e.querySelector('img')).transform,arrow:getComputedStyle(e.querySelector('.scene-card-arrow')).transform,transition:getComputedStyle(e).transitionDuration}));assert.deepEqual(reduced,{art:'none',arrow:'none',transition:'0s'});
 report.hover={before,motion,reduced};
 assert.deepEqual(report.errors,[]);await writeFile(`${output}/${stage}-report.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`PASS ${stage}: ${report.destinations} links across ${report.pages} pages; ${report.views.length} responsive views; decoded images, aligned actions, rail/focus/keyboard, no-JS, hover and reduced motion.`);
}finally{await b.close();await c.kill();}
