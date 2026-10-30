import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
const production = process.argv.includes('--production');
const origin = 'https://pirogorsk.ru', site = resolve('site');
const output = resolve('qa/home-full-catalog-20261030', production ? 'production' : 'local');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' };
const errors = [], failures = [], results = [];
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
async function setup(width, { js = true, observer = true, motion = 'reduce' } = {}) {
 const context = await browser.createBrowserContext(), page = await context.newPage();
 await page.setViewport({ width, height: width < 600 ? 740 : 1024, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 1100 });
 await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]);
 if (!js) await page.setJavaScriptEnabled(false);
 if (!observer) await page.evaluateOnNewDocument(() => { delete window.IntersectionObserver; });
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
 return { context, page };
}
const click = async (page, selector) => {
 await page.$eval(selector, el => el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
 await page.click(selector);
};
const visibleCount = page => page.$$eval('[data-home-catalog] [data-product]:not([hidden])', cards => cards.length);
try {
 for (const width of [320, 390, 768, 1024, 1280]) {
  const { context, page } = await setup(width);
  await page.goto(`${origin}/?qa=1`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const catalog = await page.$eval('#catalog-data', el => JSON.parse(el.textContent));
  const ids = await page.$$eval('[data-home-catalog] [data-product]', cards => cards.map(card => card.dataset.product));
  assert.deepEqual([...ids].sort(), catalog.map(p => p.id).sort());
  assert.equal(new Set(ids).size, 153);
  assert.equal(await visibleCount(page), 12);
  const first = await page.$eval('[data-add=meat]', el => el.getBoundingClientRect().bottom);
  assert.ok(first <= (width < 600 ? 740 : 1024), `first purchase above fold ${width}: ${first}`);
  await page.screenshot({ path: `${output}/home-${width}.jpg`, type: 'jpeg', quality: 88 });
  // Every category can reveal and reach its first item without loading other pages.
  const sections = await page.$$eval('[data-home-category]', links => links.map(a => a.dataset.homeCategory));
  for (const id of sections) {
   console.log(`category ${width} ${id}`);
   await click(page, `[data-home-category="${id}"]`);
   await page.waitForFunction(id => document.querySelector(`[data-home-category="${id}"]`).hasAttribute('aria-current'), {}, id);
   assert.equal(new URL(page.url()).hash, `#${id}`);
   await page.waitForFunction(id => { const el = document.getElementById(id), nav = document.querySelector('[data-home-catalog-nav]'); return Math.abs(el.getBoundingClientRect().top - nav.getBoundingClientRect().bottom - 28) < 50; }, {}, id);
   const geo = await page.$eval(`#${id}`, el => ({ hidden: el.hidden, top: el.getBoundingClientRect().top, navBottom: document.querySelector('[data-home-catalog-nav]').getBoundingClientRect().bottom }));
   assert.equal(geo.hidden, false);
   assert.ok(geo.top >= geo.navBottom - 2 && geo.top < geo.navBottom + 80, `${id}@${width}: heading below sticky rail ${JSON.stringify(geo)}`);
  }
  assert.equal(await visibleCount(page), 153);
  const geometry = await page.$$eval('[data-home-catalog] [data-product]', cards => cards.map(card => {
   const r = el => { const a = el.getBoundingClientRect(); return { x: a.x, y: a.y, right: a.right, bottom: a.bottom, height: a.height }; };
   return { id: card.dataset.product, art: r(card.querySelector('.menu-feed-art')), title: r(card.querySelector('h4')), quantity: r(card.querySelector('[data-feed-quantity-control]')), add: r(card.querySelector('[data-add]')), overflow: card.scrollWidth > card.clientWidth };
  }));
  for (const row of geometry) {
   assert.equal(row.overflow, false, `${row.id}@${width}: card overflow`);
   assert.ok(row.art.right <= row.title.x + 1, `${row.id}: image left`);
   assert.ok(row.quantity.right <= row.title.x + 1, `${row.id}: quantity below image`);
   assert.ok(row.add.x >= row.title.x - 1 && row.add.height >= 44, `${row.id}: compact action right`);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: `${output}/extras-${width}.jpg`, type: 'jpeg', quality: 88 });
  const priceErrors = await page.evaluate(() => {
   const catalog = JSON.parse(document.querySelector('#catalog-data').textContent), errors = [];
   for (const card of document.querySelectorAll('[data-home-catalog] [data-product]')) {
    const p = catalog.find(p => p.id === card.dataset.product), input = card.querySelector('[data-feed-quantity]');
    for (const variant of p.variants) {
     input.value = '3';
     const radio = card.querySelector(`input[data-variant="${variant.value}"]`);
     radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true }));
     if (Number(card.querySelector('[data-price]').textContent.replace(/\D/g, '')) !== p.prices[variant.value] * 3) errors.push(`${p.id}:${variant.value}`);
    }
    for (const [value, expected] of [['0', 1], ['100', 99], ['', 1], ['2.8', 2]]) {
     input.value = value; input.dispatchEvent(new Event('change', { bubbles: true }));
     if (Number(input.value) !== expected) errors.push(`${p.id}:bounds:${value}`);
    }
    input.value = '1';
    const radio = card.querySelector(`input[data-variant="${p.defaultVariant}"]`);
    radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true }));
   }
   return errors;
  });
  assert.deepEqual(priceErrors, []);
  // Direct quantity input, keyboard, variants, bounds, merge, dialog and persistence.
  for (const id of ['meat', catalog.find(p => p.category === 'mini-pies').id, 'cranberry', 'tableware']) {
   const p = catalog.find(p => p.id === id), card = `[data-product="${id}"]`;
   await click(page, `${card} [data-feed-increase]`);
   await click(page, `${card} [data-feed-quantity]`);
   await page.keyboard.press('ArrowUp');
   const value = p.variants.at(-1).value;
   await click(page, `${card} input[data-variant="${value}"]`);
   assert.equal(await page.$eval(`${card} [data-price]`, el => Number(el.textContent.replace(/\D/g, ''))), p.prices[value] * 3);
   await click(page, `${card} [data-add]`);
   await click(page, `${card} [data-add]`);
   assert.deepEqual(await page.evaluate(id => JSON.parse(localStorage.getItem('pirogorsk-selection')).find(p => p.id === id), id), { id, value, quantity: 6 });
  }
  await click(page, '[data-open=selection-dialog]');
  assert.equal(await page.$eval('#selection-dialog', d => d.open), true);
  assert.equal(await page.$$eval('[data-selection-items] [data-item]', rows => rows.length), 4);
  await page.keyboard.press('Escape');
  await click(page, '[data-home-category=holland]');
  await page.screenshot({ path: `${output}/mini-pies-${width}.jpg`, type: 'jpeg', quality: 88 });
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await window.axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
  assert.deepEqual(violations, []);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection')).length), 4);
  assert.equal(await page.$eval('#holland', el => el.hidden), false);
  results.push({ width, products: ids.length, geometry: geometry.length, firstAddBottom: first, categories: sections.length, accessibility: 'PASS', quantity: 'PASS', hashesReload: 'PASS' });
  await context.close();
 }
 // Normal animation must arrive before pointer coordinates are used for a row.
 for (const width of [390, 768, 1280]) {
  const {context, page} = await setup(width, {motion: 'no-preference'});
  await page.goto(`${origin}/?qa=1`, {waitUntil: 'networkidle0'});
  const miniId = await page.$eval('#catalog-data', el => JSON.parse(el.textContent).find(p => p.category === 'mini-pies').id);
  for (const [category, id] of [['holland', miniId], ['extras', 'cranberry']]) {
   await page.click(`[data-home-category="${category}"]`);
   await page.waitForFunction(id => {
    const top = document.getElementById(id).getBoundingClientRect().top;
    const edge = document.querySelector('[data-home-catalog-nav]').getBoundingClientRect().bottom;
    return top >= edge - 2 && top < edge + 80;
   }, {}, category);
   await page.evaluate(() => new Promise(resolve => {
    let previous = scrollY, stable = 0;
    function frame() {
     stable = Math.abs(scrollY - previous) < .5 ? stable + 1 : 0;
     previous = scrollY;
     if (stable >= 6) resolve(); else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
   }));
   await click(page, `[data-product="${id}"] [data-feed-increase]`);
   await click(page, `[data-product="${id}"] [data-add]`);
   assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem('pirogorsk-selection')).find(item => item.id === id)?.quantity, id), 2);
  }
  results.push({mode: 'smooth-motion', width, categories: 'PASS', quantity: 'PASS'});
  await context.close();
 }
 // Automatic loading, keyboard fallback without IntersectionObserver, complete no-JS HTML.
 for (const mode of ['auto', 'manual', 'no-js']) {
  const { context, page } = await setup(390, { js: mode !== 'no-js', observer: mode !== 'manual' });
  await page.goto(`${origin}/?qa=1`, { waitUntil: 'networkidle0' });
  if (mode === 'no-js') {
   assert.equal(await visibleCount(page), 153);
   await click(page, '[data-home-category=extras]');
   assert.equal(new URL(page.url()).hash, '#extras');
  } else {
   let count = await visibleCount(page);
   for (let batch = 0; count < 153 && batch < 20; batch++) {
    if (mode === 'auto') {
     await page.$eval('[data-home-more]', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    } else {
     await page.focus('[data-home-more]'); await page.keyboard.press('Enter');
    }
    await page.waitForFunction(previous => [...document.querySelectorAll('[data-home-catalog] [data-product]:not([hidden])')].length > previous, {}, count);
    count = await visibleCount(page);
   }
   assert.equal(count, 153);
   assert.equal(await page.$eval('[data-home-more]', el => el.hidden), true);
  }
  results.push({ mode, products: 153, status: 'PASS' });
  await context.close();
 }
 assert.deepEqual(errors, []); assert.deepEqual(failures, []);
 await writeFile(`${output}/results.json`, JSON.stringify({ production, results, errors, failures }, null, 2));
 console.log(JSON.stringify({ production, results, errors, failures }, null, 2));
} finally { await browser.close(); await chrome.kill(); }
