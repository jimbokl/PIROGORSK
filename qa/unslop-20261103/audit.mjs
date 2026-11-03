import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const stage = process.argv[2] || 'before';
const base = process.env.QA_BASE || 'http://127.0.0.1:4322';
const out = `qa/unslop-20261103/${stage}`;
await mkdir(out, { recursive: true });
const routes = [
  ['home', '/'], ['menu', '/menu/'], ['delivery', '/delivery/'],
  ['city', '/zelenogradsk/'], ['blog', '/blog/'],
  ['article', '/journal/dostavka-edy-v-zelenogradske/'],
  ['pie', '/pirogi/rybnyy-pirog/'],
  ['product', '/catalog/pirog-rzhanoy-zakusochnyy-s-seldyu-1100-g/'],
  ['bundles', '/nabory/'], ['planner', '/podbor/'],
];
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const report = { base, stage, timestamp: new Date().toISOString(), pages: [], errors: [] };
// Scrolling can trigger native lazy loading after networkidle2 has already fired.
// Wait for the visible images so screenshots also detect failed image requests.
async function waitForVisibleImages(page) {
  await page.waitForFunction(() => [...document.images].every(image => {
    const rect = image.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0
      && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
      && getComputedStyle(image).visibility !== 'hidden';
    return !visible || (image.complete && image.naturalWidth > 0);
  }), { timeout: 15000 });
}
try {
  for (const width of (process.env.QA_WIDTHS || '320,390,768,1280').split(',').map(Number)) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: width === 390 ? 900 : 1000, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    page.on('pageerror', error => report.errors.push(error.message));
    for (const [name, path] of routes.filter(([name]) => !process.env.QA_ROUTE || name === process.env.QA_ROUTE)) {
      const response = await page.goto(`${base}${path}?qa=1`, { waitUntil: 'networkidle2' });
      await page.evaluate(() => document.fonts.ready);
      await waitForVisibleImages(page);
      await page.screenshot({ path: `${out}/${name}-${width}.png` });
      const metrics = await page.evaluate(() => {
        const visible = element => element.getBoundingClientRect().height > 0 && getComputedStyle(element).visibility !== 'hidden';
        const labels = [...document.querySelectorAll('.eyebrow,.ed-eyebrow,.scene-card-eyebrow,.blog-card-category,.supplier-card-top')].filter(visible);
        return {
          title: document.title,
          overflow: document.documentElement.scrollWidth > innerWidth,
          h1: [...document.querySelectorAll('h1')].map(el => el.textContent.trim()),
          upperLabels: labels.filter(el => getComputedStyle(el).textTransform === 'uppercase').map(el => el.textContent.trim()).slice(0, 12),
          smallNegativeTracking: [...document.querySelectorAll('main :is(a,button,label,small,p)')].filter(visible).filter(el => {
            const style = getComputedStyle(el);
            return parseFloat(style.fontSize) < 16 && parseFloat(style.letterSpacing) < 0;
          }).slice(0, 12).map(el => ({ text: el.textContent.trim().slice(0, 70), size: getComputedStyle(el).fontSize, tracking: getComputedStyle(el).letterSpacing })),
          products: document.querySelectorAll('[data-home-catalog] [data-product]').length,
        };
      });
      report.pages.push({ name, path, width, status: response.status(), ...metrics });
      console.log(`${name} ${width}: HTTP ${response.status()}, overflow=${metrics.overflow}`);
      assert([200, 304].includes(response.status()), `${name}: HTTP ${response.status()}`);
      assert(!metrics.overflow, `${name} overflows at ${width}px`);
      assert.equal(metrics.h1.length, 1, `${name}: one h1`);
      if (name === 'home') assert.equal(metrics.products, 154);
      if (name === 'pie') {
        await page.$eval('[data-product-addons]', el => el.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {});
        await waitForVisibleImages(page);
        await page.screenshot({ path: `${out}/addons-${width}.png` });
      }
      if (!stage.startsWith('before')) {
        const sections = { home: '.home-offers', menu: '.home-departments', article: '.ed-links-section', delivery: '.delivery-city-grid', planner: '.planner-result' };
        const selector = sections[name];
        if (selector && await page.$(selector)) {
          await page.$eval(selector, el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await waitForVisibleImages(page);
          await page.screenshot({ path: `${out}/${name}-section-${width}.png` });
        }
      }
    }
    await page.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  assert.deepEqual(report.errors, []);
} finally {
  await browser.disconnect();
  await chrome.kill();
}
