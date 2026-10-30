import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { analyticsConfig } from '../../src/config/analytics.ts';
import { catalog } from '../../src/data/catalog.ts';
import { cityMenu } from '../../src/data/city-menu.ts';
import { releaseManifest } from '../../scripts/verify-release.mjs';
import worker from '../dist/worker.js';
import { verifyProductAddOns } from './qa-product-addons.mjs';
import { verifyOffers } from './qa-offers.mjs';
import { verifyMenuQuantity } from './qa-menu-quantity.mjs';
import { verifyStorefrontSync } from './qa-storefront-sync.mjs';

// Actual Astro output and production origins; every request is intercepted.
// Only the local in-memory database receives applications and Metrica is a queue.
const site = fileURLToPath(new URL('../../site/', import.meta.url));
const origin = 'https://pirogorsk.ru';
const endpoint = new URL(analyticsConfig.interestEndpoint);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(await readFile(new URL('../migrations/0001_interests.sql', import.meta.url), 'utf8'));
function prepare(sql, values = []) {
  const execute = () => ({ success: true, results: sqlite.prepare(sql).all(...values) });
  return { bind: (...next) => prepare(sql, next), first: async () => execute().results[0] || null, all: async () => execute(), execute };
}
const env = { DB: { prepare, batch: async statements => {
  sqlite.exec('BEGIN');
  try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} } };
