import assert from 'node:assert/strict';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { planningUpdates, portionTableRows, breakfastExamples } from '../src/data/planning-updates.ts';
import { occasionPresets } from '../src/data/occasion-presets.ts';
import { products } from '../src/data/catalog.ts';
import { parsePlan } from '../src/lib/pie-planner.ts';

const output = process.env.QA_OUTPUT || 'qa/content-priority-20261102';
const stage = process.env.QA_BASE ? 'production' : 'local';
const root = resolve('site');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'application/javascript', '.avif':'image/avif', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2', '.json':'application/json' };
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const file = resolve(root, '.' + decodeURIComponent(path) + (path.endsWith('/') ? 'index.html' : ''));
    assert(file.startsWith(root + '/'));
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await mkdir(output, { recursive: true });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = process.env.QA_BASE || `http://127.0.0.1:${server.address().port}`;
const report = { stage, articles: [], views: [], seeds: [], transfer: null, errors: [] };
let chrome, browser;
const normalize = value => value.replace(/\s+/gu, ' ').trim();
try {
  chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions', '--no-first-run'] });
  browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = new URL(req.url());
    if (req.method() !== 'GET' || (['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(base).origin)) req.abort();
    else req.continue();
  });
  const go = async path => {
    const url = new URL(path, base); url.searchParams.set('qa', '1');
    const response = await page.goto(url.href, { waitUntil: 'networkidle0' });
    assert.equal(response.status(), 200, path);
    await page.evaluate(() => document.fonts.ready);
  };
  for (const update of planningUpdates) {
    await go(update.ownerURL);
    const article = await page.evaluate(() => {
      const structured = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => JSON.parse(node.textContent)['@graph'] || []);
      return {
        text: document.querySelector('.ed-article').textContent,
        canonical: document.querySelector('link[rel="canonical"]').href,
        h1: document.querySelectorAll('h1').length,
        schema: structured.find(item => item['@type'] === 'BlogPosting'),
        anchors: [...document.querySelectorAll('.article-contents a')].every(a => document.querySelector(a.getAttribute('href'))),
        links: [...document.querySelectorAll('.ed-article a[href^="/"]')].map(a => a.getAttribute('href')),
      };
    });
    assert.equal(article.h1, 1); assert(article.anchors);
    assert.equal(article.canonical, 'https://pirogorsk.ru' + update.ownerURL);
    assert.equal(article.schema.dateModified, update.modified);
    assert.equal(article.schema.datePublished, update.ownerURL.includes('skolko-piroga') ? '2026-10-24' : '2026-10-31');
    for (const section of update.sections) {
      assert(article.text.includes(section.title));
      for (const paragraph of section.paragraphs || []) assert(normalize(article.text).includes(normalize(paragraph)));
      for (const row of section.table?.rows || []) for (const cell of row) assert(normalize(article.text).includes(normalize(cell)));
    }
    for (const href of article.links) assert((await stat(resolve(root, '.' + new URL(href, base).pathname + 'index.html'))).isFile(), href);
    if (update.ownerURL.includes('skolko-piroga')) {
      const rows = await page.$$eval('.ed-reading-table tbody tr', nodes => nodes.map(node => [...node.children].map(cell => cell.textContent)));
      assert.deepEqual(rows, portionTableRows);
    }
    report.articles.push({ path: update.ownerURL, dates: article.schema, links: article.links.length, sections: update.sections.length });
  }
  for (const width of [320, 390, 768, 1280]) for (const path of [...planningUpdates.map(item => item.ownerURL), '/podbor/?guests=15&grams=250']) {
    await page.setViewport({ width, height: 900 }); await go(path);
    const metrics = await page.evaluate(async () => {
      for (const img of document.images) img.loading = 'eager';
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, brokenImages: [...document.images].filter(img => !img.naturalWidth).map(img => img.src), narrowLinks: [...document.querySelectorAll('.ed-reading-links a')].filter(a => a.getBoundingClientRect().height < 44).length };
    });
    assert(!metrics.overflow, `Overflow ${path} ${width}`); assert.deepEqual(metrics.brokenImages, []); assert.equal(metrics.narrowLinks, 0);
    const slug = new URL(path, base).pathname.split('/').filter(Boolean).at(-1);
    if ([390, 768, 1280].includes(width)) {
      await page.screenshot({ path: `${output}/${stage}-${slug}-${width}.png`, fullPage: true });
      if (path.startsWith('/journal/')) {
        await page.$$eval('.ed-article table', nodes => nodes.at(-1).scrollIntoView({block:'center'}));
        await page.screenshot({ path: `${output}/${stage}-${slug}-table-${width}.png` });
      }
    }
    report.views.push({ path, width, ...metrics });
  }
  const cases = [
    ['', 4, 300], ['guests=2&grams=150', 2, 150], ['guests=15&grams=250', 15, 250], ['guests=30&grams=500', 30, 500],
    ...['0','31','2.5','NaN','Infinity','-2','1e1',''].map(value => [`guests=${value}&grams=251`, 4, 300]),
    ['guests=6&grams=150<script>', 6, 300], ['guests=abc&grams=350', 4, 350],
    ...occasionPresets.map(preset => [`occasion=${preset.slug}`, preset.guests, preset.grams]),
    ['occasion=v-ofis-na-den-rozhdeniya&guests=6&grams=350', 6, 350],
    ['occasion=v-ofis-na-den-rozhdeniya&guests=0&grams=251', 12, 250],
  ];
  for (const [query, guests, grams] of cases) {
    await go('/podbor/?' + query);
    const seed = await page.evaluate(() => ({ guests: Number(document.querySelector('[name="guests"]').value), grams: Number(document.querySelector('[name="grams"]').value), weight: document.querySelector('[data-planner-weight]').textContent, href: document.querySelector('[data-planner-continue]').href, goals: (window.ym?.a || []).filter(args => args[1] === 'reachGoal').map(args => args[2]) }));
    assert.equal(seed.guests, guests, query); assert.equal(seed.grams, grams, query);
    const items = parsePlan(new URL(seed.href).searchParams.get('items'), products);
    assert(items); assert.equal(items.reduce((sum, item) => sum + item.value * item.quantity, 0), Math.ceil(guests * grams / 500) * 500);
    assert(!seed.goals.includes('calculator_interact'), 'Opening a link must not emit interaction');
    report.seeds.push({ query, guests, grams, weight: seed.weight });
  }
  await go('/journal/skolko-piroga-na-cheloveka/');
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}), page.$eval('a[href="/podbor/?guests=6&grams=250"]', a => a.click())]);
  assert.equal(await page.$eval('[name="guests"]', node => node.value), '6');
  await page.$eval('[name="guests"]', node => { node.value='7'; node.dispatchEvent(new Event('input', {bubbles:true})); });
  await page.select('[name="grams"]', '350');
  const href = await page.$eval('[data-planner-continue]', node => node.href);
  const transferred = parsePlan(new URL(href).searchParams.get('items'), products);
  assert.equal(transferred.reduce((sum, item) => sum + item.value * item.quantity, 0), 2500);
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}), page.$eval('[data-planner-continue]', node => node.click())]);
  await page.$eval('[data-open="selection-dialog"]', node => node.click());
  await page.waitForFunction(() => document.querySelector('#selection-dialog').open);
  assert((await page.$eval('[data-selection-items]', node => node.textContent)).includes('Мясной пирог'));
  report.transfer = { fromArticle: true, editedGuests: 7, editedGrams: 350, weight: 2500, selectionOpened: true };
  await page.setJavaScriptEnabled(false); await go('/podbor/?guests=15&grams=250');
  assert((await page.$eval('noscript', node => node.textContent)).includes('пример на четверых'));
  assert.deepEqual(report.errors, []);
  report.breakfast = breakfastExamples.map(({guests,pieWeight,piePrice,total}) => ({guests,pieWeight,piePrice,total}));
  await writeFile(`${output}/${stage}-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`Content priority PASS (${stage}): 3 article owners, ${report.views.length} responsive views, ${report.seeds.length} query cases, edited selection transfer, no-JS fallback.`);
} finally {
  await browser?.disconnect(); await chrome?.kill(); await new Promise(done => server.close(done));
}
