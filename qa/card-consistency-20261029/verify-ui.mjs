import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const [origin = 'http://127.0.0.1:4322', label = 'local', selectedWidths = '320,390,650,768,1280,1920'] = process.argv.slice(2);
const widths = selectedWidths.split(',').map(Number);
assert.ok(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const directory = new URL('./', import.meta.url);
const samples = [], errors = [], failedResources = [], posts = [];
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
let currentPage, currentWidth, failure;
const geometry = (cards, selectors) => cards.map(card => {
  const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, left: r.left, width: r.width, height: r.height, bottom: r.bottom + scrollY }; };
  return { id: card.dataset.product || card.dataset.supplierId, card: rect(card), ...Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, rect(card.querySelector(selector))])) };
});
function aligned(cards, keys, columns) {
  const rows = Array.from({ length: Math.ceil(cards.length / columns) }, (_, i) => cards.slice(i * columns, (i + 1) * columns));
  for (const row of rows) for (const key of keys) {
    for (const dimension of ['top', 'height']) {
      const values = row.map(card => card[key][dimension]);
      assert.ok(Math.max(...values) - Math.min(...values) < 1.1, `${key}.${dimension}: ${values}`);
    }
  }
}
try {
  for (const width of widths) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    currentPage = page; currentWidth = width;
    await page.setViewport({ width, height: 980, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === origin) failedResources.push({ url: response.url(), status: response.status() }); });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.method() === 'POST') { posts.push(request.url()); await request.abort(); }
      else if (new URL(request.url()).hostname === 'mc.yandex.ru') await request.respond({ status: 200, body: '' });
      else await request.continue();
    });
    await page.goto(`${origin}/?qa=1`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.$eval('.home-featured', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    for (let i = 0; i < 4; i++) {
      const card = `.home-featured .product-card:nth-child(${i + 1})`;
      await page.$eval(card, el => el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' }));
      await page.waitForFunction(selector => [...document.querySelectorAll(`${selector} img`)].every(img => img.complete && img.naturalWidth > 0), {}, card);
    }
    await page.$eval('.home-featured .product-grid', el => { el.scrollLeft = 0; });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => Promise.all(document.querySelector('.home-featured').getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `Home overflow ${width}`);
    const home = await page.$$eval('.home-featured .product-card', geometry, { visual: '.product-visual-link', title: 'h3', description: '.product-description', variants: '.variant-switch', bottom: '.product-bottom', price: '.product-price-wrap', button: '[data-add]' });
    aligned(home, ['card', 'visual', 'title', 'description', 'variants', 'bottom', 'price', 'button'], width <= 650 || width > 1060 ? 4 : 2);
    for (const card of home) {
      assert.ok(Math.abs(card.visual.width - card.visual.height) < 1.1, `Square ${card.id}`);
      assert.ok(card.title.bottom <= card.description.top + 1 && card.description.bottom <= card.variants.top + 1 && card.variants.bottom <= card.bottom.top + 1, `Overlapping rows ${card.id}`);
      assert.ok(card.button.height >= 44, `Button target ${card.id}`);
      assert.ok(card.bottom.bottom <= card.card.bottom, `Actions outside ${card.id}`);
    }
    if ([320, 390, 1280, 1920].includes(width)) await page.screenshot({ path: new URL(`${label}-home-${width}.png`, directory).pathname });
    // Exercise both the original and supplier formats and confirm the cart values.
    for (const index of [0, 3]) {
      const selector = `.home-featured .product-card:nth-child(${index + 1})`;
      await page.$eval(`${selector} .variant-switch label:last-of-type`, el => el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
      await page.focus(`${selector} input:checked`);
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.$eval(`${selector} input:checked`, el => document.activeElement === el), true, 'Radio keyboard focus');
      await page.click(`${selector} .variant-switch label:last-of-type`);
      const selected = await page.$eval(selector, card => ({ id: card.dataset.product, value: Number(card.querySelector('input:checked').value), price: card.querySelector('[data-price]').textContent }));
      await page.click(`${selector} [data-add]`);
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection')));
      assert.ok(stored.some(item => item.id === selected.id && item.value === selected.value));
      const after = await page.$eval(`${selector} [data-add]`, el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
      assert.ok(Math.abs(after.width - home[index].button.width) < 1.1 && Math.abs(after.height - home[index].button.height) < 1.1, 'Added state changes button size');
    }
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.home-featured .product-card', el => getComputedStyle(el).transitionDuration), '0s');
    await page.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `Menu overflow ${width}`);
    while (await page.$('.supplier-more:not([hidden])')) await page.click('.supplier-more:not([hidden])');
    const menu = [];
    for (const grid of await page.$$('.supplier-grid')) {
      const cards = await grid.$$eval('.supplier-card:not([hidden])', geometry, { visual: '.supplier-art-link', title: 'h3', description: '.supplier-format', variants: '.supplier-variants', bottom: '.supplier-card-bottom', button: '.supplier-card-bottom .button' });
      const columns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      aligned(cards, ['card', 'visual', 'title', 'description', 'variants', 'bottom', 'button'], columns);
      menu.push(...cards);
    }
    assert.equal(menu.length, 139);
    for (const card of menu) assert.ok(card.title.bottom <= card.description.top + 1 && card.description.bottom <= card.variants.top + 1 && card.variants.bottom <= card.bottom.top + 1, `Menu overlap ${card.id}`);
    if ([390, 1280].includes(width)) {
      await page.$eval('.supplier-card', el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.waitForFunction(() => [...document.querySelectorAll('.supplier-card:not([hidden])')].slice(0, 3).every(card => [...card.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0)));
      await page.screenshot({ path: new URL(`${label}-menu-${width}.png`, directory).pathname });
    }
    samples.push({ width, home, menu: { alignedCards: menu.length }, selections: true, keyboard: true, reducedMotion: true, overflow: false });
    await context.close();
    currentPage = undefined;
    console.log(`PASS ${label} ${width}px: aligned homepage and ${menu.length} supplier cards; variants, selection, reduced motion`);
  }
  assert.deepEqual(errors, []); assert.deepEqual(failedResources, []); assert.deepEqual(posts, []);
} catch (error) {
  failure = { width: currentWidth, message: error.message };
  if (currentPage) failure.incompleteImages = await currentPage.$$eval('.home-featured img', images => images.filter(img => !img.complete || !img.naturalWidth).map(img => ({ src: img.currentSrc, complete: img.complete, naturalWidth: img.naturalWidth }))).catch(() => []);
  throw error;
} finally {
  await writeFile(new URL(`${label}-readback.json`, directory), JSON.stringify({ checkedAt: new Date().toISOString(), origin, widths, samples, errors, failedResources, posts, failure }, null, 2) + '\n');
  await browser.close(); await Promise.resolve(chrome.kill());
}
