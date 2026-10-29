import assert from 'node:assert/strict';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';
import { newPageProducts } from '../../src/data/product-pages.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';
const [origin = 'http://127.0.0.1:4323', label = 'local'] = process.argv.slice(2);
const directory = new URL('./', import.meta.url);
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const samples = [], errors = [];
const routes = ['hearty-pies','sweet-pies','siberian-pies','kurniki','prussian-pies','ossetian-pies'].map(category => newPageProducts.find(p => p.category === category)).filter(Boolean);
routes.push(...newPageProducts.filter(p => ['p39-483','p39-482'].includes(p.id)));
// Exercise both pies offered in two real weights.

const number = text => Number(text.replace(/[^0-9]/g, ''));
try {
  for (const width of [320, 390, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$$eval('[data-supplier-artwork]', nodes => nodes.length), 139);
    // Decode every illustrated SKU, including cards hidden by pagination.
    const images = await page.$$eval('[data-supplier-artwork] img', async nodes => {
      nodes.forEach(img => { img.loading = 'eager'; });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return Promise.all(nodes.map(async img => {
        // The responsive candidate may change when lazy loading is enabled.
        // Wait for the final selected source, then report an actual decode failure.
        let error;
        for (let attempt = 0; attempt < 3; attempt++) {
          try { await img.decode(); error = undefined; break; }
          catch (caught) { error = caught.message; await new Promise(resolve => setTimeout(resolve, 100)); }
        }
        return { width: img.naturalWidth, src: img.currentSrc, error };
      }));
    });
    assert.deepEqual(images.filter(img => !img.width || img.error), [], 'every final responsive candidate decodes');
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true);
    await page.$eval('#pirogi39', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: new URL(`${label}-catalog-${width}.png`, directory).pathname });
    await page.$eval('[data-supplier-id]', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: new URL(`${label}-cards-${width}.png`, directory).pathname });
    for (const product of routes) {
      const route = catalogProductHref(product);
      await page.goto(`${origin}${route}?qa=1`, { waitUntil: 'networkidle0' });
      assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `${route} at ${width}`);
      if (product === routes[0]) await page.screenshot({ path: new URL(`${label}-product-hero-${width}.png`, directory).pathname });
      const last = product.variants.at(-1);
      await page.click(`[data-product-options] input[value="${last.value}"] + span`);
      assert.equal(number(await page.$eval('[data-option-price]', el => el.textContent)), last.price);
      await page.click('.product-delivery summary');
      const totals = await page.$$eval('[data-option-total]', nodes => nodes.map(el => ({ cost: Number(el.dataset.deliveryCost), total: el.textContent })));
      for (const total of totals) assert.equal(number(total.total), last.price + total.cost);
      const href = await page.$eval('[data-option-link]', el => el.getAttribute('href'));
      assert.equal(Number(new URL(href, origin).searchParams.get('variant')), last.value);
      if (product === routes[0] || product.category === 'dough') await page.screenshot({ path: new URL(`${label}-${product.id}-${width}.png`, directory).pathname });
      if (product === routes[0]) {
        // Keep qa=1 throughout; verify the actual product-page CTA without submitting.
        const target = new URL(href, origin); target.searchParams.set('qa', '1');
        await page.goto(target.href, { waitUntil: 'networkidle0' });
        await page.waitForSelector('#selection-dialog[open]');
        assert.match(await page.$eval('#selection-dialog', el => el.textContent), new RegExp(product.name));
        assert.equal(await page.$eval('#selection-dialog', el => el.scrollWidth <= el.clientWidth), true);
      }
      samples.push({ width, route, variant: last.value, price: last.price, deliveryTotals: totals.length, overflow: false });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  const result = { origin, checkedAt: new Date().toISOString(), decodedSupplierImages: 139, samples, errors, note: 'QA mode; no form submission.' };
  await writeFile(new URL(`${label}-readback.json`, directory), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ origin, samples: samples.length, images: 139, errors }));
} finally {
  await browser.close();
  await chrome.kill();
}
