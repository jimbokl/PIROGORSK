import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';
const [url='https://pirogorsk.ru/?qa=1',label='observe-before']=process.argv.slice(2);
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];
try {
 for(const delayed of ['none','fonts','golos','playfair']) {
  const context=await browser.createBrowserContext(); const page=await context.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:1.75,isMobile:true,hasTouch:true});
  await page.setCacheEnabled(false);
  const cdp=await page.createCDPSession();
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1600000/8,uploadThroughput:750000/8});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.setRequestInterception(true);
  page.on('request',async request=>{
   if(request.resourceType()==='font'&&(delayed==='fonts'||request.url().includes(delayed)))await new Promise(r=>setTimeout(r,2000));
   await request.continue().catch(()=>{});
  });
  await page.evaluateOnNewDocument(()=>{
   window.__lcpProbe={lcp:[],shifts:[],geometry:[],fonts:[]};
   const selector=e=>e?.matches('.tasting-coast img')?'coast':e?.matches('.tasting-scene img')?'pie':e?.tagName;
   const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.__lcpProbe.lcp.push({time:e.startTime,render:e.renderTime,load:e.loadTime,size:e.size,path:e.url?new URL(e.url).pathname:'',element:selector(e.element),rect:rect(e.element)});}).observe({type:'largest-contentful-paint',buffered:true});
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__lcpProbe.shifts.push({time:e.startTime,value:e.value,sources:e.sources?.map(s=>({element:selector(s.node),before:s.previousRect.toJSON(),after:s.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});
   document.fonts.addEventListener('loadingdone',e=>window.__lcpProbe.fonts.push({time:performance.now(),fonts:e.fontfaces.map(f=>f.family)}));
   document.addEventListener('DOMContentLoaded',()=>{
    for(const sel of ['.tasting-hero','.tasting-coast img','.tasting-copy h1']){
     const el=document.querySelector(sel); if(el)new ResizeObserver(()=>window.__lcpProbe.geometry.push({time:performance.now(),selector:sel,rect:rect(el)})).observe(el);
    }
   });
  });
  await page.goto(url,{waitUntil:'load',timeout:45000});
  await new Promise(r=>setTimeout(r,4000));
  const data=await page.evaluate(()=>({...window.__lcpProbe,resources:performance.getEntriesByType('resource').filter(e=>/fonts\/|background.CF7|pie.CiX/.test(e.name)).map(e=>({path:new URL(e.name).pathname,start:e.startTime,end:e.responseEnd,size:e.encodedBodySize})),coast:(()=>{const e=document.querySelector('.tasting-coast img');return {src:new URL(e.currentSrc).pathname,naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight};})(),media:{coarse:matchMedia('(pointer:coarse)').matches,reduced:matchMedia('(prefers-reduced-motion)').matches}}));
  results.push({delayed,url,timestamp:new Date().toISOString(),...data});
  console.log(JSON.stringify({delayed,lcp:data.lcp,fonts:data.fonts,geometry:data.geometry}));
  await writeFile(`qa/home-lcp-20261029/${label}.json`,JSON.stringify(results,null,2)+'\n');
  await context.close();
 }
}finally{await browser.close();}
