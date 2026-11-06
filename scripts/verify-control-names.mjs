import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, extname, sep } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const stage = process.env.QA_BASE ? 'production' : 'local';
const output = process.env.QA_OUTPUT || 'qa/control-names-ci-20261106';
await mkdir(output, { recursive: true });
const report = { stage, base: '', views: [], checks: [], errors: [] };
const root = resolve('site');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
let server;
if (!process.env.QA_BASE) {
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const path = resolve(root, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
      assert.ok(path.startsWith(root + sep));
      response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
      response.end(await readFile(path));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
}
const base = process.env.QA_BASE || `http://127.0.0.1:${server.address().port}`;
report.base = base;
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions', '--no-first-run'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
try {
  for (const width of [320, 390, 768, 1280]) {
    for (const path of ['/', '/menu/', '/pirogi/myasnoy-pirog/', '/catalog/baltiyskiy-piknik-set/']) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.setViewport({ width, height: 960 });
      await page.setRequestInterception(true);
      page.on('request', request => {
        const u = new URL(request.url());
        if (request.method() !== 'GET' || (['http:', 'https:'].includes(u.protocol) && u.origin !== new URL(base).origin)) request.abort();
        else request.continue();
      });
      const response = await page.goto(`${base}${path}?qa=1`, { waitUntil: 'networkidle0' });
      assert.equal(response.status(), 200, path);
      const audit = async state => {
        if (!await page.evaluate(() => Boolean(window.axe))) await page.addScriptTag({ path: axePath });
        const result = await page.evaluate(async () => {
          const r = await window.axe.run('[data-open="selection-dialog"], [data-cutaway-toggle]', { runOnly: { type: 'rule', values: ['label-content-name-mismatch'] } });
          return { violations: r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: r.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
        });
        assert.deepEqual(result.violations, [], `${path} ${width} ${state}`);
        assert.deepEqual(result.incomplete, [], `${path} ${width} ${state}: unresolved names`);
        report.checks.push({ path, width, state, result: 'PASS' });
      };
      await audit('empty');
      const headerName = await page.$eval('.masthead-selection', e => e.getAttribute('aria-label'));
      assert.equal(headerName, 'Открыть подборку');
      if (path === '/' || path === '/menu/') {
        const add = path === '/' ? '[data-product="meat"] [data-add]' : '[data-feed-id="meat"] [data-feed-add]';
        await page.$eval(add, e => { e.click(); e.click(); });
        assert.equal(await page.$eval('.masthead-selection', e => e.getAttribute('aria-label')), `${headerName}, 2 шт.`);
        await audit('two-added');
        await page.focus('.masthead-selection');
        await page.keyboard.press('Enter');
        assert.equal(await page.$eval('#selection-dialog', e => e.open), true);
        await audit('dialog-open');
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('#selection-dialog', e => e.open), false);
        assert.equal(await page.evaluate(() => document.activeElement.matches('.masthead-selection')), true);
        await page.reload({ waitUntil: 'networkidle0' });
        assert.equal(await page.$eval('.masthead-selection', e => e.getAttribute('aria-label')), `${headerName}, 2 шт.`);
        await audit('saved-reload');
        await page.evaluate(() => localStorage.removeItem('pirogorsk-selection'));
        await page.reload({ waitUntil: 'networkidle0' });
        assert.equal(await page.$eval('.masthead-selection', e => e.getAttribute('aria-label')), headerName);
        await audit('cleared-reload');
      }
      if (await page.$('[data-cutaway-toggle]')) {
        await page.focus('[data-cutaway-toggle]');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('[data-cutaway-toggle]').getAttribute('aria-pressed') === 'true', { timeout: 20000 });
        await audit('cutaway-visible');
        if (width === 390 || width === 768) await page.screenshot({ path: `${output}/${stage}-${path === '/' ? 'home' : path === '/menu/' ? 'menu' : 'product'}-${width}.png` });
        await page.keyboard.press('Enter');
        assert.equal(await page.$eval('[data-cutaway-toggle]', e => e.getAttribute('aria-pressed')), 'false');
        await audit('whole-pie-restored');
      }
      report.views.push({ path, width, result: 'PASS' });
      await context.close();
    }
  }
  assert.deepEqual(report.errors, []);
  console.log(`Control names PASS (${stage}): ${report.views.length} page views, ${report.checks.length} axe states; keyboard, saved/empty selection and cutaway labels.`);
} finally {
  await writeFile(`${output}/${stage}-report.json`, JSON.stringify(report, null, 2));
  browser.disconnect();
  await chrome.kill();
  if (server) await new Promise(done => server.close(done));
}
