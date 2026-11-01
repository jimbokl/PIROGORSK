import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const output = 'qa/editorial-cards-20261101';
const stage = process.env.QA_BASE ? 'production' : 'local';
const origin = 'https://pirogorsk.ru';
const report = { stage, destinations: 0, pages: 0, views: [], errors: [] };
await mkdir(output, { recursive: true });
const baseline = JSON.parse(await readFile(`${output}/baseline-links.json`, 'utf8'));
// All destinations and full headings, including the longer occasion names.
for (const [path, before] of Object.entries(baseline)) {
  const html = await readFile(resolve('site', '.' + path, 'index.html'), 'utf8');
  const cards = [...html.matchAll(/<a class="ed-link-card ed-link-card--illustrated"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
  const actual = cards.map(([, href, body]) => ({ href, title: body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1].replace(/<[^>]*>/g, '') }));
  assert.deepEqual(actual, before, `${path}: original destinations/headings`);
  for (const [, , card] of cards) {
    assert(card.includes('loading="lazy"') && card.includes('srcset='), `${path}: responsive lazy art`);
    assert(!card.includes('<button'), `${path}: no nested interactive controls`);
  }
  report.destinations += actual.length; report.pages++;
}
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const page = await browser.newPage();
const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.avif':'image/avif', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2', '.json':'application/json' };
const cache = new Map();
page.on('pageerror', error => report.errors.push(error.message));
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.setRequestInterception(true);
page.on('request', async request => {
  if (request.url().startsWith('data:')) return request.continue();
  if (!request.url().startsWith(origin + '/') || request.method() !== 'GET') return request.abort();
  const path = new URL(request.url()).pathname;
  try {
    if (!cache.has(path)) {
      if (process.env.QA_BASE) {
        const response = await fetch(process.env.QA_BASE + path);
        assert(response.ok, `${response.status} ${path}`);
        cache.set(path, { status:200, contentType:response.headers.get('content-type') || '', body:Buffer.from(await response.arrayBuffer()) });
      } else cache.set(path, { status:200, contentType:types[extname(path)] || 'text/html', body:await readFile(resolve('site', '.' + decodeURIComponent(path) + (path.endsWith('/') ? 'index.html' : ''))) });
    }
    await request.respond(cache.get(path));
  } catch (error) { report.errors.push(error.message); await request.abort(); }
});
const sample = [
  '/journal/dostavka-edy-v-zelenogradske/',
  '/journal/gde-poest-v-zelenogradske/',
  '/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/',
  '/povody/zelenogradsk/semeynyy-uzhin/',
  '/nabor/piknik-u-morya/',
  '/zelenogradsk/',
];
const go = path => page.goto(origin + path + '?qa=1', { waitUntil:'networkidle0' });
try {
  for (const width of [320,390,768,1280]) for (const path of sample) {
    await page.setViewport({ width, height:1000 }); await go(path);
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const img of document.querySelectorAll('.ed-link-art img')) img.loading = 'eager';
      await Promise.all([...document.querySelectorAll('.ed-link-art img')].map(img => img.decode()));
    });
    const metrics = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.ed-link-card--illustrated')];
      const rect = node => { const r = node.getBoundingClientRect(); return { top:r.top, left:r.left, width:r.width, height:r.height }; };
      return {
        overflow:document.documentElement.scrollWidth > innerWidth + 1,
        images:cards.every(c => c.querySelector('img').naturalWidth > 0),
        legible:cards.every(c => parseFloat(getComputedStyle(c.querySelector('h3')).fontSize) >= 24 && parseFloat(getComputedStyle(c.querySelector('p')).fontSize) >= 14),
        fullHeadings:cards.every(c => { const h = c.querySelector('h3'); return h.scrollHeight <= h.clientHeight + 1 && getComputedStyle(h).webkitLineClamp === 'none'; }),
        artHeights:cards.map(c => Math.round(c.querySelector('.ed-link-art').getBoundingClientRect().height)),
        sizes:cards.map(rect),
        columns:[...document.querySelectorAll('.ed-link-grid')].map(g => getComputedStyle(g).gridTemplateColumns),
        cardPadding:cards.length && getComputedStyle(cards[0]).padding,
        fonts:cards.map(c => ({ title:getComputedStyle(c.querySelector('h3')).fontSize, body:getComputedStyle(c.querySelector('p')).fontSize })),
      };
    });
    assert(!metrics.overflow, `${path} ${width}: overflow`);
    assert(metrics.images && metrics.legible && metrics.fullHeadings, `${path} ${width}: images/type/headings ${JSON.stringify(metrics)}`);
    assert.equal(metrics.cardPadding, '0px', `${path}: illustration flush to edge`);
    for (let i=0; i<metrics.sizes.length; i++) for (let j=i+1; j<metrics.sizes.length; j++) {
      const a=metrics.sizes[i], b=metrics.sizes[j];
      if (Math.abs(a.top-b.top)<1) assert(Math.abs(a.height-b.height)<1, `${path} ${width}: same-row heights`);
    }
    report.views.push({ path, width, ...metrics });
    if (path === sample[0]) {
      const section = await page.$('.ed-links-section');
      await section.screenshot({ path:`${output}/${stage}-cards-${width}.png` });
      await section.evaluate(node => node.scrollIntoView({block:'start'}));
      await page.mouse.move(width-1,999);
      await page.screenshot({ path:`${output}/${stage}-viewport-${width}.png` });
      await page.$$eval('.ed-links-section', nodes => nodes.at(-1).scrollIntoView({block:'start'}));
      await page.screenshot({ path:`${output}/${stage}-related-${width}.png` });
    }
  }
  await go(sample[0]);
  await page.$eval('.ed-link-card--illustrated', c => c.focus());
  await page.keyboard.press('Tab'); await page.keyboard.down('Shift');
  await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  const focus = await page.$eval('.ed-link-card--illustrated', c => ({ visible:c.matches(':focus-visible'), outline:getComputedStyle(c).outlineStyle, width:parseFloat(getComputedStyle(c).outlineWidth) }));
  assert(focus.visible && focus.outline !== 'none' && focus.width >= 2, 'visible keyboard focus');
  await page.setJavaScriptEnabled(false); await go(sample[0]);
  await Promise.all([page.waitForNavigation({ waitUntil:'networkidle0' }), page.click('.ed-link-card--illustrated')]);
  assert.equal(new URL(page.url()).pathname, '/zelenogradsk/');
  report.keyboard = focus; report.noJavaScriptNavigation = true;
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/${stage}-report.json`, JSON.stringify(report,null,2));
  console.log(`PASS ${stage}: ${report.destinations} destinations in ${report.pages} pages preserved; ${report.views.length} responsive views, images, equal row heights, full headings, keyboard and no-JS navigation.`);
} finally { await browser.close(); await chrome.kill(); }
