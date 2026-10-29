import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { catalog } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';

const [origin = 'http://127.0.0.1:4322', label = 'local'] = process.argv.slice(2);
const directory = new URL('./', import.meta.url);
const samples = [], errors = [], failedResources = [], posts = [];
const products = ['meat', 'p39-483', 'tableware'].map(id => catalog.find(p => p.id === id));
products.push(catalog.find(p => p.category === 'mini-pies'));
assert.ok(products.every(Boolean));
// Check the shared navigation on every emitted product page, then exercise
// representative journeys in a real browser, including the published origin.
for (const product of catalog) {
  const html = await readFile(new URL(`../../site${catalogProductHref(product)}index.html`, import.meta.url), 'utf8');
  assert.match(html, /class="product-menu-back" href="\/menu\//, product.id);
}
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
try {
  for (const width of [320, 390, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400 && new URL(response.url()).origin === origin) failedResources.push(response.url());
    });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.method() === 'POST') { posts.push(request.url()); await request.abort(); }
      else if (new URL(request.url()).hostname === 'mc.yandex.ru') await request.respond({ status: 200, body: '' });
      else await request.continue();
    });
    const go = async path => {
      const url = new URL(path, origin); url.searchParams.set('qa', '1');
      await page.goto(url.href, { waitUntil: 'networkidle0' });
      assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `${path} at ${width}`);
    };
    await go('/menu/');
    assert.equal(await page.$eval('[data-menu-status]', el => el.textContent), 'Позиций по вашему выбору: 153');
    assert.equal(await page.$$eval('[data-menu-jump]', links => links.length), 4);
    await page.screenshot({ path: new URL(`${label}-menu-top-${width}.png`, directory).pathname });
    await page.$eval('[data-menu-finder]', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: new URL(`${label}-menu-sections-${width}.png`, directory).pathname });
    await page.type('#menu-search', 'сыром курицей');
    const matches = await page.$$eval('[data-supplier-id]:not([hidden])', cards => cards.map(card => card.dataset.supplierSearch));
    assert.ok(matches.length > 0 && matches.every(text => /сыром/i.test(text) && /курицей/i.test(text)));
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('#menu-search', el => el.value), 'сыром курицей');
    assert.equal(await page.$eval('link[rel=canonical]', el => el.href), `${origin === 'http://127.0.0.1:4322' ? 'https://pirogorsk.ru' : origin}/menu/`);
    await page.click('[data-menu-reset]');
    await page.$eval('[data-supplier-id]', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: new URL(`${label}-menu-card-${width}.png`, directory).pathname });
    for (const product of products) {
      await go(catalogProductHref(product));
      const back = await page.$eval('.product-menu-back', el => el.getAttribute('href'));
      assert.equal(new URL(back, origin).pathname, '/menu/');
      await page.$eval('.product-menu-back', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      if (product.id === 'p39-483') await page.screenshot({ path: new URL(`${label}-product-options-${width}.png`, directory).pathname });
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('.product-menu-back')]);
      const target = new URL(back, origin);
      if (target.searchParams.has('group')) assert.equal(await page.$eval(`${target.hash} [data-supplier-filter="${target.searchParams.get('group')}"]`, el => el.getAttribute('aria-pressed')), 'true');
      else assert.equal(new URL(page.url()).hash, target.hash);
    }
    for (const slug of ['kaliningrad', 'zelenogradsk', 'svetlogorsk']) {
      await go(`/dostavka/${slug}/`);
      const text = await page.$eval('.city-stage', el => el.textContent);
      assert.match(text, slug === 'svetlogorsk' ? /Следующий этап.*после первых 30 дней/ : /Первый этап запуска.*Калининграда и Зеленоградска/);
    }
    await go('/podbor/');
    assert.match(await page.$eval('.planner-hint', el => el.textContent), /восьми концептов.*500 г и 1 кг/);
    samples.push({ width, searchReload: true, productReturnLinks: products.length, cityStages: 3, overflow: false });
    await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(failedResources, []); assert.deepEqual(posts, []);
  await writeFile(new URL(`${label}-readback.json`, directory), JSON.stringify({ checkedAt: new Date().toISOString(), origin, productLinks: catalog.length, samples, errors, failedResources, posts }, null, 2) + '\n');
  console.log(JSON.stringify({ origin, productLinks: catalog.length, samples, errors, failedResources, posts }));
} finally {
  await browser.close();
  await Promise.resolve(chrome.kill());
}
