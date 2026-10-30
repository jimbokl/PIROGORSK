import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const production = process.argv.includes('--production');
const stage = production ? 'production' : 'local';
const root = resolve('qa/brand-v6-20261030');
const site = resolve('site');
await mkdir(`${root}/${stage}`, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const results = [], errors = [];
const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.json':'application/json', '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon' };
const primary = [320, 390, 768, 1024, 1280, 1440];
const widths = [...primary, 360, 600, 601, 1000, 1001, 1100, 1101, 1190, 1191];
const matrix = widths.map(width => ['/', width]);
for (const path of ['/menu/', '/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/', '/delivery/', '/blog/']) {
  for (const width of [320, 390, 768, 1280]) matrix.push([path, width]);
}
try {
  for (const [path, width] of matrix) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: width < 600 ? 740 : 1024, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 1100 });
    page.on('pageerror', error => errors.push(`${path}@${width}: ${error.message}`));
    page.on('response', response => { if (response.url().startsWith('https://pirogorsk.ru/') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    if (!production) {
      await page.setRequestInterception(true);
      page.on('request', async request => {
        try {
          const url = new URL(request.url());
          if (url.protocol === 'data:') return await request.continue();
          if (url.origin === 'https://mc.yandex.ru') return await request.respond({ status:200, body:'' });
          assert.equal(url.origin, 'https://pirogorsk.ru');
          assert.equal(request.method(), 'GET');
          const file = resolve(site, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
          assert.ok(file.startsWith(site + sep));
          await request.respond({ status:200, contentType:mime[extname(file)] || 'application/octet-stream', body:await readFile(file) });
        } catch (error) { errors.push(error.message); await request.abort(); }
      });
    }
    await page.goto(`https://pirogorsk.ru${path}?qa=1`, { waitUntil:'networkidle0', timeout:45000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const img = document.querySelector('.pirogorsk-brand--masthead img');
      return img?.complete && img.naturalWidth > 0;
    });
    const geometry = await page.evaluate(() => {
      const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
      const brand = document.querySelector('.pirogorsk-brand--masthead');
      const img = brand.querySelector('img');
      return { brand:box('.pirogorsk-brand--masthead'), start:box('.masthead-start'), end:box('.masthead-end'), main:box('.masthead-main'), overflow:document.documentElement.scrollWidth > innerWidth,
        image: { src:img.currentSrc, naturalWidth:img.naturalWidth, ratio:img.width/img.height }, label:brand.getAttribute('aria-label'), href:brand.getAttribute('href'),
        icons:[...document.querySelectorAll('link[rel*="icon"]')].map(link => link.getAttribute('href')),
        firstAdd:document.querySelector('[data-add]')?.getBoundingClientRect().bottom };
    });
    assert.equal(geometry.overflow, false, `${path}@${width}: page overflow`);
    assert.ok(geometry.brand.x >= geometry.start.right - 1, `${path}@${width}: left overlap`);
    assert.ok(geometry.brand.right <= geometry.end.x + 1, `${path}@${width}: right overlap`);
    assert.ok(Math.abs(geometry.image.ratio - 2089/753) < .06, 'Logo proportions changed');
    assert.equal(geometry.label, 'Пирогорск — на главную');
    assert.equal(geometry.href, path === '/' ? '#top' : '/');
    assert.ok(geometry.image.src.includes('pirogorsk-logo-'));
    assert.equal(geometry.icons.length, 4);
    assert.ok(geometry.icons.every(href => href.endsWith('?v=20261030-6')));
    const slug = path === '/' ? 'home' : path.split('/').filter(Boolean).at(-1);
    if (primary.includes(width)) {
      await page.screenshot({ path:`${root}/${stage}/${slug}-${width}.png` });
      if (path === '/') {
        await (await page.$('.masthead')).screenshot({ path:`${root}/${stage}/header-${width}.png` });
        await page.click('[data-menu-open]');
        await page.waitForSelector('#site-menu-dialog[open]');
        await page.keyboard.press('Escape');
        await page.waitForSelector('#site-menu-dialog:not([open])');
        await page.click('.masthead-selection');
        await page.waitForSelector('#selection-dialog[open]');
        await page.keyboard.press('Escape');
        await page.waitForSelector('#selection-dialog:not([open])');
      }
    }
    if (path === '/' && primary.includes(width)) {
      await page.$eval('.pirogorsk-brand--footer', el => el.scrollIntoView({ block:'center' }));
      await page.waitForFunction(() => { const img = document.querySelector('.pirogorsk-brand--footer img'); return img?.complete && img.naturalWidth > 0; });
      await page.screenshot({ path:`${root}/${stage}/footer-${width}.png` });
    }
    results.push({ path, width, ...geometry });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${root}/${stage}-results.json`, JSON.stringify({ checkedAt:new Date().toISOString(), stage, errors, results }, null, 2)+'\n');
  console.log(`PASS: ${results.length} responsive layouts; logo loaded, proportions, controls, footer, favicon references, no overlap/overflow/JS or HTTP errors (${stage}).`);
} finally { await browser.close(); await chrome.kill(); }
