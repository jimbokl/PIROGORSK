import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const base = process.env.QA_BASE || 'http://127.0.0.1:4322';
const stage = process.env.QA_BASE ? 'production' : 'local';
const out = `qa/mobile-performance-20261103/${stage}-hero`;
await mkdir(out, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const report = { base, stage, timestamp: new Date().toISOString(), widths: [], errors: [] };
try {
  for (const width of [320, 390, 480, 481, 600, 768, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: 1000, deviceScaleFactor: 1.75 });
    const requests = [];
    page.on('request', r => { if (r.url().includes('/banner-city.')) requests.push(r.url()); });
    page.on('pageerror', e => report.errors.push(`${width}: ${e.message}`));
    await page.goto(`${base}/?qa=1`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelector('[data-tasting-scene="pies"] img')?.complete);
    const initial = await page.evaluate(() => {
      const hero = document.querySelector('[data-tasting-hero]');
      const img = hero.querySelector('[data-tasting-scene="pies"] img');
      return {
        currentSrc: img.currentSrc, loading: img.loading, priority: img.fetchPriority,
        preloads: [...document.querySelectorAll('link[rel="preload"][as="image"]')]
          .filter(el => matchMedia(el.media).matches)
          .map(el => ({ sizes: el.imageSizes, srcset: el.imageSrcset })),
        lazy: [...hero.querySelectorAll('[data-tasting-scene][hidden] img')].every(el => el.loading === 'lazy'),
        count: document.querySelectorAll('[data-home-catalog] [data-product]').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        height: hero.getBoundingClientRect().height,
      };
    });
    assert.equal(initial.count, 154);
    assert.equal(initial.preloads.length, 1, `matching preloads at ${width}: ${JSON.stringify(initial)}`);
    assert(initial.preloads[0].srcset.includes(new URL(initial.currentSrc).pathname));
    assert.equal(initial.loading, 'eager');
    assert.equal(initial.priority, 'high');
    assert(initial.lazy);
    assert(!initial.overflow);
    assert.equal(requests.length, 1, `duplicate city banner at ${width}: ${requests.join(', ')}`);
    if ([320, 390, 768, 1280].includes(width)) {
      await page.$eval('[data-tasting-hero]', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.screenshot({ path: `${out}/hero-${width}.png` });
    }
    const heights = [];
    for (const flavor of ['company', 'tea', 'mini', 'seaside', 'bake', 'warm', 'pies']) {
      await page.click(`[data-tasting-select="${flavor}"]`);
      await page.waitForFunction(value => document.querySelector('[data-tasting-hero]').dataset.flavor === value, {}, flavor);
      heights.push(await page.$eval('[data-tasting-hero]', el => el.getBoundingClientRect().height));
    }
    assert(heights.every(h => Math.abs(h - initial.height) <= 1), `slide heights drift at ${width}: ${heights}`);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.focus('[data-tasting-next]');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('[data-tasting-hero]').dataset.flavor === 'company');
    report.widths.push({ width, ...initial, requests, heights, keyboardReducedMotion: true });
    await context.close();
  }
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setViewport({ width: 390, height: 1000 });
  await page.goto(`${base}/`, { waitUntil: 'networkidle0' });
  assert.equal(await page.$$eval('[data-home-catalog] [data-product]', els => els.filter(el => el.getBoundingClientRect().height > 0).length), 154);
  assert.equal(await page.$eval('[data-tasting-cta]', el => el.getAttribute('href')), '/menu/');
  report.noJavaScript = true;
  assert.deepEqual(report.errors, []);
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(`PASS ${stage}: one matching responsive preload, one banner download, stable seven slides at seven widths, keyboard/reduced motion, all 154 products without JS.`);
} finally {
  await browser.disconnect();
  await chrome.kill();
}
