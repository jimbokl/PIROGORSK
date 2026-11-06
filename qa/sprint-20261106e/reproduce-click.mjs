import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { verifyCatalogFormats } from '../../worker/scripts/qa-catalog-formats.mjs';

const output = process.env.QA_OUTPUT || new URL('./click-regression/', import.meta.url).pathname;
const origin = 'https://pirogorsk.ru';
const site = resolve('site');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const widths = (process.env.QA_WIDTHS || '320,390,1280').split(',').map(Number);
const iterations = Number(process.env.QA_ITERATIONS || 1);
const cpu = Number(process.env.QA_CPU || 1);
const report = { cpu, widths, iterations, runs: [] };
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-dev-shm-usage'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
try {
  for (let iteration = 0; iteration < iterations; iteration++) for (const width of widths) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const events = [], errors = [];
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(() => document.addEventListener('DOMContentLoaded', () => {
      const style=document.createElement('style'); style.textContent='html{overflow-y:scroll}::-webkit-scrollbar{width:15px}';document.head.append(style);
    }, {once:true}));
    if (cpu !== 1) await (await page.createCDPSession()).send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await page.exposeFunction('recordClickProbe', event => events.push(event));
    await page.evaluateOnNewDocument(() => {
      for (const type of ['pointerdown', 'pointerup', 'click']) document.addEventListener(type, event => {
        const button = event.target.closest?.('button, a');
        const card = event.target.closest?.('[data-product], [data-feed-id], [data-supplier-id]');
        window.recordClickProbe({ type, time: performance.now(), path: location.pathname, x: event.clientX, y: event.clientY, scrollY, target: event.target.tagName, text: button?.textContent.trim(), product: card?.dataset.product || card?.dataset.feedId || card?.dataset.supplierId });
      }, true);
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      if (url.protocol === 'data:') return request.continue();
      if (request.method() !== 'GET' || url.origin !== origin) return request.abort();
      const path = resolve(site, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
      try { await request.respond({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(path) }); }
      catch (error) { errors.push(`${url.pathname}: ${error.message}`); await request.abort(); }
    });
    const run = { iteration, width, cpu };
    try {
      await verifyCatalogFormats(page, origin, width, `${output}/frames`);
      assert.deepEqual(errors, []);
      run.result = 'PASS';
    } catch (error) {
      run.result = 'FAIL'; run.error = error.stack;
      run.selection = await page.evaluate(() => localStorage.getItem('pirogorsk-selection'));
      await page.screenshot({ path: `${output}/failure-${width}-${iteration}.png` });
      throw error;
    } finally {
      report.runs.push({ ...run, errors, events });
      await writeFile(`${output}/reproduction-cpu${cpu}.json`, JSON.stringify(report, null, 2));
      await context.close();
    }
  }
} finally { browser.disconnect(); await chrome.kill(); }
