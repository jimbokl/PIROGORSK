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
    await context.close();
  }
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM interests').get().n, 2);
  assert.deepEqual(errors, []); assert.deepEqual(failedResources, []);
  console.log('PASS: built Astro article → calculator → exact selection/reload → form → Worker/SQLite/one goal at 320/1280px; malformed transfer rejected; no production requests.');
} finally {
  await browser?.close(); chrome?.kill(); sqlite.close();
}
