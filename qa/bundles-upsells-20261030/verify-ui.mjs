import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { verifyOffers } from '../../worker/scripts/qa-offers.mjs';

const production = process.argv.includes('--production');
const origin = 'https://pirogorsk.ru';
const site = fileURLToPath(new URL('../../site/', import.meta.url));
const output = fileURLToPath(new URL(production ? './production/' : './local/', import.meta.url));
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const errors = [], failed = [], results = [];
let chrome, browser;
try {
  await mkdir(output, { recursive: true });
  chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
  browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
  for (const width of [320, 390, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 700, hasTouch: width < 700 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      try {
        if (url.protocol === 'data:') { await request.continue(); return; }
        if (url.origin === 'https://mc.yandex.ru') { await request.respond({ status: 200, body: '' }); return; }
        if (url.origin !== origin || request.method() !== 'GET') { failed.push(request.url()); await request.abort(); return; }
        if (production) { await request.continue(); return; }
        const path = resolve(site, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
        assert.ok(path.startsWith(site.endsWith(sep) ? site : site + sep));
        await request.respond({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(path) });
      } catch (error) { failed.push(`${url.pathname}: ${error.message}`); await request.abort(); }
    });
    await page.goto(`${origin}/?qa=1`, { waitUntil: 'networkidle0' });
    await verifyOffers(page, origin, width, output);
    results.push({ width, touch: width < 700, passed: true });
    await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(failed, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ checkedAt: new Date().toISOString(), production, results, errors, failed }, null, 2) + '\n');
} finally { await browser?.close(); chrome?.kill(); }
