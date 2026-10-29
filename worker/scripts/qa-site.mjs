import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { analyticsConfig } from '../../src/config/analytics.ts';
import { catalog } from '../../src/data/catalog.ts';
import { releaseManifest } from '../../scripts/verify-release.mjs';
import worker from '../dist/worker.js';

// Actual Astro output and production origins; every request is intercepted.
// Only the local in-memory database receives applications and Metrica is a queue.
const site = fileURLToPath(new URL('../../site/', import.meta.url));
const origin = 'https://pirogorsk.ru';
const endpoint = new URL(analyticsConfig.interestEndpoint);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(await readFile(new URL('../migrations/0001_interests.sql', import.meta.url), 'utf8'));
function prepare(sql, values = []) {
  const execute = () => ({ success: true, results: sqlite.prepare(sql).all(...values) });
  return { bind: (...next) => prepare(sql, next), first: async () => execute().results[0] || null, all: async () => execute(), execute };
}
const env = { DB: { prepare, batch: async statements => {
  sqlite.exec('BEGIN');
  try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} } };
const posts = [], errors = [], failedResources = [];
let chrome, browser;
try {
  assert.deepEqual(await (await worker.fetch(new Request(new URL('/health', endpoint)), env)).json(), { ok: true, storage: 'd1', mode: 'intent', ...releaseManifest() });
  chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-dev-shm-usage'] });
  browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
  for (const width of [320, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = new URL(request.url());
      try {
        if (url.protocol === 'data:') { await request.continue(); return; }
        if (url.origin === endpoint.origin && url.pathname === endpoint.pathname) {
          const body = request.hasPostData() ? await request.fetchPostData() : undefined;
          if (request.method() === 'POST') posts.push(JSON.parse(body));
          const response = await worker.fetch(new Request(url, { method: request.method(), headers: { ...request.headers(), 'CF-Connecting-IP': `192.0.2.${width === 320 ? 30 : 31}` }, body }), env);
          await request.respond({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
          return;
        }
        if (url.origin === 'https://mc.yandex.ru') {
          await request.respond({ status: 200, contentType: 'application/javascript', body: '' }); return;
        }
        if (url.origin !== origin) { failedResources.push(`${url.origin}${url.pathname}`); await request.abort(); return; }
        const path = resolve(site, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
        assert.ok(path.startsWith(site.endsWith(sep) ? site : site + sep), 'static path must stay in site/');
        await request.respond({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(path) });
      } catch (error) { failedResources.push(`${url.pathname}: ${error.message}`); await request.abort(); }
    });
    const goals = () => page.evaluate(() => (window.ym?.a || []).filter(args => args[1] === 'reachGoal').map(args => ({ goal: args[2], params: args[3] })));
    const selection = () => page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'));
    await page.goto(`${origin}/journal/skolko-piroga-na-cheloveka/`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-party-apply]');
    await page.$eval('[data-party-form] input[name=guests]', input => { input.value = '7'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    const transfer = new URL(await page.$eval('[data-party-apply]', el => el.href));
    const expectedCity = { kaliningrad: 'Калининград', zelenogradsk: 'Зеленоградск', svetlogorsk: 'Светлогорск' }[transfer.searchParams.get('city')];
    assert.ok(expectedCity);
    const expected = transfer.searchParams.get('items').split(',').map(row => { const [id, value, quantity] = row.split(':'); return { id, value: Number(value), quantity: Number(quantity) }; });
    assert.ok(expected.length > 0);
    assert.ok((await goals()).some(item => item.goal === 'calculator_interact'));
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('[data-party-apply]')]);
    assert.equal(await page.$eval('#selection-dialog', dialog => dialog.open), true);
    assert.deepEqual(await selection(), expected);
    await page.reload({ waitUntil: 'networkidle0' });
    assert.deepEqual(await selection(), expected, 'reload must not increase quantities');
    await page.click('[data-order]');
    await page.waitForFunction(() => document.querySelector('#interest-dialog').open);
    assert.equal(await page.$eval('#interest-city', el => el.value), expectedCity);
    await page.$eval('#interest-day', input => { input.value = '2099-12-12'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#interest-delivery', 'pickup');
    await page.click('[name=priceConsent]');
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `body overflow at ${width}`);
    assert.equal(await page.$eval('#interest-dialog', dialog => dialog.scrollWidth <= dialog.clientWidth), true, `form overflow at ${width}`);
    await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
    await page.screenshot({ path: new URL(`../dist/qa-site-${width}.png`, import.meta.url).pathname });
    const before = posts.length;
    await page.$eval('#interest-form', form => { form.requestSubmit(); form.requestSubmit(); });
    await page.waitForFunction(() => !document.querySelector('[data-interest-success]').hidden);
    assert.equal(posts.length, before + 1);
    const submitted = posts.at(-1);
    assert.deepEqual(submitted.items, expected.map(item => ({ ...item, value: String(item.value) })));
    const stored = sqlite.prepare('SELECT * FROM interests WHERE request_id = ?').get(submitted.requestId);
    const total = expected.reduce((sum, item) => sum + catalog.find(p => p.id === item.id).variants.find(v => v.value === item.value).price * item.quantity, 0);
    assert.equal(stored.city, expectedCity); assert.equal(stored.value_total, total);
    const acknowledgements = (await goals()).filter(item => item.goal === 'order_submit');
    assert.equal(acknowledgements.length, 1);
    assert.equal(acknowledgements[0].params.requestId, submitted.requestId);
    await page.evaluate(() => localStorage.removeItem('pirogorsk-selection'));
    await page.goto(`${origin}/?interest=calculator&city=kaliningrad&items=unknown:500:1#pirogi`, { waitUntil: 'networkidle0' });
    assert.deepEqual(await selection(), []);
    assert.equal(await page.$eval('#selection-dialog', dialog => dialog.open), false);
    assert.equal(posts.length, before + 1, 'malformed transfer must not submit');
    assert.equal(await page.$$eval('[data-supplier-id]', cards => cards.length), 78);
    assert.equal(await page.$$eval('[data-supplier-id]:not([hidden])', cards => cards.length), 24);
    await page.type('[data-supplier-search]', 'вишн');
    assert.ok(await page.$$eval('[data-supplier-id]:not([hidden])', cards => cards.length >= 3 && cards.every(card => card.dataset.supplierName.includes('вишн'))));
    await page.$eval('[data-supplier-search]', input => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('[data-supplier-filter=dough]');
    assert.equal(await page.$$eval('[data-supplier-id]:not([hidden])', cards => cards.length), 6);
    await page.click('[data-supplier-filter=all]');
    for (const count of [48, 72, 78]) {
      await page.click('[data-supplier-more]');
      assert.equal(await page.$$eval('[data-supplier-id]:not([hidden])', cards => cards.length), count);
    }
    assert.equal(await page.$eval('[data-supplier-more]', button => button.hidden), true);
    await page.click('[data-supplier-filter=mini-pies]');
    await page.click('[data-open=city-dialog]');
    await page.click('#city-dialog [data-select-city="Калининград"]');
    const beefId = 'hb-osetinskiy-pirog-s-govyadinoy';
    await page.click(`[data-product="${beefId}"] [data-add]`);
    await page.click('[data-product=meat] [data-add]');
    await page.click('[data-open=selection-dialog]');
    assert.match(await page.$eval('[data-total]', el => el.textContent), /2\s*240/);
    assert.match(await page.$eval('[data-selection-grand-total]', el => el.textContent), /2\s*590/);
    await page.click('[data-order]');
    await page.select('#interest-delivery', 'delivery');
    assert.match(await page.$eval('[data-interest-grand-total]', el => el.textContent), /2\s*590/);
    await page.select('#interest-city', 'Зеленоградск');
    assert.match(await page.$eval('[data-interest-grand-total]', el => el.textContent), /2\s*740/);
    await page.select('#interest-city', 'Светлогорск');
    assert.match(await page.$eval('[data-interest-grand-total]', el => el.textContent), /2\s*890/);
    await page.select('#interest-delivery', 'pickup');
    assert.match(await page.$eval('[data-interest-grand-total]', el => el.textContent), /2\s*240/);
    await page.select('#interest-delivery', 'undecided');
    assert.match(await page.$eval('[data-interest-grand-total]', el => el.textContent), /\+ получение/);
    await page.select('#interest-city', 'Калининград');
    await page.select('#interest-delivery', 'delivery');
    await page.$eval('#interest-day', input => { input.value = '2099-12-12'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('[name=priceConsent]');
    assert.equal(await page.$eval('#interest-dialog', dialog => dialog.scrollWidth <= dialog.clientWidth), true);
    await page.$eval('#interest-form', form => form.requestSubmit());
    await page.waitForFunction(() => !document.querySelector('[data-interest-success]').hidden);
    const mixed = posts.at(-1);
    const mixedRow = sqlite.prepare('SELECT * FROM interests WHERE request_id = ?').get(mixed.requestId);
    assert.deepEqual(mixed.items, [{ id: beefId, value: '1050', quantity: 1 }, { id: 'meat', value: '500', quantity: 1 }]);
    assert.equal(mixedRow.value_total, 2240, 'DB and goal value remain the product subtotal; receiving is stored separately');
    assert.equal(mixedRow.delivery, 'delivery');
    await page.click('[data-interest-success] [data-interest-close]');
    await page.click('[data-supplier-filter=bake]');
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `catalog overflow at ${width}`);
    await page.$eval('#holland', section => section.scrollIntoView());
    await page.screenshot({ path: new URL(`../dist/qa-supplier-${width}.png`, import.meta.url).pathname });
    // A menu variant must transfer the selected format, including cards after page 1.
    await page.goto(`${origin}/menu/`, { waitUntil: 'networkidle0' });
    await page.click('[data-supplier-filter=dough]');
    const doughCard = '[data-supplier-id=hb-testo-drozhzhevoe-sloenoe-zamorozhennoe-450-gr-20-sht-v-up]';
    await page.click(`${doughCard} label:last-of-type`);
    const link = await page.$eval(`${doughCard} [data-supplier-link]`, el => el.href);
    assert.equal(new URL(link).searchParams.get('variant'), '9000');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(`${doughCard} [data-supplier-link]`)]);
    assert.equal(await page.$eval('#selection-dialog', dialog => dialog.open), true);
    assert.equal(await page.$eval('[data-product=hb-testo-drozhzhevoe-sloenoe-zamorozhennoe-450-gr-20-sht-v-up]', card => card.hidden), false);
    assert.ok((await selection()).some(item => item.value === 9000));
    await context.close();
  }
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM interests').get().n, 4);
  assert.deepEqual(errors, []); assert.deepEqual(failedResources, []);
  console.log('PASS: built Astro calculator and mixed supplier/original selection → receiving estimates → Worker/SQLite; search, all 78 cards, category filters and menu variant transfer at 320/1280px; no production requests.');
} finally {
  await browser?.close(); chrome?.kill(); sqlite.close();
}
