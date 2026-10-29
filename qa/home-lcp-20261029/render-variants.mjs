// Diagnostic A/B: same cached production document, fresh Chrome/profile per run.
// Assets and Metrica still use their original production URLs. Only the named
// document mutation differs; these scores are not public PSI measurements.
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';

const url = 'https://pirogorsk.ru/';
const original = await (await fetch(url)).text();
const variants = {
  baseline: html => html,
  layers: html => html.replace('</head>', `<style>@media(max-width:760px){
    .tasting-hero{isolation:auto}.tasting-coast{z-index:0}
    .tasting-stage{z-index:1}.tasting-wave{z-index:0}
  }</style></head>`),
  async: html => html.replace('decoding="sync"', 'decoding="async"'),
  fonts: html => html.replace('</head>', '<style>:root{--sans:Arial,sans-serif;--serif:Georgia,serif}</style></head>'),
  contained: html => html.replace('</head>', '<style>main>section:not(:first-child){content-visibility:auto;contain-intrinsic-size:auto 1000px}</style></head>'),
  noFonts: html => html.replace(/<link\b[^>]*\bas="font"[^>]*>/g, '').replace('</head>', '<style>:root{--sans:Arial,sans-serif;--serif:Georgia,serif}</style></head>'),
  noPreloads: html => html.replace(/<link\b[^>]*\bas="font"[^>]*>/g, ''),
  cyrillic: html => html.replace(/<link\b[^>]*href="\/fonts\/(?:playfair|golos)-latin\.woff2"[^>]*>/g, ''),
  optional: html => html.replaceAll('font-display:swap', 'font-display:optional'),
  noScripts: html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''),
  bare: html => html.replace(/<section class="catalog\b[\s\S]*?<\/main>/, '</main>'),
};
const plan = (process.env.LCP_VARIANTS || 'baseline,layers,async,fonts,fonts,async,layers,baseline,baseline,layers,async,fonts').split(',');
const rows = [];
for (const [i, variant] of plan.entries()) {
  if (!variants[variant]) throw new Error(`Unknown variant ${variant}`);
  const chrome = await launch({chromePath:process.env.LCP_CHROME,chromeFlags:['--headless=new','--disable-extensions']});
  const browser = await puppeteer.connect({browserURL:`http://localhost:${chrome.port}`,defaultViewport:null});
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame() && request.url() === url) {
        void request.respond({status:200,contentType:'text/html; charset=utf-8',body:variants[variant](original)});
      } else void request.continue().catch(() => {});
    });
    const r = await lighthouse(url, {port:chrome.port,logLevel:'error',output:'json',onlyCategories:['performance'],
      throttlingMethod:'devtools',throttling:{cpuSlowdownMultiplier:6.27,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0}}, undefined, page);
    const label = `render-${process.env.LCP_LABEL || 'variants'}-${i+1}-${variant}`;
    await writeFile(`qa/home-lcp-20261029/raw/${label}.json`,r.report);
    await writeFile(`qa/home-lcp-20261029/raw/${label}-trace.json`,JSON.stringify(r.artifacts.Trace));
    const m = r.lhr.audits.metrics.details.items[0];
    const breakdown = Object.fromEntries(r.lhr.audits['lcp-breakdown-insight'].details.items.find(x=>x.type==='table').items.map(x=>[x.subpart,x.duration]));
    const row = {label,variant,timestamp:r.lhr.fetchTime,browser:r.lhr.environment.hostUserAgent,
      observed:{fcp:m.observedFirstContentfulPaint,lcp:m.observedLargestContentfulPaint},breakdown,
      tbt:r.lhr.audits['total-blocking-time'].numericValue,cls:r.lhr.audits['cumulative-layout-shift'].numericValue};
    rows.push(row); console.log(JSON.stringify(row));
    await writeFile(`qa/home-lcp-20261029/render-${process.env.LCP_LABEL || 'variants'}-summary.json`,JSON.stringify(rows,null,2)+'\n');
  } finally {await browser.disconnect();await chrome.kill();}
}
