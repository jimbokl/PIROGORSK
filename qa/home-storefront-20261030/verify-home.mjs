import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const baseline = process.argv.includes('--baseline');
const production = baseline || process.argv.includes('--production');
const origin = 'https://pirogorsk.ru', site = resolve('site');
const output = resolve('qa/home-storefront-20261030', baseline ? 'baseline-ui' : production ? 'production' : 'local');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' };
const errors = [], failures = [], results = [];
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
try {
 for (const width of [320, 390, 768, 1024, 1280]) {
  const context = await browser.createBrowserContext(), page = await context.newPage();
  const height = width < 600 ? 740 : width < 1100 ? 1024 : 900;
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 1100 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
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
   } catch (error) { failures.push(`${url.pathname}: ${error.message}`); await request.abort(); }
  });
  await page.goto(`${origin}/?qa=1`, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('[data-product] img')].map(img => { img.loading = 'eager'; return img.decode().catch(() => {}); })); });
  const metrics = await page.evaluate(() => {
   const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
   return { hero: rect(document.querySelector('[data-tasting-hero]')), header: rect(document.querySelector('header')), firstArt: rect(document.querySelector('[data-product] a')), firstAdd: rect(document.querySelector('[data-product] [data-add]')), overflow: document.documentElement.scrollWidth > innerWidth, cards: [...document.querySelectorAll('[data-product]')].map(card => ({ id: card.dataset.product, art: rect(card.querySelector('a')), title: rect(card.querySelector('h3')), add: rect(card.querySelector('[data-add]')), quantity: card.querySelector('[data-feed-quantity-control]') ? rect(card.querySelector('[data-feed-quantity-control]')) : null })) };
  });
  await page.screenshot({ path: `${output}/home-${width}.jpg`, type: 'jpeg', quality: 90 });
  if (!baseline) {
   assert.equal(metrics.overflow, false, `no overflow ${width}`);
   assert.ok(metrics.hero.height <= 260, `compact hero ${width}`);
   assert.ok(metrics.firstArt.bottom < height, `first pie visible without scrolling ${width}: ${metrics.firstArt.bottom}`);
   assert.ok(metrics.firstAdd.bottom <= height, `first purchase visible without scrolling ${width}: ${metrics.firstAdd.bottom}`);
   assert.equal(metrics.cards.length, 4);
   for (const row of metrics.cards) {
    assert.ok(row.art.right <= row.title.x + 1, `${row.id}@${width}: image left`);
    assert.ok(row.add.x >= row.title.x - 1 && row.add.height >= 44, `${row.id}@${width}: right action`);
    assert.ok(row.quantity.bottom > row.art.bottom && row.quantity.right <= row.title.x + 1, `${row.id}@${width}: quantity under art`);
   }
   await page.addScriptTag({ content: axe });
   const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
   assert.deepEqual(violations, []);
   const catalog = await page.$eval('#catalog-data', el => JSON.parse(el.textContent));
   const selection = () => page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'));
   const click = async selector => { await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.click(selector); };
   for (const row of metrics.cards) {
    const card = `[data-product="${row.id}"]`, product = catalog.find(p => p.id === row.id);
    await click(`${card} [data-feed-increase]`);
    await click(`${card} [data-feed-increase]`);
    const value = product.variants.at(-1).value;
    await click(`${card} input[data-variant="${value}"]`);
    const price = product.prices[value] * 3;
    assert.equal(await page.$eval(`${card} [data-price]`, el => Number(el.textContent.replace(/\D/g, ''))), price);
    await click(`${card} [data-add]`);
    assert.deepEqual((await selection()).find(p => p.id === row.id), { id: row.id, value, quantity: 3 });
   }
   // Changing typed quantity clamps at the existing selection bounds.
   for (const [input, expected] of [['0', '1'], ['100', '99'], ['2.5', '2'], ['', '1']]) {
    await page.$eval('[data-product=meat] [data-feed-quantity]', (el, input) => { el.value = input; el.dispatchEvent(new Event('change', { bubbles: true })); }, input);
    assert.equal(await page.$eval('[data-product=meat] [data-feed-quantity]', el => el.value), expected);
   }
   await page.focus('[data-product=meat] [data-feed-quantity]');
   await page.keyboard.press('ArrowUp'); await page.keyboard.press('Tab');
   assert.equal(await page.$eval('[data-product=meat] [data-feed-quantity]', el => el.value), '2');
   await click('[data-product=meat] [data-add]');
   assert.equal((await selection()).find(p => p.id === 'meat').quantity, 5);
   await click('[data-open=selection-dialog]');
   assert.ok(await page.$eval('#selection-dialog', el => el.open));
   const saved = await selection();
   const expectedTotal = saved.reduce((sum, item) => sum + catalog.find(p => p.id === item.id).prices[item.value] * item.quantity, 0);
   assert.equal(await page.$eval('[data-total]', el => Number(el.textContent.replace(/\D/g, ''))), expectedTotal);
   await page.keyboard.press('Escape');
   await page.reload({ waitUntil: 'networkidle0' });
   assert.deepEqual(await selection(), saved);
   await click('[data-tasting-next]');
   await page.waitForFunction(() => document.querySelector('[data-tasting-hero]').dataset.flavor === 'company');
   assert.equal(await page.$eval('[data-tasting-cta]', el => el.getAttribute('href')), '#nabory');
   await page.focus('[data-tasting-cta]'); await page.keyboard.press('ArrowRight');
   await page.waitForFunction(() => document.querySelector('[data-tasting-hero]').dataset.flavor === 'tea');
   await click('[data-tasting-prev]');
   await page.waitForFunction(() => document.querySelector('[data-tasting-hero]').dataset.flavor === 'company');
   await page.screenshot({ path: `${output}/slider-${width}.jpg`, type: 'jpeg', quality: 90 });
  }
  results.push({ width, height, ...metrics });
  console.log(`PASS ${width}: art top=${Math.round(metrics.firstArt.y)}, add bottom=${Math.round(metrics.firstAdd.bottom)}`);
  await context.close();
 }
 assert.deepEqual(errors, []); assert.deepEqual(failures, []);
 await writeFile(`${output}/results.json`, JSON.stringify({ results, errors, failures }, null, 2) + '\n');
} finally { await browser.close(); await chrome.kill(); }
