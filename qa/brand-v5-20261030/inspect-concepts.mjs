// Design-stage previews only. Production components and public assets are untouched.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const root = resolve('qa/brand-v5-20261030');
const site = resolve('site');
await mkdir(`${root}/screens`, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const results = [], errors = [];
const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.json':'application/json', '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon' };
try {
  const visual = await browser.newPage();
  await visual.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 1 });
  for (const round of ['v1', 'v2', 'v3']) {
    await visual.goto(pathToFileURL(`${root}/preview-${round}.html`).href);
    await visual.evaluate(() => document.fonts.ready);
    const sections = await visual.$$('section');
    for (let i = 0; i < sections.length; i++) await sections[i].screenshot({ path: `${root}/screens/${round}-section-${i}.png` });
  }
  await visual.close();
  for (const width of [320, 390, 768, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: width < 600 ? 740 : 1024, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 1100 });
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      try {
        const url = new URL(request.url());
        if (url.protocol === 'data:') return await request.continue();
        if (url.origin === 'https://mc.yandex.ru') return await request.respond({ status: 200, body: '' });
        assert.equal(url.origin, 'https://pirogorsk.ru');
        assert.equal(request.method(), 'GET');
        const file = resolve(site, `.${decodeURIComponent(url.pathname)}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
        assert.ok(file.startsWith(site + sep));
        await request.respond({ status: 200, contentType: mime[extname(file)] || 'application/octet-stream', body: await readFile(file) });
      } catch (error) { errors.push(error.message); await request.abort(); }
    });
    await page.goto('https://pirogorsk.ru/?qa=1', { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    const before = await page.$eval('.masthead-main', el => el.getBoundingClientRect().height);
    for (const key of ['a', 'b', 'c']) {
      const svg = (await readFile(`design/brand-v5/concept-${key}-lockup-v3.svg`, 'utf8')).replaceAll('#111111', '#17263B');
      await page.$eval('.pirogorsk-brand--masthead', (brand, { svg, width }) => {
        const main = brand.closest('.masthead-main');
        const used = el => {
          const visible = [...el.children].filter(child => child.getBoundingClientRect().width > 0);
          return visible.reduce((sum, child) => sum + child.getBoundingClientRect().width, 0) + Math.max(0, visible.length - 1) * parseFloat(getComputedStyle(el).gap);
        };
        const side = Math.max(used(main.querySelector('.masthead-start')), used(main.querySelector('.masthead-end')));
        const available = main.getBoundingClientRect().width - side * 2 - parseFloat(getComputedStyle(main).gap) * 2;
        const mainStyle = getComputedStyle(main);
        const availableHeight = main.getBoundingClientRect().height - parseFloat(mainStyle.paddingTop) - parseFloat(mainStyle.paddingBottom);
        const viewBox = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement.getAttribute('viewBox').split(/\s+/).map(Number);
        const size = Math.min(width <= 600 ? 212 : width <= 1000 ? 248 : 312, available, availableHeight * viewBox[2] / viewBox[3]);
        brand.replaceChildren();
        brand.setAttribute('aria-label', 'Пирогорск — на главную');
        const image = new Image();
        image.alt = '';
        image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
        image.style.cssText = 'display:block;width:100%;height:auto;max-width:none';
        brand.style.width = `${size}px`;
        brand.append(image);
      }, { svg, width });
      await page.waitForFunction(() => [...document.querySelectorAll('.pirogorsk-brand--masthead img')].every(img => img.complete && img.naturalWidth > 0));
      const geometry = await page.evaluate(() => {
        const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
        return { brand:box('.pirogorsk-brand--masthead'), start:box('.masthead-start'), end:box('.masthead-end'), main:box('.masthead-main'), overflow:document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(geometry.overflow, false);
      assert.ok(geometry.brand.x >= geometry.start.right - 1, `${key}@${width}: left controls overlap`);
      assert.ok(geometry.brand.right <= geometry.end.x + 1, `${key}@${width}: right controls overlap`);
      assert.ok(geometry.main.height <= before + 1, `${key}@${width}: header grew from ${before} to ${geometry.main.height}`);
      await page.screenshot({ path:`${root}/screens/header-${key}-${width}.png`, clip:{ x:0, y:0, width, height:Math.min(440, await page.$eval('.masthead', el => el.getBoundingClientRect().bottom + 24)) } });
      results.push({ key, width, before, ...geometry });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${root}/context-results.json`, JSON.stringify({ scope:'Browser-only design-stage substitution; no production changes', checkedAt:new Date().toISOString(), errors, results }, null, 2) + '\n');
  console.log('PASS: 12 header previews at 320/390/768/1280; no overlap, overflow or header growth. Three rounds of visual sheets rendered.');
} finally { await browser.close(); await chrome.kill(); }
