// QA-17 investigation: original product-page physical click, isolated from catalog screenshots.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { catalog } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';

const output = new URL('./label-stress/', import.meta.url).pathname;
const origin = 'https://pirogorsk.ru';
const site = resolve('site');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const iterations = Number(process.env.QA_ITERATIONS || 20);
const cpu = Number(process.env.QA_CPU || 4);
const width = Number(process.env.QA_WIDTH || 1280);
const mini = catalog.find(p => p.category === 'mini-pies' && p.variants.length === 3);
const products = ['meat', mini.id, 'p39-10', catalog.find(p => p.supplier?.priceFrom).id, 'hb-osetinskiy-pirog-s-kuritsey-i-syrom'].map(id => catalog.find(p => p.id === id));
const selector = '[data-product-options] label:last-of-type';
const report = { cpu, width, height: 1000, iterations, runs: [] };
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-dev-shm-usage'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const context = await browser.createBrowserContext();
const page = await context.newPage();
await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
await (await page.createCDPSession()).send('Emulation.setCPUThrottlingRate', { rate: cpu });
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  if (url.protocol === 'data:') return request.continue();
  if (request.method() !== 'GET' || url.origin !== origin) return request.abort();
  const path = resolve(site, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
  try { await request.respond({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(path) }); }
  catch { await request.abort(); }
});
const geometry = () => page.$$eval(selector, labels => ({
  scrollY, viewport: [innerWidth, innerHeight], clientWidth: document.documentElement.clientWidth,
  labels: labels.map(el => {
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { rect: rect.toJSON(), html: el.outerHTML, hit: hit?.outerHTML.slice(0, 300), display: getComputedStyle(el).display };
  })
}));
try {
  for (let iteration = 0; iteration < iterations; iteration++) for (const product of products) {
    const run = { iteration, product: product.id };
    await page.goto(`${origin}${catalogProductHref(product)}?qa=1`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    run.before = await geometry();
    try {
      await page.click(selector);
      assert.equal(await page.$eval('[data-product-options] input:checked', el => el.value), String(product.variants.at(-1).value));
      await page.$eval('[data-option-increase]', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.click('[data-option-increase]');
      assert.equal(await page.$eval('[data-option-price]', el => Number(el.textContent.replace(/\D/g, ''))), product.variants.at(-1).price * 2);
      run.result = 'PASS';
    } catch (error) {
      run.result = 'FAIL'; run.error = error.stack; run.after = await geometry();
      await page.screenshot({ path: `${output}/failure-${product.id}-${iteration}.png` });
      throw error;
    } finally { report.runs.push(run); await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); }
    if (product === products.at(-1)) console.log(`PASS: product-label iteration ${iteration + 1}/${iterations}`);
  }
} finally { browser.disconnect(); await chrome.kill(); }
