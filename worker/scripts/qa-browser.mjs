import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { plainJavaScript } from './transpile.mjs';
import { catalog } from '../../src/data/catalog.ts';
import worker from '../dist/worker.js';

// This fixture uses the actual form, CSS and client scripts, and the deployable Worker bundle.
// Metrica is intercepted locally. No production service receives a test event or application.
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [component, styles, globalStyles, tokens, analytics, analyticsPageview, analyticsSession, seoNavigation, seoMatrix, interest, migration, pricing] = await Promise.all([
  read('../../src/components/InterestForm.astro'), read('../../src/styles/interest.css'),
  read('../../src/styles/global.css'), read('../../src/styles/tokens.css'), read('../../src/scripts/analytics.ts'),
  read('../../src/lib/analytics-pageview.ts'), read('../../src/lib/analytics-session.ts'),
  read('../../src/lib/seo-navigation.ts'), read('../../src/data/seo-matrix.json'),
  read('../../src/scripts/interest.ts'), read('../migrations/0001_interests.sql'),
  read('../../src/data/pricing.ts'),
]);
// Analytics requires a production origin; every request to this origin is served locally below.
const fixtureOrigin = 'https://pirogorsk.ru';
const analyticsScript = [
  plainJavaScript(analyticsPageview),
  plainJavaScript(analyticsSession),
  `const matrix = ${JSON.stringify(JSON.parse(seoMatrix))};`,
  plainJavaScript(seoNavigation, ['../data/seo-matrix.json']),
  plainJavaScript(analytics, ['../config/analytics', '../lib/analytics-pageview', '../lib/analytics-session', '../lib/seo-navigation']),
].join('\n');
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(migration);
function prepare(sql, values = []) {
  const execute = () => ({ success: true, results: sqlite.prepare(sql).all(...values) });
  return { bind: (...next) => prepare(sql, next), first: async () => execute().results[0] || null, all: async () => execute(), execute };
}
const env = { ALLOW_LOCALHOST: 'true', DB: { prepare, batch: async statements => {
  sqlite.exec('BEGIN');
  try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
  catch (error) { sqlite.exec('ROLLBACK'); throw error; }
} } };
let posts = [];
let loseFirstAcknowledgement = true;
const formMarkup = component.replace(/^---[\s\S]*?---\s*/, '').replace(/<script>[\s\S]*?<\/script>/, '');
let base;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, base);
    if (/^\/fonts\/[a-z-]+\.woff2$/.test(url.pathname)) {
      res.writeHead(200, { 'Content-Type': 'font/woff2' });
      res.end(await readFile(new URL(`../../public${url.pathname}`, import.meta.url))); return;
    }
    if (url.pathname === '/api/interest') {
      let body = ''; for await (const chunk of req) body += chunk;
      posts.push(JSON.parse(body));
      const response = await worker.fetch(new Request(url, { method: req.method, body, headers: { ...req.headers, 'CF-Connecting-IP': '192.0.2.25' } }), env);
      if (loseFirstAcknowledgement) { loseFirstAcknowledgement = false; res.destroy(); return; }
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
    }
    const disabled = url.searchParams.has('disabled');
    const endpoint = disabled ? '' : `${fixtureOrigin}/api/interest`;
    const script = `const analyticsConfig = ${JSON.stringify({ metricaId: 42, interestEndpoint: endpoint, privacyVersion: '2026-10-23' })};\nconst trackGoal = (() => {\n${analyticsScript}\nreturn trackGoal;\n})();\n${plainJavaScript(pricing)}\n${plainJavaScript(interest, ['../config/analytics', './analytics', '../data/pricing'])}\nwindow.fixtureSaved = []; document.addEventListener('pirogorsk:order-saved', e => window.fixtureSaved.push(e.detail));\ndocument.querySelector('#fixture-open').addEventListener('click', () => document.dispatchEvent(new CustomEvent('pirogorsk:order-open', {detail:{items:[{id:'meat',value:'500',quantity:2},{id:'tea',value:'250',quantity:1}],city:'Калининград'}})));`;
    const markup = formMarkup.replace('disabled={!analyticsConfig.interestEndpoint}', disabled ? 'disabled' : '');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${tokens}\n${globalStyles.replace(/@import[^;]+;/g, '')}\n${styles}</style></head><body><button id="fixture-open">Открыть заявку</button>${markup}<script id="catalog-data" type="application/json">${JSON.stringify(catalog)}</script><script type="module">${script}</script></body></html>`);
  } catch (error) { res.writeHead(500); res.end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
base = `http://127.0.0.1:${server.address().port}`;
let chrome; let browser;
try {
  chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-dev-shm-usage'] });
  browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
  const page = await browser.newPage();
  const scriptErrors = []; page.on('pageerror', error => scriptErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.origin === 'https://mc.yandex.ru') {
      await request.respond({ status: 200, contentType: 'application/javascript', body: '' }); return;
    }
    if (url.origin !== fixtureOrigin && url.origin !== base) { await request.abort(); return; }
    try {
      const response = await fetch(`${base}${url.pathname}${url.search}`, {
        method: request.method(), headers: request.headers(), body: request.hasPostData() ? await request.fetchPostData() : undefined,
      });
      await request.respond({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    } catch { await request.abort(); }
  });
  const goals = async () => page.evaluate(() => (window.ym?.a || []).filter(args => args[1] === 'reachGoal').map(args => ({ goal: args[2], params: args[3] })));
  await page.setViewport({ width: 320, height: 740, deviceScaleFactor: 1 });
  const response = await page.goto(fixtureOrigin, { waitUntil: 'networkidle0' });
  assert.equal(response.status(), 200, await response.text());
  await page.click('#fixture-open');
  assert.equal(await page.$eval('#interest-dialog', el => el.open), true);
  assert.equal(await page.$eval('[data-interest-total]', el => el.textContent), '1 480 ₽');
  assert.deepEqual((await goals()).map(value => value.goal), ['order_form_open']);
  await page.$eval('#interest-form', form => form.requestSubmit());
  assert.equal(posts.length, 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'interest-day');
  await page.$eval('#interest-day', input => { input.value = '2099-12-12'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.select('#interest-delivery', 'pickup');
  await page.click('input[name="priceConsent"]');
  assert.equal((await goals()).filter(value => value.goal === 'order_form_start').length, 1);
  assert.equal(await page.$$eval('[aria-invalid="true"]', elements => elements.length), 0);
  assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true);
  assert.equal(await page.$eval('#interest-dialog', dialog => dialog.scrollWidth <= dialog.clientWidth), true);
  await page.$eval('#interest-dialog', dialog => { dialog.scrollTop = 0; });
  await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
  await page.screenshot({ path: new URL('../dist/qa-interest-mobile.png', import.meta.url).pathname });
  await page.$eval('#interest-form', form => { form.requestSubmit(); form.requestSubmit(); });
  await page.waitForFunction(() => document.querySelector('[data-interest-submit]').textContent === 'Повторить отправку');
  assert.equal(posts.length, 1);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM interests').get().n, 1);
  assert.equal(await page.$eval('[data-interest-success]', el => el.hidden), true);
  assert.equal((await goals()).filter(value => value.goal === 'order_submit').length, 0);
  await page.$eval('#interest-form', form => form.requestSubmit());
  await page.waitForFunction(() => !document.querySelector('[data-interest-success]').hidden);
  assert.equal(posts.length, 2);
  assert.equal(posts[0].requestId, posts[1].requestId);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM interests').get().n, 1);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM submission_tokens').get().n, 1);
  assert.equal((await goals()).filter(value => value.goal === 'order_submit').length, 1);
  assert.deepEqual(await page.evaluate(() => window.fixtureSaved), [{ requestId: posts[0].requestId }]);
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-interest-success')), true);
  const keys = ['city', 'productid', 'variant', 'qty', 'value', 'requestId'];
  for (const goal of await goals()) assert.ok(Object.keys(goal.params).every(key => keys.includes(key)));
  await page.$eval('#interest-form', form => form.requestSubmit());
  assert.equal(posts.length, 2);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'fixture-open');
  await page.goto(`${fixtureOrigin}/?disabled=1`, { waitUntil: 'networkidle0' });
  await page.click('#fixture-open');
  assert.equal(await page.$eval('[data-interest-submit]', el => el.disabled), true);
  assert.match(await page.$eval('[data-interest-status]', el => el.textContent), /пока не подключено/);
  await page.goto(`${fixtureOrigin}/?qa=1`, { waitUntil: 'networkidle0' });
  await page.click('#fixture-open');
  assert.deepEqual(await goals(), []);
  assert.equal(await page.$('[data-pirogorsk-metrica]'), null);
  await page.goto(fixtureOrigin, { waitUntil: 'networkidle0' });
  await page.click('#fixture-open');
  assert.deepEqual(await goals(), []);
  assert.equal(await page.$('[data-pirogorsk-metrica]'), null);
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('#fixture-open');
  assert.deepEqual(await goals(), []);
  assert.equal(await page.$('[data-pirogorsk-metrica]'), null);
  assert.deepEqual(scriptErrors, []);
  process.stdout.write('PASS: actual form + deployed bundle, 320px layout, validation/focus, double submit, lost acknowledgement, idempotent retry, one goal/event, empty endpoint, QA/local analytics suppression.\n');
} finally {
  await browser?.close(); chrome?.kill(); await new Promise(resolve => server.close(resolve)); sqlite.close();
}
