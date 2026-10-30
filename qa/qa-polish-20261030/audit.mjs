import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const production = process.argv.includes('--production');
const baseline = process.argv.includes('--baseline');
const origin = 'https://pirogorsk.ru';
const site = fileURLToPath(new URL('../../site/', import.meta.url));
const output = fileURLToPath(new URL(`./${production ? 'production' : baseline ? 'baseline' : 'local'}/`, import.meta.url));
const axe = await readFile(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' };
const routes = [['home', '/'], ['menu', '/menu/'], ['product', '/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/'], ['delivery', '/delivery/'], ['blog', '/blog/'], ['article', '/journal/skolko-piroga-na-cheloveka/'], ['city', '/dostavka/zelenogradsk/'], ['planner', '/podbor/']];
const results = [], errors = [], failed = [], scenarios = {};
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
async function pageFor(context, width) {
  const page = await context.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 700, hasTouch: width < 1000 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  await page.setRequestInterception(true);
  page.on('request', async r => {
    const u = new URL(r.url());
    try {
      if (u.protocol === 'data:') return await r.continue();
      if (u.origin === 'https://mc.yandex.ru') return await r.respond({ status: 200, body: '' });
      if (u.origin !== origin || r.method() !== 'GET') { failed.push(`${r.method()} ${u.href}`); return await r.abort(); }
      if (production) return await r.continue();
      const path = resolve(site, `.${decodeURIComponent(u.pathname)}${u.pathname.endsWith('/') ? 'index.html' : ''}`);
      assert.ok(path.startsWith(site.endsWith(sep) ? site : site + sep));
      await r.respond({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(path) });
    } catch (e) { failed.push(`${u.pathname}: ${e.message}`); await r.abort(); }
  });
  return page;
}
const go = (page, route) => page.goto(`${origin}${route}${route.includes('?') ? '&' : '?'}qa=1`, { waitUntil: 'networkidle0' });
try {
  await mkdir(output, { recursive: true });
  for (const width of [320, 390, 768, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await pageFor(context, width);
    for (const [name, route] of routes) {
      await go(page, route);
      await page.evaluate(() => document.fonts.ready);
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        h1: document.querySelectorAll('h1').length,
        brokenImages: [...document.images].filter(e => e.getBoundingClientRect().top < innerHeight && !e.closest('[hidden]') && e.complete && e.naturalWidth === 0).map(e => e.currentSrc),
      }));
      await page.screenshot({ path: `${output}/${name}-${width}.jpg`, type: 'jpeg', quality: 80 });
      let violations = [];
      if (width === 390 || width === 1280) {
        await page.evaluate(axe);
        violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
      }
      results.push({ name, width, ...state, violations });
      assert.equal(state.overflow, false, `${name}/${width} overflow`);
      assert.equal(state.h1, 1, `${name}/${width} h1`);
      assert.deepEqual(state.brokenImages, [], `${name}/${width} images`);
    }
    await context.close();
  }
  // Two real same-origin tabs: editing the menu must not be lost on the already-open home.
  const context = await browser.createBrowserContext();
  const home = await pageFor(context, 390), menu = await pageFor(context, 390);
  await go(home, '/');
  await go(menu, '/menu/');
  const first = '[data-supplier-id]:not([hidden])';
  const id = await menu.$eval(first, e => e.dataset.supplierId);
  await menu.click(`${first} [data-feed-increase]`);
  await menu.click(`${first} [data-supplier-link]`);
  await home.bringToFront();
  await home.waitForFunction(() => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]').length > 0, { polling: 100 });
  const badge = await home.$eval('[data-count]', e => ({ text: e.textContent, hidden: e.hidden }));
  await home.click('[data-open="selection-dialog"]');
  scenarios.crossTabBadge = badge.text === '2' && !badge.hidden;
  scenarios.crossTabDialog = await home.$$eval('[data-item]', rows => rows.length === 1);
  await home.screenshot({ path: `${output}/selection-390.jpg`, type: 'jpeg', quality: 85 });
  await home.keyboard.press('Escape');
  await home.click('[data-product] [data-add]');
  scenarios.crossTabPreservesItems = await home.evaluate(id => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]').some(e => e.id === id && e.quantity === 2), id);
  // Last item removal should leave keyboard focus on a usable action inside the modal.
  await home.click('[data-open="selection-dialog"]');
  while (await home.$('[data-remove]')) await home.click('[data-remove]');
  scenarios.emptySelectionFocus = await home.$eval('[data-go-catalog]', e => document.activeElement === e);
  await home.keyboard.press('Escape');
  // Changing city in another tab must update the home and its delivery estimate.
  await menu.bringToFront();
  await menu.click('.masthead-city--mobile');
  await menu.click('#city-dialog [data-select-city="Калининград"]');
  await home.bringToFront();
  await home.waitForFunction(() => localStorage.getItem('pirogorsk-city') === 'Калининград', { polling: 100 });
  scenarios.crossTabCity = await home.$$eval('[data-city]', els => els.every(e => e.textContent === 'Калининград'));
  if (!baseline) {
    // Stress real totals and long product names; inspect selection and form without submitting.
    for (const width of [320, 390]) {
      await home.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await home.evaluate(() => {
        const products = JSON.parse(document.querySelector('#catalog-data').textContent);
        localStorage.setItem('pirogorsk-selection', JSON.stringify(products.slice(0, 24).map(p => ({ id: p.id, value: p.variants.at(-1).value, quantity: 99 }))));
      });
      await go(home, '/?interest=selection');
      for (const dialog of ['selection', 'interest']) {
        if (dialog === 'interest') await home.click('[data-order]');
        const selector = `#${dialog}-dialog`;
        const layout = await home.$eval(selector, el => ({ overflow: el.scrollWidth > el.clientWidth, width: el.getBoundingClientRect().width }));
        scenarios[`${dialog}LargeSelection${width}`] = !layout.overflow && layout.width <= width;
        await home.evaluate(axe);
        const violations = await home.evaluate(async selector => (await axe.run(document.querySelector(selector), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), selector);
        results.push({ name: `${dialog}-dialog`, width, ...layout, violations });
        await home.$eval(selector, el => { el.scrollTop = el.scrollHeight; });
        await home.screenshot({ path: `${output}/${dialog}-large-${width}.jpg`, type: 'jpeg', quality: 85 });
      }
      await home.keyboard.press('Escape');
    }
    await go(menu, '/menu/');
    await menu.bringToFront();
    await menu.evaluate(() => localStorage.removeItem('pirogorsk-selection'));
    await menu.click(`${first} [data-supplier-link]`);
    scenarios.visibleDismissIcon = await menu.$eval('[data-feed-dismiss] svg', el => el.getBoundingClientRect().width >= 16 && el.getBoundingClientRect().height >= 16);
    await menu.screenshot({ path: `${output}/menu-feedback-390.jpg`, type: 'jpeg', quality: 85 });
    await menu.click('[data-feed-dismiss]');
    scenarios.dismissFeedback = await menu.$eval('[data-feed-feedback]', el => el.hidden);
    scenarios.dismissFocus = await menu.$eval(`${first} [data-supplier-link]`, el => document.activeElement === el);
    await home.setViewport({ width: 320, height: 900, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await go(home, '/');
    await home.bringToFront();
    await home.click('[data-product=apple] [data-add]');
    scenarios.toastWrap320 = await home.$eval('[data-toast]', el => el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth);
    await home.screenshot({ path: `${output}/toast-320.jpg`, type: 'jpeg', quality: 85 });
  }
  await context.close();
  const violations = results.flatMap(r => r.violations.map(v => `${r.name}/${r.width}: ${v.id} (${v.nodes.length})`));
  await writeFile(`${output}/results.json`, JSON.stringify({ production, baseline, results, scenarios, errors, failed, violations }, null, 2));
  console.log(JSON.stringify({ pages: results.length, violations, scenarios, errors, failed }, null, 2));
  if (!baseline) { assert.ok(Object.values(scenarios).every(Boolean), 'state scenarios'); assert.deepEqual(violations, []); }
  assert.deepEqual(errors, []); assert.deepEqual(failed, []);
} finally { await browser.close(); await chrome.kill(); }
