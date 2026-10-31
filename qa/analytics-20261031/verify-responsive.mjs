import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const output = new URL('./', import.meta.url).pathname;
await mkdir(output, {recursive: true});
const chrome = await launch({chromeFlags: ['--headless=new', '--disable-extensions', '--no-first-run']});
const browser = await puppeteer.connect({browserURL: `http://localhost:${chrome.port}`});
const results = [];
const origin = 'https://pirogorsk.ru';
try {
  for (const width of [390, 768]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width, height: 960});
    await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.method() === 'GET' && (request.url().startsWith(origin + '/') || request.url().startsWith('data:'))) return request.continue();
      return request.abort();
    });
    await page.evaluateOnNewDocument(() => localStorage.setItem('pirogorsk-city', 'Калининград'));
    for (const [label, path] of [['original', '/pirogi/myasnoy-pirog/'], ['supplier', '/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/'], ['home', '/'], ['menu', '/menu/']]) {
      const response = await page.goto(origin + path + '?qa=1', {waitUntil: 'networkidle0'});
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.$$eval('h1', elements => elements.length), 1);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path}: overflow at ${width}`);
      const result = {path, width, status: response.status(), overflow: false};
      if (['original', 'supplier'].includes(label)) {
        await page.$eval('.product-hero-art', element => element.scrollIntoView({block: 'center', behavior: 'instant'}));
        const images = await page.$$eval('.product-hero-art img', async elements => {
          await Promise.all(elements.map(image => image.decode()));
          return elements.map(image => ({src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight}));
        });
        assert(images.length > 0 && images.every(image => image.width > 0));
        const schema = await page.$$eval('script[type="application/ld+json"]', elements => elements.map(element => JSON.parse(element.textContent)));
        const flat = value => Array.isArray(value) ? value.flatMap(flat) : value && typeof value === 'object' ? [value, ...Object.values(value).flatMap(flat)] : [];
        const pages = flat(schema).filter(item => item['@type'] === 'ItemPage');
        assert.equal(pages.length, 1);
        assert.equal(pages[0]['@id'], origin + path + '#page');
        assert(!flat(schema).some(item => item['@type'] === 'Product'));
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({path: output + `production-${label}-${width}.png`});
        await page.$eval('[data-option-increase]', element => element.click());
        assert.equal(await page.$eval('[data-option-quantity]', element => element.value), '2');
        const price = await page.$eval('[data-option-price]', element => Number(element.textContent.replace(/\D/g, '')));
        const unit = await page.$eval('[data-product-options] input[type="radio"]:checked', element => Number(element.dataset.price));
        assert.equal(price, unit * 2);
        const before = await page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'));
        await page.$eval('[data-option-link]', element => element.click());
        assert.match(await page.$eval('[data-option-feedback]', element => element.textContent), /Добавлено в подборку: 2 шт/);
        const id = await page.$eval('[data-product-view]', element => element.dataset.productView);
        const added = await page.evaluate(id => JSON.parse(localStorage.getItem('pirogorsk-selection')).filter(item => item.id === id).reduce((sum, item) => sum + item.quantity, 0), id);
        assert.equal(added, before.filter(item => item.id === id).reduce((sum, item) => sum + item.quantity, 0) + 2);
        await page.$eval('[data-option-decrease]', element => element.click());
        assert.equal(await page.$eval('[data-option-quantity]', element => element.value), '1');
        await page.$eval('[data-product-options]', element => element.scrollIntoView({block: 'center', behavior: 'instant'}));
        await page.screenshot({path: output + `production-${label}-options-${width}.png`});
        Object.assign(result, {itemPage: true, images, quantityAndPrice: 'PASS', localSelectionAdd: 'PASS'});
      } else {
        const selector = label === 'home' ? '[data-home-catalog] [data-product]' : '.menu-feed [data-feed-id], .menu-feed [data-supplier-id]';
        const count = await page.$$eval(selector, elements => elements.length);
        assert.equal(count, 153);
        Object.assign(result, {skuCount: count});
        await page.screenshot({path: output + `production-${label}-${width}.png`});
      }
      results.push(result);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  await writeFile(output + 'responsive.json', JSON.stringify({checkedAt: new Date().toISOString(), base: origin, qaSuppressed: true, externalWritesBlocked: true, results}, null, 2) + '\n');
  console.log('PASS: production phone/tablet, eight page views, 153 home/menu SKU, both ItemPage templates, image decoding, quantity/price and local selection.');
} finally {
  await browser.disconnect();
  await chrome.kill();
}
