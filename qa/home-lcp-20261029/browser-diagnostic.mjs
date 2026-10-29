// Diagnostic only. Scores are not comparable to standard Lighthouse/PSI.
// The page, requests and analytics stay unchanged; one launcher feature differs.
import lighthouse from 'lighthouse';
import { launch, Launcher } from 'chrome-launcher';
import { readFile, writeFile } from 'node:fs/promises';

const executable=process.env.LCP_CHROME;
if(!executable) throw new Error('Set LCP_CHROME to the browser under investigation');
const reverse=process.argv.includes('--reverse');
const results=reverse?JSON.parse(await readFile('qa/home-lcp-20261029/browser-diagnostic-summary.json','utf8')):[];
const offset=results.length;
for(const [index,control] of (reverse?[true,false,true,false]:[false,true,false,true]).entries()) {
 const defaults=Launcher.defaultFlags();
 const flags=control?defaults.map(flag=>flag.startsWith('--disable-features=')?
  '--disable-features='+flag.slice('--disable-features='.length).split(',').filter(x=>x!=='RenderDocument').join(','):flag):defaults;
 if(control) flags.push('--enable-features=RenderDocument');
 flags.push('--headless=new');
 const chrome=await launch({chromePath:executable,ignoreDefaultFlags:true,chromeFlags:flags});
 try {
  const r=await lighthouse('https://pirogorsk.ru/',{port:chrome.port,logLevel:'error',output:'json',onlyCategories:['performance'],
   throttlingMethod:'devtools',throttling:{cpuSlowdownMultiplier:6.27,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0},
   additionalTraceCategories:['cc','viz','renderer.scheduler','disabled-by-default-cc.debug']});
  const label=`browser-${offset+index+1}-${control?'render-document':'stock'}`;
  await writeFile(`qa/home-lcp-20261029/raw/${label}.json`,r.report);
  await writeFile(`qa/home-lcp-20261029/raw/${label}-trace.json`,JSON.stringify(r.artifacts.Trace));
  const m=r.lhr.audits.metrics.details.items[0];
  const s={label,url:r.lhr.finalDisplayedUrl,timestamp:r.lhr.fetchTime,environment:r.lhr.environment,flags,
   settings:r.lhr.configSettings,observed:{fcp:m.observedFirstContentfulPaint,lcp:m.observedLargestContentfulPaint,load:m.observedLoad,dcl:m.observedDomContentLoaded},
   lcp:r.lhr.audits['lcp-breakdown-insight'].details.items,
   tbt:r.lhr.audits['total-blocking-time'].numericValue};
  results.push(s);console.log(JSON.stringify(s));
  await writeFile('qa/home-lcp-20261029/browser-diagnostic-summary.json',JSON.stringify(results,null,2)+'\n');
 } finally {await chrome.kill();}
}
