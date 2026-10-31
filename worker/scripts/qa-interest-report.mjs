import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { renderReport } from '../../scripts/interest-report.mjs';

const output = new URL('../../qa/sprint-p0-p1-20261031/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const rows = [
  { day: '2026-10-31', city: 'zelenogradsk', occasion: 'apartments', preferred_time: 'morning', channel: 'qr', partner_code: 'p007', interests: 2, selection_value: 3000 },
  { day: '2026-10-31', city: 'kaliningrad', occasion: 'company', preferred_time: 'evening', channel: 'scenario', partner_code: 'none', interests: 1, selection_value: 2000 },
];
const results = [];
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewport({ width, height: 960 });
    await page.goto('about:blank');
    const actual = await readFile(`${output}interest-report.html`, 'utf8');
    await page.setContent(actual);
    assert.equal(await page.$eval('#count', element => element.textContent), '0');
    assert.equal(await page.$eval('#empty', element => element.hidden), false);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}report-empty-${width}.png`, fullPage: true });
    await page.goto('about:blank');
    await page.setContent(renderReport(rows, { from: '2026-10-01', to: '2026-10-31', capturedAt: 'СИНТЕТИЧЕСКИЙ QA — НЕ ФАКТИЧЕСКИЙ СПРОС' }));
    assert.equal(await page.$eval('#count', element => element.textContent), '3');
    await page.select('[data-filter="occasion"]', 'apartments');
    assert.equal(await page.$eval('#count', element => element.textContent), '2');
    await page.select('[data-filter="city"]', 'kaliningrad');
    assert.equal(await page.$eval('#count', element => element.textContent), '0');
    assert.equal(await page.$eval('#empty', element => element.hidden), false);
    await page.select('[data-filter="occasion"]', '');
    assert.equal(await page.$eval('#count', element => element.textContent), '1');
    await page.select('[data-filter="channel"]', 'qr');
    assert.equal(await page.$eval('#count', element => element.textContent), '0');
    await page.select('[data-filter="city"]', '');
    await page.select('[data-filter="preferred_time"]', 'morning');
    await page.select('[data-filter="partner_code"]', 'p007');
    assert.equal(await page.$eval('#count', element => element.textContent), '2');
    assert.match(await page.$eval('#value', element => element.textContent), /3\s000/);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert(await page.$$eval('select', elements => elements.every(element => element.getBoundingClientRect().height >= 44)));
    await page.screenshot({ path: `${output}report-synthetic-filtered-${width}.png`, fullPage: true });
    results.push({ width, empty: 'PASS', combinedFilters: 'PASS', totals: 'PASS', overflow: false, touch: 'PASS' });
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}report-ui.json`, JSON.stringify({ checkedAt: new Date().toISOString(), syntheticRowsAreNotDemand: true, results }, null, 2));
  console.log('PASS: internal aggregate report, empty + synthetic filter fixtures, 320/390/768/1280.');
} finally { await browser.disconnect(); await chrome.kill(); }
