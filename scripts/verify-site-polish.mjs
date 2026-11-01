import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const output = process.env.QA_OUTPUT || 'qa/polish-sprint-20261101';
const stage = process.env.QA_BASE ? 'production' : 'local';
const origin = 'https://pirogorsk.ru';
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const report = { stage, views: [], blog: [], dialogs: [], errors: [] };
const cache = new Map();
const types = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.avif':'image/avif', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2', '.json':'application/json' };
async function setup(page) {
  page.setDefaultTimeout(15000);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  page.on('pageerror', error => report.errors.push(error.message));
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
          cache.set(path, { status: 200, contentType: response.headers.get('content-type') || '', body: Buffer.from(await response.arrayBuffer()) });
        } else cache.set(path, { status: 200, contentType: types[extname(path)] || 'text/html', body: await readFile(resolve('site', '.' + decodeURIComponent(path) + (path.endsWith('/') ? 'index.html' : ''))) });
      }
      await request.respond(cache.get(path));
    } catch (error) { report.errors.push(error.message); await request.abort(); }
  });
}
const page = await browser.newPage();
await setup(page);
const go = path => page.goto(origin + path + (path.includes('?') ? '&' : '?') + 'qa=1', { waitUntil: 'networkidle0' });
const count = () => page.$$eval('[data-blog-entry]:not([hidden])', rows => rows.length);
const search = async query => {
  await page.locator('#blog-query').fill(query);
  await page.waitForFunction(value => document.querySelector('#blog-query').value === value && document.querySelector('[data-blog-search-status]').textContent.startsWith(value.trim() ? 'Найдено' : 'Материалов'), {}, query);
};
async function view(id, width) {
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${id}: overflow at ${width}`);
  const tiny = await page.$$eval('input[type=search],input[type=number],select,textarea', fields => fields.filter(field => field.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(field).fontSize) < 16).map(field => field.outerHTML.slice(0, 140)));
  assert.deepEqual(tiny, [], `${id}: readable input at ${width}`);
  const statusHeight = await page.$eval('.masthead-bottom>a.masthead-status', element => element.getBoundingClientRect().height);
  assert(statusHeight === 0 || statusHeight >= 44, `${id}: status touch target at ${width}`);
  const cramped = await page.$$eval('.town-invitation h2', headings => headings.filter(heading => heading.scrollWidth > heading.clientWidth + 1 || (innerWidth <= 600 && heading.clientWidth < innerWidth - 100)).map(heading => heading.textContent));
  assert.deepEqual(cramped, [], `${id}: invitation heading uses mobile column at ${width}`);
  if (width <= 760) {
    const joined = await page.$$eval('.ed-breadcrumbs li:nth-child(n+3):last-child', crumbs => crumbs.filter(crumb => parseFloat(getComputedStyle(crumb, '::before').marginRight) < 10).map(crumb => crumb.textContent));
    assert.deepEqual(joined, [], `${id}: breadcrumb separator spacing at ${width}`);
  }
  report.views.push({ id, width, overflow: false, inputMinPx: 16 });
}
async function sticky(dialog, width, closeSelector = '[data-close]') {
  await page.$eval(dialog, element => { element.scrollTop = element.scrollHeight; });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const visible = await page.$eval(dialog, (element, closeSelector) => {
    const box = element.getBoundingClientRect();
    const close = element.querySelector(closeSelector).getBoundingClientRect();
    const hit = document.elementFromPoint(close.x + close.width / 2, close.y + close.height / 2);
    return close.top >= box.top && close.bottom <= box.bottom && !!hit?.closest(closeSelector);
  }, closeSelector);
  assert.equal(visible, true, `${dialog}: reachable close after scrolling at ${width}`);
  report.dialogs.push({ dialog, width, closeVisibleAtBottom: true });
}
try {
  await go('/blog/');
  const total = await page.$$eval('[data-blog-entry]', rows => rows.length);
  assert(total >= 62, 'Complete editorial library');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewport({ width, height: 900 });
    for (const [id, path] of [['home','/'],['menu','/menu/'],['product','/pirogi/myasnoy-pirog/'],['delivery','/delivery/'],['city','/zelenogradsk/'],['bundles','/nabory/'],['article','/journal/skolko-piroga-na-cheloveka/']]) {
      await go(path); await view(id, width);
    }
    await go('/blog/'); await view('blog', width);
    assert.equal(await count(), total);
    await search('сыр');
    const cheese = await count(); assert(cheese > 0 && cheese < total);
    assert.equal(await page.$eval('[data-blog-search-status]', element => element.textContent), `Найдено материалов: ${cheese}`);
    assert.equal(new URL(page.url()).searchParams.get('q'), 'сыр');
    const categoryCounts = await page.$$eval('[data-blog-category]', categories => categories.every(category => {
      const count = category.querySelectorAll('[data-blog-entry]:not([hidden])').length;
      const link = document.querySelector(`[data-blog-category-link="${category.id}"]`);
      return category.hidden === (count === 0) && link.hidden === category.hidden && Number(link.querySelector('small').textContent) === count;
    }));
    assert.equal(categoryCounts, true, 'Category counts match filtered cards');
    await page.$eval('[data-blog-search-form]', element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${output}/${stage}-blog-search-${width}.png` });
    await search('тесто'); const dough = await count();
    await search('тёсто'); assert.equal(await count(), dough, 'Russian е/ё');
    await search('цены пироги'); const normal = await count(); assert(normal > 0);
    await search('пироги цены'); assert.equal(await count(), normal, 'Word order');
    await search('zzzzzzнеттакойстатьи');
    assert.equal(await count(), 0);
    assert.equal(await page.$eval('[data-blog-empty]', element => element.hidden), false);
    assert.equal(await page.$eval('[data-blog-topics]', element => element.hidden), true);
    await page.locator('[data-blog-empty] button').click();
    assert.equal(await count(), total);
    assert.equal(await page.$eval('#blog-query', element => element === document.activeElement), true);
    assert.equal(new URL(page.url()).searchParams.has('q'), false);
    await search('пикник');
    await page.focus('#blog-query'); await page.keyboard.press('Enter');
    assert.equal(await page.$eval('#blog-query', element => element === document.activeElement), false, 'Search releases touch keyboard');
    const first = await page.$eval('[data-blog-entry]:not([hidden]) a', element => element.getAttribute('href'));
    await go(first);
    assert.equal(await page.$eval('h1', element => !!element.textContent.trim()), true);
    await go('/blog/?q=пикник'); assert((await count()) > 0 && (await count()) < total);
    await page.evaluate(() => { history.pushState(null, '', '?qa=1&q=сыр'); dispatchEvent(new PopStateEvent('popstate')); });
    assert.equal(await count(), cheese);
    await page.goBack({ waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('#blog-query', element => element.value), 'пикник');
    report.blog.push({ width, total, cheese, empty: true, reset: true, wordOrder: true, yo: true, submit: true, urlBack: true, articleLink: true });

    await go('/');
    const seed = await page.evaluate(() => JSON.parse(document.querySelector('#catalog-data').textContent).slice(0,8).map(product => ({ id: product.id, value: product.defaultVariant, quantity: 1 })));
    await page.evaluate(items => localStorage.setItem('pirogorsk-selection', JSON.stringify(items)), seed);
    await page.reload({ waitUntil: 'networkidle0' });
    const trigger = '.masthead [data-open="selection-dialog"]';
    await page.locator(trigger).click(); await sticky('#selection-dialog', width);
    await page.screenshot({ path: `${output}/${stage}-selection-${width}.png` });
    await page.locator('#selection-dialog [data-close]').click();
    assert.equal(await page.$eval('#selection-dialog', element => element.open), false);
    assert.equal(await page.$eval(trigger, element => element === document.activeElement), true, 'Focus returns to trigger');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection'))), seed, 'Closing preserves selection');
    const edit = '[data-edit-bundle]';
    await page.locator(edit).click();
    for (let n=0;n<5;n++) await page.locator('[data-bundle-row-add]').click();
    await sticky('#bundle-editor', width);
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#bundle-editor', element => element.open), false);
    const composition = { version: 1, city: 'Зеленоградск', items: seed };
    await page.evaluate(value => { location.hash = 'selection=' + encodeURIComponent(JSON.stringify(value)); }, composition);
    await page.waitForSelector('#composition-preview[open]');
    await sticky('#composition-preview', width);
    await page.locator('#composition-preview [data-close]').click();
    assert.equal(await page.$eval('#composition-preview', element => element.open), false);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection'))), seed);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    // Navigation remains dismissible on a short phone/landscape window.
    await page.setViewport({ width, height: 500 });
    for (const [opener, dialog, closer] of [
      ['[data-menu-open]', '#site-menu-dialog', '[data-menu-close]'],
      [width <= 1000 ? '.masthead-city--mobile' : '.masthead-city--desktop', '#city-dialog', '[data-close]'],
    ]) {
      await page.locator(opener).click(); await sticky(dialog, width, closer);
      await page.locator(`${dialog} ${closer}`).click();
      assert.equal(await page.$eval(dialog, element => element.open), false);
      assert.equal(await page.$eval(opener, element => element === document.activeElement), true);
    }
  }
  const plain = await browser.newPage(); await setup(plain); await plain.setJavaScriptEnabled(false);
  await plain.goto(origin + '/blog/?qa=1&q=сыр', { waitUntil: 'networkidle0' });
  assert.equal(await plain.$$eval('[data-blog-entry]', rows => rows.filter(row => getComputedStyle(row).display !== 'none').length), total, 'No JS: full library visible');
  assert.equal(await plain.$eval('[data-blog-search-form]', element => getComputedStyle(element).display), 'none');
  assert.equal(await plain.$$eval('[data-blog-entry] a[href^="/journal/"]', links => new Set(links.map(link => link.getAttribute('href'))).size), total, 'Every article remains linked in HTML');
  await plain.close();
  assert.deepEqual(report.errors, []);
  report.noJs = { articles: total, allLinks: true };
  await writeFile(`${output}/${stage}-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`Site polish PASS (${stage}): ${report.views.length} views, ${total} articles/search/reset/URL/no-JS, ${report.dialogs.length} scrolled dialogs, readable inputs, 320/390/768/1280px.`);
} catch (error) {
  await writeFile(`${output}/${stage}-failure.json`, JSON.stringify({ ...report, error: error.message, url: page.url() }, null, 2) + '\n');
  await page.screenshot({ path: `${output}/${stage}-failure.png` }).catch(() => {});
  throw error;
} finally { await browser.disconnect(); chrome.kill(); }
