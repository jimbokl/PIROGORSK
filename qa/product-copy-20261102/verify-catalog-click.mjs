import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { verifyCatalogFormats } from '../../worker/scripts/qa-catalog-formats.mjs';

const origin = 'https://pirogorsk.ru';
const output = 'qa/product-copy-20261102';
const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.avif':'image/avif', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2', '.json':'application/json' };
const chrome = await launch({ chromeFlags:['--headless=new','--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL:`http://localhost:${chrome.port}` });
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', async request => {
  if (request.url().startsWith('data:')) return request.continue();
  if (!request.url().startsWith(origin+'/') || request.method()!=='GET') return request.abort();
  const path = new URL(request.url()).pathname;
  try { await request.respond({ status:200, contentType:types[extname(path)]||'text/html', body:await readFile(resolve('site','.'+decodeURIComponent(path)+(path.endsWith('/')?'index.html':''))) }); }
  catch { await request.abort(); }
});
await page.evaluateOnNewDocument(() => {
  window.qaClicks = [];
  document.addEventListener('click', event => {
    const el = event.target;
    window.qaClicks.push({ tag:el.tagName, classes:el.className, text:el.textContent.slice(0,80), x:event.clientX,y:event.clientY });
  }, true);
});
try {
  const session = await page.createCDPSession();
  await session.send('Emulation.setCPUThrottlingRate', { rate:4 });
  for (const width of [320,390,1280]) {
    await page.setViewport({ width,height:900 });
    await verifyCatalogFormats(page,origin,width,output+'/click-check');
  }
  await writeFile(output+'/catalog-click.json',JSON.stringify({ status:'PASS',cpuRate:4,widths:[320,390,1280] },null,2));
} catch (error) {
  await writeFile(output+'/catalog-click-failure.json',JSON.stringify({ error:String(error),clicks:await page.evaluate(()=>window.qaClicks),selection:await page.evaluate(()=>localStorage.getItem('pirogorsk-selection')) },null,2));
  await page.screenshot({ path:output+'/catalog-click-failure.png' });
  throw error;
} finally { await browser.close();await chrome.kill(); }
