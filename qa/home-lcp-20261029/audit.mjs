import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { writeFile } from 'node:fs/promises';
const [url='https://pirogorsk.ru/', label='before', count='3'] = process.argv.slice(2);
const summaries=[];
const chrome=await launch({chromePath:process.env.LCP_CHROME || undefined,chromeFlags:['--headless=new','--disable-extensions']});
const originOf=url=>{try{return new URL(url).origin;}catch{return 'unattributable';}};
try {
 for(let i=1;i<=Number(count);i++) {
  const r=await lighthouse(url,{port:chrome.port,logLevel:'error',output:'json',onlyCategories:['performance'],additionalTraceCategories:['cc','viz','renderer.scheduler','disabled-by-default-cc.debug']});
  await writeFile(`qa/home-lcp-20261029/raw/${label}-${i}.json`,r.report);
  if(r.artifacts?.Trace) await writeFile(`qa/home-lcp-20261029/raw/${label}-${i}-trace.json`,JSON.stringify(r.artifacts.Trace));
  const a=r.lhr.audits;
  const s={run:i,url,timestamp:r.lhr.fetchTime,version:r.lhr.lighthouseVersion,performance:r.lhr.categories.performance.score*100,
   metrics:Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(k=>[k,a[k].numericValue])),
   observed:a.metrics.details.items[0],environment:r.lhr.environment,
   lcp:a['lcp-breakdown-insight'].details?.items,
   mainThread:a['mainthread-work-breakdown']?.details?.items,
   longTasks:a['long-tasks']?.details?.items?.map(({url,startTime,duration})=>({origin:originOf(url),startTime,duration})),
   criticalRequests:a['network-requests'].details.items.filter(x=>/pirogorsk.ru|127.0.0.1/.test(x.url)).filter(x=>x.rendererStartTime<3000).map(({url,rendererStartTime,networkRequestTime,networkEndTime,resourceSize,priority,resourceType})=>({path:new URL(url).pathname,rendererStartTime,networkRequestTime,networkEndTime,resourceSize,priority,resourceType}))};
  summaries.push(s);
  console.log(JSON.stringify(s));
  await writeFile(`qa/home-lcp-20261029/${label}-summary.json`,JSON.stringify(summaries,null,2)+'\n');
 }
}finally{await chrome.kill();}
