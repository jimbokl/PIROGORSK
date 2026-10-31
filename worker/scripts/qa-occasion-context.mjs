import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { analyticsConfig } from '../../src/config/analytics.ts';

const production = process.argv.includes('--production');
const origin = 'https://pirogorsk.ru';
const root = new URL('../../site/', import.meta.url).pathname;
const output = resolve(process.env.PIROGORSK_QA_OUTPUT || new URL('../../qa/occasion-context-20261031/', import.meta.url).pathname) + sep;
const label = production ? 'production' : 'local';
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const results = [];
try {
  for (const width of [320, 390, 768, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [], posts = [];
    let dropAck = true;
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height: 960 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      try {
        const url = new URL(request.url());
        if (url.href === analyticsConfig.interestEndpoint) {
          const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
          if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
          assert.equal(request.method(), 'POST');
          const payload = JSON.parse(await request.fetchPostData()); posts.push(payload);
          if (dropAck) { dropAck = false; return request.abort(); }
          return request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ ok: true, saved: true, requestId: payload.requestId }) });
        }
        if (url.origin === 'https://mc.yandex.ru') return request.respond({ status: 200, contentType: 'application/javascript', body: '' });
        if (url.protocol === 'data:') return request.continue();
        if (url.origin !== origin || request.method() !== 'GET') return request.abort();
        if (production) return request.continue();
        const path = resolve(root, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
        assert.ok(path.startsWith(root.endsWith(sep) ? root : root + sep));
        return request.respond({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: await readFile(path) });
      } catch (error) { errors.push(String(error)); if (!request.isInterceptResolutionHandled()) await request.abort(); }
    });
    const go = async path => {
      const url = new URL(path, origin); if (production) url.searchParams.set('qa', '1');
      const response = await page.goto(url.href, { waitUntil: 'networkidle0' }); assert.equal(response.status(), 200);
    };
    const open = async () => {
      await page.$eval('[data-open="selection-dialog"]', button => button.click());
      await page.waitForFunction(() => document.querySelector('#selection-dialog').open);
      await page.$eval('[data-order]', button => button.click());
      await page.waitForFunction(() => document.querySelector('#interest-dialog').open);
    };
    const value = selector => page.$eval(selector, input => input.value);
    const goals = () => page.evaluate(() => (window.ym?.a || []).filter(args => args[1] === 'reachGoal').map(args => ({ goal: args[2], params: args[3] })));
    for (const path of ['/', '/menu/']) {
      await go(path);
      assert.equal(await page.$$eval('[data-product], [data-menu-product], [data-supplier-id]', cards => new Set(cards.map(card => card.dataset.product || card.dataset.feedId || card.dataset.supplierId)).size), 153);
      assert.equal(await page.$$eval('.scenario-entries a', links => links.length), 3);
      assert(await page.$$eval('.scenario-entries a', links => links.every(link => {
        const rect = link.getBoundingClientRect();
        return rect.height >= 44 && rect.left >= 0 && rect.right <= innerWidth;
      })));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.$eval('.scenario-entries', element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: `${output}${label}-scenario-entries-${width}.png` });
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.$eval('.scenario-entries a', link => link.click())]);
    assert.match(page.url(), /\/nabor\/uzhin-v-apartamentah\//);
    assert.deepEqual(JSON.parse(await page.evaluate(() => sessionStorage.getItem('pirogorsk:attribution:v1'))), { channel: 'scenario' });
    assert.deepEqual(JSON.parse(await page.evaluate(() => sessionStorage.getItem('pirogorsk:occasion:v1'))), { value: 'apartments', source: 'entry' });
    await go('/journal/uzhin-v-semnyh-apartamentah/?pg_channel=qr&pg_partner=p007');
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.$eval('a[data-guide-catalog][href*="interest=guide-"]', link => link.click())]);
    await page.$eval('[data-product="meat"] [data-add]', button => button.click());
    if (!production) {
      const params = (await goals()).find(item => item.goal === 'catalog_add').params;
      assert.equal(params.occasion, 'apartments'); assert.equal(params.entry_channel, 'qr'); assert.equal(params.partner_code, 'p007');
    }
    await open();
    assert.equal(await value('#interest-occasion'), 'apartments');
    assert.equal(await value('#interest-time'), 'undecided');
    assert.equal(await page.$eval('[data-interest-preferences]', details => details.open), true);
    await page.$eval('#interest-occasion', input => input.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: `${output}${label}-form-${width}.png` });
    assert(await page.$eval('#interest-dialog', dialog => dialog.scrollWidth <= dialog.clientWidth));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.select('#interest-occasion', 'company');
    await page.keyboard.press('Escape');
    await go('/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/');
    await open(); assert.equal(await value('#interest-occasion'), 'company');
    await page.keyboard.press('Escape');
    await go('/journal/piknik-s-pirogom-chto-vzyat/');
    await go('/menu/'); await open();
    assert.equal(await value('#interest-occasion'), 'company', 'manual choice beats a new thematic entry');
    await page.select('#interest-occasion', 'undecided');
    await page.keyboard.press('Escape');
    await page.reload({ waitUntil: 'networkidle0' }); await open();
    assert.equal(await value('#interest-occasion'), 'undecided');
    await page.select('#interest-occasion', 'gift');
    await page.select('#interest-time', 'evening');
    await page.$eval('#interest-day', input => { input.value = '2099-12-12'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('#interest-delivery', 'pickup');
    await page.$eval('[name=priceConsent]', input => input.click());
    await page.$eval('#interest-form', form => form.requestSubmit());
    await page.waitForFunction(() => document.querySelector('[data-interest-submit]').textContent === 'Повторить отправку');
    assert.equal(await page.$eval('[data-interest-success]', element => element.hidden), true);
    assert.equal((await goals()).filter(item => item.goal === 'order_submit').length, 0);
    await page.$eval('#interest-form', form => form.requestSubmit());
    await page.waitForFunction(() => !document.querySelector('[data-interest-success]').hidden);
    assert.equal(posts.length, 2); assert.equal(posts[0].requestId, posts[1].requestId);
    assert.deepEqual(posts[0], posts[1], 'lost acknowledgement retries the exact original payload');
    assert.deepEqual(posts[0].attribution, { channel: 'qr', partnerCode: 'p007' });
    assert.deepEqual(posts[0].context, { occasion: 'gift', preferredTime: 'evening', partnerType: 'none' });
    if (!production) assert.equal((await goals()).find(item => item.goal === 'order_submit').params.occasion, 'gift');
    else assert.deepEqual(await goals(), []);
    assert.equal(await page.$eval('[data-interest-request]', element => element.textContent), posts[1].requestId);
    await go('/podbor/?occasion=v-ofis-na-den-rozhdeniya');
    assert.match(await page.$eval('[data-planner-occasion]', el => el.textContent), /День рождения/);
    // Start with a fresh same-tab scenario (only this key); prove the real planner link preserves it.
    await page.evaluate(() => sessionStorage.removeItem('pirogorsk:occasion:v1'));
    await page.reload({ waitUntil: 'networkidle0' });
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.$eval('[data-planner-continue]', link => link.click())]);
    await page.$eval('[data-order]', button => button.click());
    assert.equal(await value('#interest-occasion'), 'company');
    const stored = await page.evaluate(() => sessionStorage.getItem('pirogorsk:occasion:v1'));
    assert.deepEqual(JSON.parse(stored), { value: 'company', source: 'entry' });
    await page.keyboard.press('Escape');
    await page.evaluateOnNewDocument(() => { Storage.prototype.getItem = () => { throw Error('blocked'); }; Storage.prototype.setItem = () => { throw Error('blocked'); }; });
    await go('/?interest=scenario-piknik');
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('pirogorsk:order-open', { detail: { items: [{ id: 'meat', value: '500', quantity: 1 }] } })));
    assert.equal(await value('#interest-occasion'), 'picnic');
    await page.select('#interest-occasion', 'undecided');
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('pirogorsk:order-open', { detail: { items: [{ id: 'meat', value: '500', quantity: 1 }] } })));
    assert.equal(await value('#interest-occasion'), 'undecided');
    assert.deepEqual(errors, []);
    results.push({ width, articleToCatalog: 'PASS', correctionAndReload: 'PASS', plannerTransfer: 'PASS', blockedStorage: 'PASS', retryPayloadAndGoal: 'PASS', overflow: false });
    await context.close();
  }
  await writeFile(`${output}${label}.json`, JSON.stringify({ checkedAt: new Date().toISOString(), production, externalWritesBlocked: true, results }, null, 2) + '\n');
  console.log(`PASS: ${label}, four widths, scenario entry/correction/reload/planner, blocked storage, retry and confirmed save.`);
} finally { await browser.disconnect(); await chrome.kill(); }
