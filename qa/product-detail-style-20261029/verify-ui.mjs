import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { catalog } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';

const [origin = 'http://127.0.0.1:4322', label = 'local', scope = 'all', selectedWidths = '320,390,768,1280'] = process.argv.slice(2);
const directory = new URL('./', import.meta.url);
const sampleIds = ['meat', 'apple', 'hb-osetinskiy-pirog-s-kuritsey-i-syrom', 'p39-497', 'cranberry', 'tableware'];
const longest = [...catalog].sort((a, b) => b.name.length - a.name.length)[0];
sampleIds.push(longest.id);
const samples = [], errors = [], failedResources = [], posts = [];
let active, failure;
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
try {
  for (const width of selectedWidths.split(',').map(Number)) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 980, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push({ ...active, message: error.message }));
    page.on('response', response => {
      if (response.status() >= 400 && new URL(response.url()).origin === origin) failedResources.push({ url: response.url(), status: response.status() });
    });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.method() === 'POST') { posts.push(request.url()); await request.abort(); }
      else if (new URL(request.url()).hostname === 'mc.yandex.ru') await request.respond({ status: 200, body: '' });
      else await request.continue();
    });
    const products = scope === 'all' && [320, 768, 1280].includes(width) ? catalog : catalog.filter(product => sampleIds.includes(product.id));
    for (const product of products) {
      const route = catalogProductHref(product);
      active = { width, id: product.id, route };
      const response = await page.goto(`${origin}${route}?qa=1`, { waitUntil: 'load' });
      assert.equal(response.status(), 200, route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.querySelectorAll('.product-hero-frame img')].every(img => img.complete && img.naturalWidth > 0));
      const metrics = await page.evaluate(() => {
        const rect = selector => {
          const el = document.querySelector(selector), r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
        };
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          headingCount: document.querySelectorAll('h1').length,
          art: rect('.product-hero-frame'), title: rect('h1'), panel: rect('.product-options'), price: rect('[data-option-price]'),
          button: rect('[data-option-link]'), bottom: rect('.product-options-bottom'),
          variants: [...document.querySelectorAll('.product-options-sizes label span')].map(el => {
            const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, overflow: el.scrollWidth > el.clientWidth };
          }),
          headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
          canonical: document.querySelector('link[rel="canonical"]').href,
        };
      });
      assert.equal(metrics.overflow, false, `Page overflow ${JSON.stringify(active)}`);
      assert.equal(metrics.headingCount, 1);
      assert.ok(Math.abs(metrics.art.width - metrics.art.height) < 1, 'Square image frame');
      assert.ok(metrics.art.x >= 0 && metrics.art.right <= width, 'Image in viewport');
      assert.ok(metrics.button.height >= 48 && metrics.button.width >= 44, 'CTA touch target');
      assert.ok(metrics.button.right <= metrics.panel.right && metrics.price.right <= metrics.panel.right - 14, `Panel content overflow ${JSON.stringify(active)}`);
      assert.ok(metrics.variants.every(variant => variant.height >= 48 && !variant.overflow), 'Variant touch targets and text');
      assert.ok(metrics.headingFont.includes('Playfair'), 'Shared heading font');
      assert.equal(new URL(metrics.canonical).pathname, route);
      if (width <= 760) {
        assert.ok(metrics.title.bottom < metrics.art.y && metrics.art.bottom <= metrics.panel.y, 'Mobile reading order');
        assert.ok(Math.abs(metrics.button.width - metrics.bottom.width) < 1, 'Full-width mobile CTA');
      } else {
        assert.ok(metrics.art.right < metrics.title.x && metrics.title.bottom <= metrics.panel.y, 'Desktop columns');
        assert.ok(metrics.price.right <= metrics.button.x + 1, `Price overlaps CTA ${JSON.stringify(active)}`);
      }
      // Real radio events must keep the price, destination and delivery totals synchronized.
      for (const variant of product.variants) {
        const selector = `.product-options input[value="${variant.value}"]`;
        await page.focus(selector);
        await page.keyboard.press('Space');
        const state = await page.$eval('[data-product-options]', el => ({
          value: Number(el.querySelector('input:checked').value),
          focused: document.activeElement === el.querySelector('input:checked'),
          price: Number(el.querySelector('[data-option-price]').textContent.replace(/\D/g, '')),
          href: el.querySelector('[data-option-link]').href,
          totals: [...el.querySelectorAll('[data-option-total]')].map(total => ({ cost: Number(total.dataset.deliveryCost), total: Number(total.textContent.replace(/\D/g, '')) })),
        }));
        assert.equal(state.value, variant.value); assert.equal(state.focused, true); assert.equal(state.price, variant.price);
        assert.equal(Number(new URL(state.href).searchParams.get('variant')), variant.value);
        assert.equal(new URL(state.href).searchParams.get('interest'), product.id);
        assert.ok(state.totals.length >= 3 && state.totals.every(row => row.total === variant.price + row.cost));
      }
      if (sampleIds.includes(product.id)) {
        await page.focus(`.product-options input[value="${product.defaultVariant}"]`);
        await page.keyboard.press('Space');
        await page.evaluate(() => document.activeElement?.blur());
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        assert.equal(await page.$eval('.product-options-sizes label span', el => getComputedStyle(el).transitionDuration), '0s');
        await page.$eval('.product-delivery', el => { el.open = true; });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Expanded delivery fits');
        await page.$eval('.product-delivery', el => { el.open = false; });
        if ([390, 1280].includes(width)) {
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          await page.screenshot({ path: new URL(`${label}-${product.id}-${width}.png`, directory).pathname });
          if (width === 390) await (await page.$('.product-hero')).screenshot({ path: new URL(`${label}-${product.id}-hero-390.png`, directory).pathname });
        }
        await page.emulateMediaFeatures([]);
      }
      samples.push({ ...active, variantsChecked: product.variants.length, ...metrics });
      if (width === 390 && ['meat', 'hb-osetinskiy-pirog-s-kuritsey-i-syrom', 'p39-497'].includes(product.id)) {
        await page.click('[data-option-link]');
        await page.waitForFunction((id, value) => {
          const selection = JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]');
          return selection.some(item => item.id === id && item.value === value);
        }, {}, product.id, product.defaultVariant);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Selection destination fits');
        samples.at(-1).selectionJourney = true;
      }
    }
    console.log(`PASS ${label} ${width}px: ${products.length} product pages, imagery, typography, buttons, keyboard variants, delivery, overflow`);
    await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(failedResources, []); assert.deepEqual(posts, []);
} catch (error) {
  failure = { ...active, message: error.message }; throw error;
} finally {
  await writeFile(new URL(`${label}-readback.json`, directory), JSON.stringify({ checkedAt: new Date().toISOString(), origin, scope, samples, errors, failedResources, posts, failure }, null, 2) + '\n');
  await browser.close(); await Promise.resolve(chrome.kill());
}
