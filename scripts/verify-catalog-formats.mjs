import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { verifyCatalogFormats } from '../worker/scripts/qa-catalog-formats.mjs';
import { verifyOffers } from '../worker/scripts/qa-offers.mjs';
import { verifySelectionTools } from '../worker/scripts/qa-selection-tools.mjs';

const base = process.env.QA_BASE || 'http://127.0.0.1:4322';
const stage = process.env.QA_STAGE || 'local';
const output = `qa/catalog-formats-20261031/${stage}`;
await mkdir(output, { recursive: true });
const report = { base, stage, views: [], errors: [] };
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions', '--no-first-run'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
try {
  for (const width of [320, 390, 768, 1024, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.setViewport({ width, height: 960, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (request.method() !== 'GET' || (['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(base).origin)) request.abort();
      else request.continue();
    });
    await verifyCatalogFormats(page, base, width, output);
    await verifyOffers(page, base, width, output);
    await verifySelectionTools(page, base, width, output);
    await page.setJavaScriptEnabled(false);
    await page.goto(`${base}/?qa=1#pirogi`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$$eval('[data-home-catalog] .variant-summary', labels => labels.every(el => !el.hidden && el.textContent.includes('₽'))), true, 'prices survive without JS');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no-JS layout fits');
    report.views.push({ width, result: 'PASS', formats: '153 home + 153 menu', bundles: 5, editor: true, noJS: true });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  browser.disconnect();
  await chrome.kill();
}
