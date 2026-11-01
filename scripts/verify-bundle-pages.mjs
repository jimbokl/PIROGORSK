import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { bundles } from '../src/data/bundles.ts';

const stage = process.env.QA_BASE ? 'production' : 'local';
const output = process.env.QA_OUTPUT || 'qa/bundle-pages-20261101';
await mkdir(output, { recursive: true });
const origin = 'https://pirogorsk.ru';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json' };
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const report = { stage, widths: [], noJs: [], errors: [] };
const context = await browser.createBrowserContext();
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
await page.setRequestInterception(true);
page.on('request', async request => {
  if (request.url().startsWith('data:')) return request.continue();
  // Browser QA reads assets only; never submits an interest or analytics event.
  if (!request.url().startsWith(origin + '/') || request.method() !== 'GET') return request.abort();
  const path = new URL(request.url()).pathname;
  try {
    if (process.env.QA_BASE) {
      const response = await fetch(process.env.QA_BASE + path);
      if (!response.ok) report.errors.push(`${response.status} ${path}`);
      await request.respond({ status: response.status, contentType: response.headers.get('content-type') || '', body: Buffer.from(await response.arrayBuffer()) });
    } else {
      await request.respond({ status: 200, contentType: types[path.endsWith('/') ? '.html' : extname(path)] || 'application/octet-stream', body: await readFile(resolve('site', '.' + decodeURIComponent(path) + (path.endsWith('/') ? 'index.html' : ''))) });
    }
  } catch (error) { report.errors.push(`${path}: ${error.message}`); await request.abort(); }
});
const go = path => page.goto(origin + path + '?qa=1', { waitUntil: 'networkidle0' });
const money = selector => page.$eval(selector, node => Number(node.textContent.replace(/\D/g, '')));
const selected = () => page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'));
const view = async () => {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.querySelectorAll('main img')].map(image => { image.loading = 'eager'; return image.decode(); })));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Overflow: ${page.url()}`);
};
try {
  for (const width of (process.env.QA_WIDTHS || '320,390,768,1280').split(',').map(Number)) {
    await page.setViewport({ width, height: 1000 });
    const row = { width, sources: [], pages: [] };
    for (const source of ['/', '/menu/', '/nabory/']) {
      await go(source);
      assert(await page.$$eval('.site-navigation a[href="/nabory/"]', nodes => nodes.length > 0), 'Navigation links to the bundles hub');
      const links = await page.$$eval('.offer-title', nodes => nodes.map(node => ({ title: node.textContent, href: node.getAttribute('href') })));
      assert.deepEqual(links, bundles.map(bundle => ({ title: bundle.title, href: bundle.href })), `${source} bundle destinations`);
      assert.deepEqual(await page.$$eval('.offer-art', nodes => nodes.map(node => node.getAttribute('href'))), bundles.map(bundle => bundle.href));
      if (source === '/nabory/') {
        await view();
        assert.equal(await page.$$eval('h1', nodes => nodes.length), 1);
        if (width <= 700) assert.equal(await page.$eval('.offers-grid', node => node.scrollWidth > node.clientWidth + 1), false, 'Hub lists every bundle vertically on phones');
        await page.screenshot({ path: `${output}/${stage}-hub-${width}.png` });
      }
      // Follow the previously broken title from each entry point, not only direct URLs.
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('.offer-title[href="/nabor/sytnoe-i-sladkoe/"]')]);
      assert.equal(new URL(page.url()).pathname, '/nabor/sytnoe-i-sladkoe/');
      row.sources.push(source);
    }
    for (const bundle of bundles) {
      await page.evaluate(() => localStorage.removeItem('pirogorsk-selection'));
      await go(bundle.href);
      await view();
      assert.deepEqual(await page.$$eval('h1', nodes => nodes.map(node => node.textContent)), [bundle.title]);
      assert.equal(await page.$eval('link[rel=canonical]', node => node.href), origin + bundle.href);
      assert.equal(await page.$eval('.ed-breadcrumbs li:nth-child(2) a', node => node.getAttribute('href')), '/nabory/');
      const beforeSummary = await page.$eval('[data-bundle-page-summary]', node => node.textContent);
      const price = await money('[data-bundle-page-price]');
      assert.equal(await page.$$eval('.bundle-items li', nodes => nodes.length), bundle.items.length);
      const controls = await page.$$eval('.bundle-items a,.bundle-actions a,.bundle-more-grid a', nodes => nodes.map(node => ({ height: node.getBoundingClientRect().height, overflow: node.scrollWidth > node.clientWidth + 1 })));
      assert(controls.every(control => control.height >= 44 && !control.overflow), `Controls ${bundle.id} ${width}`);
      if (bundle.id === 'sweet-table') {
        assert.equal(price, 5350);
        assert.match(beforeSummary, /2,4 кг/);
        assert.match(await page.$eval('.bundle-items', node => node.textContent), /куриным филе.*творогом и изюмом/s);
        await page.screenshot({ path: `${output}/${stage}-sweet-table-${width}.png` });
        await page.$eval('.bundle-composition', node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: `${output}/${stage}-sweet-table-actions-${width}.png` });
      }
      await page.locator('.bundle-actions [data-bundle]').click();
      assert.equal(await page.$eval('#selection-dialog', node => node.open), true);
      assert.deepEqual(await selected(), bundle.items, 'Page adds its complete composition once');
      assert.equal(await money('#selection-dialog [data-total]'), price);
      await page.locator('#selection-dialog [data-close]').click();
      await page.waitForFunction(() => !document.querySelector('#selection-dialog').open && document.activeElement?.matches('.bundle-actions [data-bundle]'));
      await page.$eval('.bundle-actions [data-edit-bundle]', node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.locator('.bundle-actions [data-edit-bundle]').click();
      await page.waitForFunction(() => document.querySelector('#bundle-editor').open, { timeout: 5000 });
      assert.equal(await page.$eval('#bundle-editor-heading', node => node.textContent), bundle.title);
      assert.equal(await money('#bundle-editor [data-bundle-total]'), price);
      assert.equal(await page.$eval('#bundle-editor [data-bundle-summary]', node => node.textContent), beforeSummary, 'Editor summary has its own target');
      assert.equal(await page.$eval('[data-bundle-page-summary]', node => node.textContent), beforeSummary, 'Editing does not overwrite the page summary');
      await page.keyboard.press('Escape');
      await page.reload({ waitUntil: 'networkidle0' });
      assert.deepEqual(await selected(), bundle.items, 'Reload never adds the bundle twice');
      row.pages.push({ id: bundle.id, href: bundle.href, price, summary: beforeSummary, add: true, edit: true });
    }
    report.widths.push(row);
  }
  await page.setViewport({ width: 390, height: 1000 });
  await page.setJavaScriptEnabled(false);
  for (const bundle of bundles) {
    await go('/nabory/');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(`.offer-title[href="${bundle.href}"]`)]);
    assert.equal(new URL(page.url()).pathname, bundle.href);
    assert.equal(await page.$eval('h1', node => node.textContent), bundle.title);
    assert.equal(await page.$$eval('.bundle-items li', nodes => nodes.length), bundle.items.length);
    report.noJs.push(bundle.href);
  }
  // Existing picnic scenario URL remains reachable alongside the five concrete bundles.
  await go('/nabor/piknik-u-morya/');
  assert.match(await page.$eval('h1', node => node.textContent), /пикник/i);
  const sitemap = process.env.QA_BASE ? await (await fetch(process.env.QA_BASE + '/sitemap.xml')).text() : await readFile('site/sitemap.xml', 'utf8');
  for (const href of ['/nabory/', ...bundles.map(bundle => bundle.href)]) assert.equal(sitemap.split(`<loc>${origin + href}</loc>`).length - 1, 1, `Sitemap has one entry for ${href}`);
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/${stage}-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`Bundle pages PASS (${stage}): five bundles, home/menu/hub links, add/edit/reload, ${report.widths.map(row => row.width).join('/')}px, no-JS, picnic and sitemap.`);
} catch (error) {
  await writeFile(`${output}/${stage}-failure.json`, JSON.stringify({ ...report, url: page.url(), error: error.message }, null, 2) + '\n');
  await page.screenshot({ path: `${output}/${stage}-failure.png` });
  throw error;
} finally { await browser.disconnect(); chrome.kill(); }
