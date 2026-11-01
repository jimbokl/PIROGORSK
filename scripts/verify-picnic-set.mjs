import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { catalog } from '../src/data/catalog.ts';

const output = process.env.QA_OUTPUT || 'qa/picnic-set-20261101';
const stage = process.env.QA_BASE ? 'production' : 'local';
const origin = 'https://pirogorsk.ru';
const href = '/catalog/baltiyskiy-piknik-set/';
await mkdir(output, { recursive: true });
const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.woff2':'font/woff2', '.avif':'image/avif', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.json':'application/json' };
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const page = await browser.newPage();
// Static captures must not race the category rail's scheduled smooth scroll.
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const report = { stage, widths: [], errors: [] };
page.on('pageerror', error => report.errors.push(error.message));
await page.setRequestInterception(true);
page.on('request', async request => {
  if (request.url().startsWith('data:')) return request.continue();
  // Read-only production QA; selection changes remain in this isolated browser.
  if (!request.url().startsWith(origin + '/') || request.method() !== 'GET') return request.abort();
  const path = new URL(request.url()).pathname;
  try {
    if (process.env.QA_BASE) {
      const response = await fetch(process.env.QA_BASE + path);
      assert(response.ok, `${response.status} ${path}`);
      await request.respond({ status: response.status, contentType: response.headers.get('content-type') || '', body: Buffer.from(await response.arrayBuffer()) });
    } else {
      await request.respond({ status: 200, contentType: types[path.endsWith('/') ? '.html' : extname(path)] || 'application/octet-stream', body: await readFile(resolve('site', '.' + decodeURIComponent(path) + (path.endsWith('/') ? 'index.html' : ''))) });
    }
  } catch (error) { report.errors.push(error.message); await request.abort(); }
});
const go = path => page.goto(origin + path + '?qa=1', { waitUntil: 'networkidle0' });
const money = selector => page.$eval(selector, el => Number(el.textContent.replace(/\D/g, '')));
const selected = () => page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'));
const view = async selector => {
  await page.evaluate(() => document.fonts.ready);
  await page.$$eval(`${selector} img`, images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Overflow ${page.url()}`);
};
try {
  await go(href);
  for (const width of (process.env.QA_WIDTHS || '320,390,768,1280').split(',').map(Number)) {
    await page.setViewport({ width, height: 1000 });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await go(href);
    await view('.product-hero');
    assert.equal(await page.$eval('h1', el => el.textContent), 'Балтийский пикник-сет');
    assert.equal(await page.$eval('link[rel=canonical]', el => el.href), origin + href);
    assert.equal(await money('[data-option-price]'), 350);
    assert.equal(await page.$$eval('.product-hero [data-portion-price],.product-hero [data-pie-portions]', els => els.length), 0, 'Accessory never becomes pie weight or portions');
    assert.equal(await page.$$eval('[data-picnic-set] article', els => els.length), 4);
    const text = await page.$eval('[data-picnic-set]', el => el.textContent);
    for (const phrase of ['на 8 частей', 'Две антисептические и две влажные', 'два пакетика', 'две порции мёда', 'термосе', 'Пироги — нам, чистый берег — всем', 'оплачивается отдельно']) assert(text.includes(phrase), phrase);
    assert.equal(await page.$$eval('[data-product-addons]', els => els.length), 0);
    await page.screenshot({ path: `${output}/${stage}-product-${width}.png` });
    await page.locator('[data-option-increase]').click();
    assert.equal(await money('[data-option-price]'), 700);
    await page.locator('[data-option-link]').click();
    const expected = [{ id: 'picnic-set', value: 1, quantity: 2 }];
    assert.deepEqual(await selected(), expected);
    await page.reload({ waitUntil: 'networkidle0' });
    assert.deepEqual(await selected(), expected, 'Reload never adds the accessory twice');
    await page.$eval('[data-picnic-set]', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: `${output}/${stage}-contents-${width}.png` });
    for (const source of ['/nabory/', '/nabor/piknik-u-morya/']) {
      await go(source);
      await view('[data-picnic-offer]');
      assert.equal(await page.$$eval('[data-picnic-offer] a', els => els.every(el => el.getAttribute('href') === '/catalog/baltiyskiy-piknik-set/')), true);
      await page.$eval('[data-picnic-offer]', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      if (source === '/nabory/') await page.screenshot({ path: `${output}/${stage}-hub-${width}.png` });
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.locator('[data-picnic-offer] .ed-button').click()]);
      assert.equal(new URL(page.url()).pathname, href);
    }
    await go('/');
    const card = '[data-product="picnic-set"]';
    assert.equal(await page.$$eval('[data-product]', els => els.length), catalog.length);
    assert.equal(await page.$$eval(card, els => els.length), 1);
    await page.locator('[data-home-category="extras"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-product="picnic-set"]').hidden);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.$eval('[data-home-more]', el => el.hidden && getComputedStyle(el).display === 'none'), true, 'No zero-count load button after the complete catalogue is revealed');
    await view(card);
    await page.$eval(card, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => { const r = document.querySelector('[data-product="picnic-set"]').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
    await page.screenshot({ path: `${output}/${stage}-catalog-${width}.png` });
    report.widths.push({ width, price: 350, quantityTwo: 700, add: true, reload: true, hub: true, scenario: true, catalog: catalog.length });
  }
  const sitemap = process.env.QA_BASE ? await (await fetch(process.env.QA_BASE + '/sitemap.xml')).text() : await readFile('site/sitemap.xml', 'utf8');
  assert.equal(sitemap.split(`<loc>${origin + href}</loc>`).length - 1, 1);
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/${stage}-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`Picnic set PASS (${stage}): 350 ₽ separately, 2×350=700, add/reload, hub/scenario/catalog, sitemap, ${report.widths.map(row => row.width).join('/')}px.`);
} catch (error) {
  await writeFile(`${output}/${stage}-failure.json`, JSON.stringify({ ...report, error: error.message, url: page.url() }, null, 2) + '\n');
  await page.screenshot({ path: `${output}/${stage}-failure.png` });
  throw error;
} finally { await browser.disconnect(); chrome.kill(); }
