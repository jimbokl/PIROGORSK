import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { verifyMenuQuantity } from '../../worker/scripts/qa-menu-quantity.mjs';

const baseline = process.argv.includes('--baseline');
const production = baseline || process.argv.includes('--production');
const screenshotsOnly = process.argv.includes('--screenshots-only');
const origin = 'https://pirogorsk.ru', site = resolve('site');
const output = resolve('qa/menu-cards-reference-20261030', baseline ? 'baseline' : production ? 'production' : 'local');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' };
const errors = [], failed = [], results = [];
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
try {
 for (const width of screenshotsOnly ? [390, 768] : [320, 390, 768, 1024, 1280]) {
  const context = await browser.createBrowserContext(), page = await context.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 700, hasTouch: width < 1100 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  await page.setRequestInterception(true);
  page.on('request', async request => {
   const url = new URL(request.url());
   try {
    if (url.protocol === 'data:') return await request.continue();
    if (url.origin === 'https://mc.yandex.ru') return await request.respond({ status: 200, body: '' });
    assert.equal(url.origin, origin); assert.equal(request.method(), 'GET');
    if (production) return await request.continue();
    const path = resolve(site, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
    assert.ok(path.startsWith(site + sep));
    await request.respond({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(path) });
   } catch (error) { failed.push(`${url.pathname}: ${error.message}`); await request.abort(); }
  });
  await page.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
   await document.fonts.ready;
   document.querySelectorAll('.menu-feed img').forEach(img => { img.loading = 'eager'; });
   await Promise.all([...document.querySelectorAll('.menu-feed img')].map(img => img.decode().catch(() => {})));
  });
  for (const [name, selector] of [['whole', '#pirogi39 .supplier-card'], ['mini', '#holland .supplier-card'], ['original', '[data-feed-id="meat"]'], ['extras', '[data-feed-id="mors-cranberry"]']]) {
   let target = selector;
   if (!(await page.$(selector))) target = '.menu-feed-list:last-child article';
   await page.$eval(target, el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 90, behavior: 'instant' }));
   await page.screenshot({ path: `${output}/${name}-${width}.jpg`, type: 'jpeg', quality: 90 });
  }
  // Exercise automatic loading, then include every supplier row in geometry checks.
  for (const section of ['#pirogi39', '#holland']) {
   while (await page.$eval(`${section} [data-supplier-more]`, el => !el.hidden)) {
    const before = await page.$$eval(`${section} .supplier-card:not([hidden])`, rows => rows.length);
    await page.$eval(`${section} [data-supplier-more]`, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction((section, before) => document.querySelectorAll(`${section} .supplier-card:not([hidden])`).length > before, { timeout: 8000 }, section, before);
   }
  }
  const geometry = await page.evaluate(() => {
   const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
   return [...document.querySelectorAll('.menu-feed [data-supplier-id], .menu-feed [data-feed-id]')].map(card => {
    const art = card.querySelector('.supplier-art-link, .menu-feed-art'), title = card.querySelector('h3'), formats = card.querySelector('fieldset'), add = card.querySelector('[data-supplier-link], [data-feed-add]'), quantity = card.querySelector('[data-feed-quantity-control]'), price = card.querySelector('[data-feed-price-label], [data-supplier-price]');
    return { id: card.dataset.supplierId || card.dataset.feedId, card: rect(card), art: rect(art), title: rect(title), formats: rect(formats), add: rect(add), quantity: rect(quantity), price: rect(price), controls: [...quantity.querySelectorAll('button')].map(rect), clipped: title.scrollWidth > title.clientWidth + 1 };
   });
  });
  assert.equal(geometry.length, 153);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (!baseline) for (const row of geometry) {
   const label = `${row.id}@${width}`;
   assert.ok(row.art.right <= row.title.x + 1, `${label}: image left of title`);
   assert.ok(row.formats.x >= row.title.x - 1, `${label}: format stays in right column`);
   assert.ok(row.add.x >= row.title.x - 1, `${label}: action stays in right column`);
   assert.ok(row.add.right <= row.card.right + 1, `${label}: action inside card`);
   assert.ok(row.quantity.right <= row.title.x + 1, `${label}: compact quantity under image`);
   assert.ok(row.quantity.y >= row.art.bottom - 1, `${label}: quantity clear of image`);
   assert.ok(row.add.height >= 44 && row.controls.every(r => r.width >= 44 && r.height >= 44), `${label}: touch controls ${JSON.stringify({add: row.add, controls: row.controls})}`);
   assert.equal(row.clipped, false, `${label}: complete title`);
   assert.ok(row.price.right <= row.add.x - 3, `${label}: price and action share row`);
  }
  let accessibility = [];
  if (!screenshotsOnly) {
   await page.addScriptTag({ content: axe });
   accessibility = await page.evaluate(async () => (await window.axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length })));
   assert.deepEqual(accessibility, []);
  }
  if (!baseline && !screenshotsOnly) {
   await page.$eval('#menu-search', input => { input.value = 'Чизбургер'; input.dispatchEvent(new Event('input', { bubbles: true })); });
   await page.waitForFunction(() => [...document.querySelectorAll('.menu-feed article')].filter(el => el.getBoundingClientRect().height > 0).length === 1);
   assert.match(await page.$eval('.menu-feed article:not([hidden]) h3', el => el.textContent), /Чизбургер/);
   await page.$eval('[data-menu-reset]', el => el.click());
   await page.waitForFunction(() => document.querySelector('#menu-search').value === '');
   assert.equal(await page.$eval('[data-menu-empty]', el => el.hidden), true);
  }
  results.push({ width, cards: geometry.length, heights: { min: Math.min(...geometry.map(r => r.card.height)), max: Math.max(...geometry.map(r => r.card.height)) }, firstCardHeight: geometry[0].card.height, accessibility, allRowChecks: !baseline, automaticLoading: true, searchAndReset: !baseline && !screenshotsOnly });
  if (!baseline && !screenshotsOnly && [320, 390, 768, 1024].includes(width)) await verifyMenuQuantity(page, origin, width, output);
  await context.close();
  console.log(`PASS: ${width}px, 153 rows${screenshotsOnly ? '' : ', accessibility and interaction checks'}`);
 }
 assert.deepEqual(errors, []); assert.deepEqual(failed, []);
 await writeFile(`${output}/results.json`, JSON.stringify({ checkedAt: new Date().toISOString(), baseline, production, results, errors, failed }, null, 2));
} finally { await browser.close(); await chrome.kill(); }