const posts = [], errors = [], failedResources = [];
let chrome, browser;
try {
  assert.deepEqual(await (await worker.fetch(new Request(new URL('/health', endpoint)), env)).json(), { ok: true, storage: 'd1', mode: 'intent', ...releaseManifest() });
  chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-dev-shm-usage'] });
  browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
  for (const width of [320, 390, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    const interceptRequest = async request => {
      const url = new URL(request.url());
      try {
        if (url.protocol === 'data:') { await request.continue(); return; }
        if (url.origin === endpoint.origin && url.pathname === endpoint.pathname) {
          const body = request.hasPostData() ? await request.fetchPostData() : undefined;
          if (request.method() === 'POST') posts.push(JSON.parse(body));
          const response = await worker.fetch(new Request(url, { method: request.method(), headers: { ...request.headers(), 'CF-Connecting-IP': `192.0.2.${width === 320 ? 30 : 31}` }, body }), env);
          await request.respond({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
          return;
        }
        if (url.origin === 'https://mc.yandex.ru') {
          await request.respond({ status: 200, contentType: 'application/javascript', body: '' }); return;
        }
        if (url.origin !== origin) { failedResources.push(`${url.origin}${url.pathname}`); await request.abort(); return; }
        const path = resolve(site, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
        assert.ok(path.startsWith(site.endsWith(sep) ? site : site + sep), 'static path must stay in site/');
        await request.respond({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(path) });
      } catch (error) { failedResources.push(`${url.pathname}: ${error.message}`); await request.abort(); }
    };
    page.on('request', interceptRequest);
    const goals = () => page.evaluate(() => (window.ym?.a || []).filter(args => args[1] === 'reachGoal').map(args => ({ goal: args[2], params: args[3] })));
    const selection = () => page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'));
    // City landing pages share the real catalog, keep delivery once, and route
    // into the existing city intent without adding products to the selection.
    for (const slug of ['kaliningrad', 'zelenogradsk', 'svetlogorsk']) {
      const menu = cityMenu(slug);
      await page.goto(`${origin}/dostavka/${slug}/`, { waitUntil: 'networkidle0' });
      assert.equal(await page.$$eval('[data-city-product]', cards => cards.length), 3);
      assert.equal(await page.$eval('[data-city-total]', el => Number(el.dataset.cityTotal)), menu.total);
      assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `city ${slug} overflow at ${width}`);
      assert.equal(await page.$$eval('.city-budget dd', cells => cells.every(cell => cell.getBoundingClientRect().right <= innerWidth)), true, `city ${slug} total clipped at ${width}`);
      for (const entry of menu.entries) {
        const href = await page.$eval(`[data-city-product="${entry.product.id}"] a`, a => a.getAttribute('href'));
        assert.equal(href, entry.href);
      }
      await page.click('.city-sections a[href="#city-budget"]');
      assert.equal(new URL(page.url()).hash, '#city-budget');
      await page.$eval('#city-menu', section => section.scrollIntoView());
      await page.screenshot({ path: new URL(`../dist/qa-city-${slug}-${width}.png`, import.meta.url).pathname });
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('.ed-interest .ed-button')]);
      assert.equal(await page.$eval('#selection-dialog', dialog => dialog.open), true);
      assert.equal(await page.$$eval('[data-city]', elements => elements.every(el => el.textContent === document.querySelector('[data-city]').textContent)), true);
      assert.equal(await page.$eval('[data-city]', el => el.textContent), menu.city);
      assert.deepEqual(await selection(), [], 'city intent preserves the empty selection');
    }
    await page.goto(`${origin}/journal/skolko-piroga-na-cheloveka/`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-party-apply]');
    await page.$eval('[data-party-form] input[name=guests]', input => { input.value = '7'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    const transfer = new URL(await page.$eval('[data-party-apply]', el => el.href));
    const expectedCity = { kaliningrad: 'Калининград', zelenogradsk: 'Зеленоградск', svetlogorsk: 'Светлогорск' }[transfer.searchParams.get('city')];
    assert.ok(expectedCity);
    const expected = transfer.searchParams.get('items').split(',').map(row => { const [id, value, quantity] = row.split(':'); return { id, value: Number(value), quantity: Number(quantity) }; });
    assert.ok(expected.length > 0);
    assert.ok((await goals()).some(item => item.goal === 'calculator_interact'));
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('[data-party-apply]')]);
    assert.equal(await page.$eval('#selection-dialog', dialog => dialog.open), true);
    assert.deepEqual(await selection(), expected);
    await page.reload({ waitUntil: 'networkidle0' });
    assert.deepEqual(await selection(), expected, 'reload must not increase quantities');
    await page.click('[data-order]');
    await page.waitForFunction(() => document.querySelector('#interest-dialog').open);
    assert.equal(await page.$eval('#interest-city', el => el.value), expectedCity);
    await page.$eval('#interest-day', input => { input.value = '2099-12-12'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#interest-delivery', 'pickup');
    await page.click('[name=priceConsent]');
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `body overflow at ${width}`);
    assert.equal(await page.$eval('#interest-dialog', dialog => dialog.scrollWidth <= dialog.clientWidth), true, `form overflow at ${width}`);
    await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
    await page.screenshot({ path: new URL(`../dist/qa-site-${width}.png`, import.meta.url).pathname });
    const before = posts.length;
    await page.$eval('#interest-form', form => { form.requestSubmit(); form.requestSubmit(); });
    await page.waitForFunction(() => !document.querySelector('[data-interest-success]').hidden);
    assert.equal(posts.length, before + 1);
    const submitted = posts.at(-1);
    assert.deepEqual(submitted.items, expected.map(item => ({ ...item, value: String(item.value) })));
    const stored = sqlite.prepare('SELECT * FROM interests WHERE request_id = ?').get(submitted.requestId);
    const total = expected.reduce((sum, item) => sum + catalog.find(p => p.id === item.id).variants.find(v => v.value === item.value).price * item.quantity, 0);
    assert.equal(stored.city, expectedCity); assert.equal(stored.value_total, total);
    const acknowledgements = (await goals()).filter(item => item.goal === 'order_submit');
    assert.equal(acknowledgements.length, 1);
    assert.equal(acknowledgements[0].params.requestId, submitted.requestId);
    await page.evaluate(() => localStorage.removeItem('pirogorsk-selection'));
    await page.goto(`${origin}/?interest=calculator&city=kaliningrad&items=unknown:500:1#pirogi`, { waitUntil: 'networkidle0' });
    assert.deepEqual(await selection(), []);
    assert.equal(await page.$eval('#selection-dialog', dialog => dialog.open), false);
    assert.equal(posts.length, before + 1, 'malformed transfer must not submit');
    // The homepage is a short editorial entry point; the complete 153-item
    // catalogue belongs to /menu, while the JSON catalogue still powers selection.
    assert.equal(await page.$$eval('.catalog-card[data-product]', cards => cards.length), 4);
    assert.equal(await page.$('[data-supplier-catalog]'), null);
    assert.equal(await page.$('.extras-section'), null);
    assert.equal(await page.$eval('#catalog-data', script => JSON.parse(script.textContent).length), 153);
    assert.equal(await page.$$eval('.offer-card', cards => cards.every(card => card.scrollWidth <= card.clientWidth)), true, `offer content overflow at ${width}`);
    assert.equal(await page.$$eval('.offer-add', buttons => buttons.every(button => { const a = button.getBoundingClientRect(), b = button.closest('.offer-card').getBoundingClientRect(); return a.right <= b.right && a.left >= b.left; })), true, `offer button clipped at ${width}`);
    assert.equal(await page.$$eval('[data-tasting-scene]', scenes => scenes.length), 3);
    assert.equal(await page.$eval('[data-tasting-hero]', hero => hero.dataset.flavor), 'pies');
    await page.click('[data-tasting-next]');
    await page.waitForFunction(() => document.querySelector('[data-tasting-hero]')?.dataset.flavor === 'company');
    assert.equal(await page.$eval('[data-tasting-cta]', link => link.getAttribute('href')), '#nabory');
    await page.click('[data-tasting-prev]');
    await page.waitForFunction(() => document.querySelector('[data-tasting-hero]')?.dataset.flavor === 'pies');
    await page.focus('[data-tasting-cta]');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('[data-tasting-hero]')?.dataset.flavor === 'company');
    await page.click('[data-tasting-select=tea]');
    await page.waitForFunction(() => document.querySelector('[data-tasting-hero]')?.dataset.flavor === 'tea');

    // The departments card preserves its group in the menu URL.
    const miniProduct = catalog.find(item => item.category === 'mini-pies');
    assert.ok(miniProduct, 'catalog has a mini-pie product');
    const miniDepartment = `a[href="/menu/?group=mini-pies#holland"]`;
    assert.equal(await page.$(miniDepartment) !== null, true, 'homepage mini-pies department links to its menu group');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(miniDepartment)]);
    assert.equal(new URL(page.url()).pathname, '/menu/');
    assert.equal(new URL(page.url()).searchParams.get('group'), 'mini-pies');
    assert.equal(await page.$eval('#holland [data-supplier-filter=mini-pies]', button => button.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$$eval('#holland [data-supplier-id]:not([hidden])', cards => cards.every(card => card.dataset.supplierGroup === 'mini-pies')), true);
    assert.ok(await page.$$eval('#holland [data-supplier-id]:not([hidden])', cards => cards.length > 0));
    assert.equal(await page.$eval('#holland [data-supplier-more]', button => getComputedStyle(button).display), 'none', 'mini-pies do not show an exhausted pagination control');
    assert.equal(await page.$eval('#holland [data-supplier-more]', button => button.textContent), 'Показать ещё 0');

    // All producer catalogue controls remain available on the full menu page.
    assert.equal(await page.$$eval('#holland [data-supplier-id]', cards => cards.length), 78);
    assert.equal(await page.$$eval('#pirogi39 [data-supplier-id]', cards => cards.length), 61);
    await page.goto(`${origin}/menu/`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$$eval('#holland [data-supplier-id]:not([hidden])', cards => cards.length), 24);
    await page.type('#holland [data-supplier-search]', 'вишн');
    assert.ok(await page.$$eval('#holland [data-supplier-id]:not([hidden])', cards => cards.length >= 3 && cards.every(card => card.dataset.supplierName.includes('вишн'))));
    await page.$eval('#holland [data-supplier-search]', input => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#holland [data-supplier-filter=dough]');
    assert.equal(await page.$$eval('#holland [data-supplier-id]:not([hidden])', cards => cards.length), 6);
    assert.equal(await page.$eval('#holland [data-supplier-more]', button => getComputedStyle(button).display), 'none', 'short categories hide pagination through CSS');
    await page.click('#holland [data-supplier-filter=all]');
    // The menu also reveals these batches automatically when the end approaches.
    // Exercise its keyboard/fallback control without scrolling into the observer.
    for (let step = 0; step < 3; step++) {
      const before = await page.$$eval('#holland [data-supplier-id]:not([hidden])', cards => cards.length);
      if (before === 78) break;
      await page.$eval('#holland [data-supplier-more]', button => button.click());
      assert.ok(await page.$$eval('#holland [data-supplier-id]:not([hidden])', cards => cards.length) > before);
    }
    assert.equal(await page.$eval('#holland [data-supplier-more]', button => button.hidden), true);
    assert.equal(await page.$eval('#holland [data-supplier-more]', button => getComputedStyle(button).display), 'none', 'the last catalogue page hides pagination through CSS');
    // One search covers all 153 products, including concepts and extras. It
    // resets local filters and survives reload without making another URL owner.
    const menuSearch = async query => page.$eval('[data-menu-search]', (input, query) => {
      input.value = query; input.dispatchEvent(new Event('input', { bubbles: true }));
    }, query);
    await page.click('#holland [data-supplier-filter=dough]');
    await menuSearch('сЫроМ курицей');
    assert.ok(await page.$$eval('[data-supplier-id]:not([hidden])', cards => cards.length > 0 && cards.every(card => {
      const text = card.dataset.supplierSearch.toLocaleLowerCase('ru-RU');
      return text.includes('сыром') && text.includes('курицей');
    })), 'search is case-insensitive and matches words in any order');
    assert.equal(await page.$eval('#holland [data-supplier-filter=all]', button => button.getAttribute('aria-pressed')), 'true');
    assert.equal(new URL(page.url()).searchParams.get('q'), 'сЫроМ курицей');
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('[data-menu-search]', input => input.value), 'сЫроМ курицей');
    assert.equal(await page.$eval('link[rel=canonical]', link => link.href), `${origin}/menu/`);
    await menuSearch('850');
    assert.ok(await page.$$eval('[data-supplier-id]:not([hidden])', cards => cards.length > 0 && cards.every(card => card.dataset.supplierSearch.includes('850'))), 'weights are searchable');
    await menuSearch('НЕСУЩЕСТВУЮЩИЙпирог');
    assert.equal(await page.$$eval('[data-menu-section]:not([hidden])', sections => sections.length), 0);
    assert.equal(await page.$eval('[data-menu-empty]', el => el.hidden), false);
    await page.click('[data-menu-reset]');
    assert.equal(await page.$eval('[data-menu-search]', input => document.activeElement === input), true, 'reset restores keyboard focus');
    assert.equal(new URL(page.url()).searchParams.has('q'), false);
    assert.equal(await page.$eval('[data-menu-status]', el => el.textContent), 'Позиций по вашему выбору: 153');
    assert.equal(await page.$$eval('[data-menu-jump]:not([hidden])', links => links.length), 4);
    await menuSearch('Морс');
    assert.equal(await page.$eval('#extras', section => section.hidden), false, 'extras participate in search');
    assert.ok(await page.$$eval('#extras [data-menu-product]:not([hidden])', cards => cards.length > 0));
    await page.click('[data-menu-reset]');
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `menu search overflow at ${width}`);
    await page.$eval('[data-menu-finder]', form => form.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: new URL(`../dist/qa-menu-${width}.png`, import.meta.url).pathname });
    await page.goto(`${origin}/menu/?group=dough#holland`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('#holland [data-supplier-filter=dough]', button => button.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$$eval('#holland [data-supplier-id]:not([hidden])', cards => cards.length), 6);
    assert.equal(await page.$eval('#holland [data-supplier-more]', button => getComputedStyle(button).display), 'none', 'short categories hide pagination through CSS');
    await page.goto(`${origin}/menu/?group=invalid#holland`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('#holland [data-supplier-filter=all]', button => button.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$$eval('#holland [data-supplier-id]:not([hidden])', cards => cards.length), 24);
    await page.goto(`${origin}/menu/?group=ossetian-pies#pirogi39`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('#pirogi39 [data-supplier-filter=ossetian-pies]', button => button.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$$eval('#pirogi39 [data-supplier-id]:not([hidden])', cards => cards.every(card => card.dataset.supplierGroup === 'ossetian-pies')), true);
    await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });
    await page.click(width <= 1000 ? '.masthead-city--mobile' : '.masthead-city--desktop');
    await page.click('#city-dialog [data-select-city="Калининград"]');
    const miniId = miniProduct.id;
    const miniDefault = miniProduct.variants.find(item => item.value === miniProduct.defaultVariant);
    const meatDefault = catalog.find(item => item.id === 'meat').variants.find(item => item.value === 500);
    const mixedTotal = miniDefault.price + meatDefault.price;
    await page.click(`[data-product="${miniId}"] [data-add]`);
    await page.click('[data-product=meat] [data-add]');
    await page.click('[data-open=selection-dialog]');
    const formattedMixedTotal = mixedTotal.toLocaleString('ru-RU').replaceAll('\u00a0', ' ');
    assert.ok((await page.$eval('[data-total]', el => el.textContent)).replaceAll('\u00a0', ' ').includes(formattedMixedTotal));
    const kaliningradDeliveryTotal = mixedTotal + 350;
    const formattedDeliveryTotal = kaliningradDeliveryTotal.toLocaleString('ru-RU').replaceAll('\u00a0', ' ');
    assert.ok((await page.$eval('[data-selection-grand-total]', el => el.textContent)).replaceAll('\u00a0', ' ').includes(formattedDeliveryTotal));
    await page.click('[data-order]');
    await page.select('#interest-delivery', 'delivery');
    assert.ok((await page.$eval('[data-interest-grand-total]', el => el.textContent)).replaceAll('\u00a0', ' ').includes(formattedDeliveryTotal));
    await page.select('#interest-city', 'Зеленоградск');
    assert.ok((await page.$eval('[data-interest-grand-total]', el => el.textContent)).replaceAll('\u00a0', ' ').includes((mixedTotal + 500).toLocaleString('ru-RU').replaceAll('\u00a0', ' ')));
    await page.select('#interest-city', 'Светлогорск');
    assert.ok((await page.$eval('[data-interest-grand-total]', el => el.textContent)).replaceAll('\u00a0', ' ').includes((mixedTotal + 650).toLocaleString('ru-RU').replaceAll('\u00a0', ' ')));
    await page.select('#interest-delivery', 'pickup');
    assert.ok((await page.$eval('[data-interest-grand-total]', el => el.textContent)).replaceAll('\u00a0', ' ').includes(formattedMixedTotal));
    await page.select('#interest-delivery', 'undecided');
    assert.match(await page.$eval('[data-interest-grand-total]', el => el.textContent), /\+ получение/);
    await page.select('#interest-city', 'Калининград');
    await page.select('#interest-delivery', 'delivery');
    await page.$eval('#interest-day', input => { input.value = '2099-12-12'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('[name=priceConsent]');
    assert.equal(await page.$eval('#interest-dialog', dialog => dialog.scrollWidth <= dialog.clientWidth), true);
    await page.$eval('#interest-form', form => form.requestSubmit());
    await page.waitForFunction(() => !document.querySelector('[data-interest-success]').hidden);
    const mixed = posts.at(-1);
    const mixedRow = sqlite.prepare('SELECT * FROM interests WHERE request_id = ?').get(mixed.requestId);
    assert.deepEqual(mixed.items, [{ id: miniId, value: String(miniDefault.value), quantity: 1 }, { id: 'meat', value: '500', quantity: 1 }]);
    assert.equal(mixedRow.value_total, mixedTotal, 'DB and goal value remain the product subtotal; receiving is stored separately');
    assert.equal(mixedRow.delivery, 'delivery');
    await page.click('[data-interest-success] [data-interest-close]');
    await page.goto(`${origin}/menu/?group=bake#holland`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('#holland [data-supplier-filter=bake]', button => button.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `catalog overflow at ${width}`);
    await page.$eval('#holland', section => section.scrollIntoView());
    await page.screenshot({ path: new URL(`../dist/qa-supplier-${width}.png`, import.meta.url).pathname });
    // A menu variant must transfer the selected format, including cards after page 1.
    await page.goto(`${origin}/menu/?group=dough#holland`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('#holland [data-supplier-filter=dough]', button => button.getAttribute('aria-pressed')), 'true');
    const doughCard = '#holland [data-supplier-id=hb-testo-drozhzhevoe-sloenoe-zamorozhennoe-450-gr-20-sht-v-up]';
    await page.click(`${doughCard} label:last-of-type`);
    const link = await page.$eval(`${doughCard} [data-supplier-link]`, el => el.href);
    assert.equal(new URL(link).searchParams.get('variant'), '9000');
    // Changing a group collapses a long section above this card. Finish the
    // programmatic scroll before the physical click; CSS smooth scrolling can
    // otherwise move the target while Puppeteer dispatches pointer events.
    await page.$eval(`${doughCard} [data-supplier-link]`, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click(`${doughCard} [data-supplier-link]`);
    assert.equal(new URL(page.url()).pathname, '/menu/', 'adding to the feed keeps the current position');
    await page.$eval('[data-header-selection]', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('[data-header-selection]')]);
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(new URL(page.url()).searchParams.get('interest'), 'selection');
    assert.equal(await page.$eval('#selection-dialog', dialog => dialog.open), true);
    const doughId = 'hb-testo-drozhzhevoe-sloenoe-zamorozhennoe-450-gr-20-sht-v-up';
    assert.ok((await selection()).some(item => item.id === doughId && item.value === 9000));
    assert.ok((await page.$eval('[data-selection-items]', el => el.textContent)).includes(catalog.find(item => item.id === doughId).name));
    // The newly added producer also reaches the real Worker/SQLite fixture.
    await page.evaluate(() => localStorage.removeItem('pirogorsk-selection'));
    await page.goto(`${origin}/?interest=p39-483&variant=2000#pirogi39`, { waitUntil: 'networkidle0' });
    assert.deepEqual(await selection(), [{ id: 'p39-483', value: 2000, quantity: 1 }]);
    await page.click('[data-order]');
    await page.select('#interest-delivery', 'pickup');
    await page.$eval('#interest-day', input => { input.value = '2099-12-12'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('[name=priceConsent]');
    await page.$eval('#interest-form', form => form.requestSubmit());
    await page.waitForFunction(() => !document.querySelector('[data-interest-success]').hidden);
    const freshRequest = posts.at(-1);
    assert.deepEqual(freshRequest.items, [{ id: 'p39-483', value: '2000', quantity: 1 }]);
    const freshRow = sqlite.prepare('SELECT * FROM interests WHERE request_id = ?').get(freshRequest.requestId);
    assert.equal(freshRow.value_total, catalog.find(p => p.id === 'p39-483').prices[2000]);
    assert.equal(freshRow.delivery, 'pickup');
    await page.goto(`${origin}/?qa=1`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => { localStorage.removeItem('pirogorsk-city'); localStorage.removeItem('pirogorsk-selection'); });
    await verifyOffers(page, origin, width, fileURLToPath(new URL('../dist/qa-offers/', import.meta.url)));
    await verifyProductAddOns(page, origin, width, fileURLToPath(new URL('../dist/qa-product-addons/', import.meta.url)));
    await verifyMenuQuantity(page, origin, width, fileURLToPath(new URL('../dist/qa-menu-quantity/', import.meta.url)));
    await verifyStorefrontSync(page, origin, width, async other => {
      other.on('pageerror', error => errors.push(error.message));
      await other.setRequestInterception(true);
      other.on('request', interceptRequest);
    });
    await context.close();
  }
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM interests').get().n, 9);
  assert.deepEqual(errors, []); assert.deepEqual(failedResources, []);
  console.log('PASS: built Astro calculator, home → menu group → supplier product → home selection, mixed selection and fresh 2kg pie → Worker/SQLite; 139 producer cards, menu-scoped filters and selected variant transfer at 320/390/1280px; no production requests.');
} finally {
  await browser?.close(); chrome?.kill(); sqlite.close();
}
