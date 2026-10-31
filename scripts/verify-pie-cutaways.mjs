import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const stage = process.env.QA_STAGE || 'local';
const output = `qa/pie-cutaways-20261031/${stage}`;
await mkdir(output, { recursive: true });
const report = { stage, base: '', views: [], errors: [] };
const root = resolve('site');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
let server;
if (!process.env.QA_BASE) {
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const path = resolve(root, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
      assert.ok(path.startsWith(root + sep));
      const body = await readFile(path);
      response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
      response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
}
const base = process.env.QA_BASE || `http://127.0.0.1:${server.address().port}`;
report.base = base;
const pies = { meat: 'myasnoy-pirog', fish: 'rybnyy-pirog', cabbage: 'pirog-s-kapustoy', cheese: 'syrnyy-pirog', apple: 'pirog-s-yablokom-i-brusnikoy', cherry: 'pirog-s-vishney' };
const guides = ['skolko-piroga-na-cheloveka', 'kak-narezat-pirog', 'kak-hranit-pirogi', 'kak-razogret-pirog-v-apartamentah'];
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions', '--no-first-run'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
try {
  for (const width of [320, 390, 768, 1024, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 960, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    page.on('pageerror', error => report.errors.push(error.message));
    let blocked = false;
    const requests = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      requests.push(url.pathname);
      if (request.method() !== 'GET' || (['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(base).origin) || (blocked && /\/(meat|fish|cabbage|cheese|apple|cherry)\./.test(url.pathname))) request.abort();
      else request.continue();
    });
    const toggle = async (id, keyboard = false) => {
      const selector = `[data-pie-gallery="${id}"]`;
      await page.$eval(selector, element => element.scrollIntoView({ block: 'center' }));
      const rect = await page.$eval(selector, el => ({ width: el.clientWidth, height: el.clientHeight }));
      const button = `${selector} [data-cutaway-toggle]`;
      assert.equal(await page.$eval(button, el => el.hidden), false);
      assert.ok(await page.$eval(button, el => el.getBoundingClientRect().height >= 44));
      if (keyboard) { await page.focus(button); await page.keyboard.press('Enter'); }
      else await page.click(button);
      await page.waitForFunction(selector => document.querySelector(`${selector} [data-cutaway-toggle]`).getAttribute('aria-pressed') === 'true', { timeout: 20000 }, selector);
      assert.equal(await page.$eval(`${selector} [data-cutaway-image] img`, img => img.naturalWidth > 0 && img.alt.length > 10), true);
      assert.deepEqual(await page.$eval(selector, el => ({ width: el.clientWidth, height: el.clientHeight })), rect, 'cutaway keeps the artwork dimensions');
      assert.equal(await fits(page), true);
      await page.click(button);
      assert.equal(await page.$eval(`${selector} [data-cutaway-image]`, el => el.hidden), true);
      assert.equal(await page.$eval(button, el => el.getAttribute('aria-pressed')), 'false');
      return button;
    };
    for (const path of ['/', '/menu/']) {
      requests.length = 0;
      await page.goto(`${base}${path}?qa=1`, { waitUntil: 'networkidle0' });
      assert.equal(await page.$$eval('[data-pie-gallery]', elements => elements.length), 6);
      const sources = await page.$$eval('template[data-cutaway-template]', templates => templates.flatMap(template => [...template.content.querySelector('img').getAttribute('srcset').matchAll(/(\S+) \d+w/g)].map(match => new URL(match[1], location.href).pathname)));
      assert.equal(requests.some(path => sources.includes(path)), false, 'no cutaway request before tap');
      assert.equal(await page.$$eval(path === '/' ? '[data-home-catalog] [data-product]' : '.menu-feed [data-feed-id], .menu-feed [data-supplier-id]', elements => elements.length), 153);
      assert.equal(await page.$$eval('.catalog-service-facts a', elements => elements.every(el => el.getBoundingClientRect().height >= 44)), true);
      for (const id of Object.keys(pies)) await toggle(id, id === 'meat');
      if (width === 390 || width === 768) {
        await page.click('[data-pie-gallery="meat"] [data-cutaway-toggle]');
        await page.waitForFunction(() => document.querySelector('[data-pie-gallery="meat"] [data-cutaway-toggle]').getAttribute('aria-pressed') === 'true');
        await page.$eval('[data-pie-gallery="meat"]', el => el.scrollIntoView({ block: 'center' }));
        await page.screenshot({ path: `${output}/${path === '/' ? 'home' : 'menu'}-${width}.png` });
      }
    }
    for (const [id, slug] of Object.entries(pies).filter(([id]) => width === 390 || id === 'meat')) {
      await page.goto(`${base}/pirogi/${slug}/?qa=1`, { waitUntil: 'networkidle0' });
      await toggle(id, true);
      if (width === 390 || width === 768) {
        await page.click(`[data-pie-gallery="${id}"] [data-cutaway-toggle]`);
        await page.waitForFunction(id => document.querySelector(`[data-pie-gallery="${id}"] [data-cutaway-toggle]`).getAttribute('aria-pressed') === 'true', {}, id);
        await page.screenshot({ path: `${output}/product-${id}-${width}.png` });
      }
    }
    for (const slug of guides) {
      await page.goto(`${base}/journal/${slug}/?qa=1`, { waitUntil: 'networkidle0' });
      assert.equal(await fits(page), true);
      assert.equal(await page.$$eval('.serving-route a', links => links.length), 4);
      assert.ok((await page.$eval('.serving-route [aria-current="page"]', el => el.href)).endsWith(`/journal/${slug}/`));
      assert.equal(await page.$$eval('.recommendation-card', elements => elements.length), 3);
      if (slug === 'kak-narezat-pirog') {
        assert.equal(await page.$$eval('.cutting-diagrams figure', elements => elements.length), 3);
        assert.equal(await page.$$eval('.cutting-diagrams line', elements => elements.length), 19);
        await page.$eval('.cutting-diagrams', el => el.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: `${output}/cutting-${width}.png` });
      }
    }
    // A failed request retains the original and permits an explicit retry.
    await page.setCacheEnabled(false);
    blocked = true;
    await page.goto(`${base}/pirogi/myasnoy-pirog/?qa=1`, { waitUntil: 'networkidle0' });
    await page.click('[data-cutaway-toggle]');
    await page.waitForFunction(() => document.querySelector('[data-cutaway-status]').textContent.includes('Не удалось'));
    assert.equal(await page.$eval('[data-cutaway-toggle]', el => el.getAttribute('aria-pressed')), 'false');
    blocked = false;
    await toggle('meat');
    await page.setJavaScriptEnabled(false);
    await page.goto(`${base}/?qa=1`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$$eval('[data-cutaway-toggle]', buttons => buttons.every(button => button.hidden)), true);
    assert.equal(await fits(page), true);
    report.views.push({ width, result: 'PASS', galleries: '6 home + 6 menu + product', deferredFetch: true, stableSize: true, keyboard: true, retry: true, noJS: true, guides: 4 });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  console.log('Cutaways and serving route PASS: 320/390/768/1024/1280, 153 SKU, on-demand loading, keyboard, error/retry, no-JS.');
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  browser.disconnect();
  await chrome.kill();
  if (server) await new Promise(done => server.close(done));
}
