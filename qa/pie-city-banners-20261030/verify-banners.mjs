import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const production = process.argv.includes('--production');
const stage = production ? 'production' : 'local';
const root = resolve('qa/pie-city-banners-20261030');
const site = resolve('site');
await mkdir(`${root}/${stage}`, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const results = [], errors = [], flows = [];
const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.json':'application/json', '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png', '.ico':'image/x-icon' };
const ids = ['pies', 'company', 'tea'];
const hrefs = ['/menu/', '#nabory', '/pirogi/pirog-s-vishney/'];

async function makePage(width, scale = 1, javascript = true, reduced = true) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width, height: width < 600 ? 740 : 1024, deviceScaleFactor:scale, isMobile:width < 600, hasTouch:width < 1100 });
  await page.setJavaScriptEnabled(javascript);
  await page.emulateMediaFeatures([{ name:'prefers-reduced-motion', value:reduced ? 'reduce' : 'no-preference' }]);
  page.on('pageerror', error => errors.push(`${width}: ${error.message}`));
  page.on('response', response => { if (response.url().startsWith('https://pirogorsk.ru/') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
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
  await page.goto('https://pirogorsk.ru/?qa=1', { waitUntil:'networkidle0', timeout:45000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => { const img = document.querySelector('[data-tasting-scene="pies"] img'); return img?.complete && img.naturalWidth > 0; });
  return { page, context };
}

async function selected(page, id) {
  await page.waitForFunction(id => document.querySelector('[data-tasting-hero]').dataset.flavor === id, {}, id);
  await page.evaluate(async () => { await Promise.allSettled(document.querySelector('[data-tasting-hero]').getAnimations({ subtree:true }).map(a => a.finished)); });
}

async function inspect(page, width, id, scale = 1) {
  const geometry = await page.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return { x:r.x, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
    const hero = document.querySelector('[data-tasting-hero]');
    const scene = hero.querySelector('[data-tasting-scene]:not([hidden])');
    const img = scene.querySelector('img');
    const title = hero.querySelector('h1');
    const cta = hero.querySelector('[data-tasting-cta]');
    return { hero:box(hero), title:box(title), cta:box(cta), art:box(img),
      overflow:document.documentElement.scrollWidth > innerWidth,
      href:cta.getAttribute('href'), heading:title.textContent, flavor:hero.dataset.flavor,
      visible:hero.querySelectorAll('[data-tasting-scene]:not([hidden])').length,
      pressed:[...hero.querySelectorAll('[aria-pressed="true"]')].map(b => b.dataset.tastingSelect),
      image:{ src:img.currentSrc, loaded:img.complete && img.naturalWidth > 0, ratio:img.naturalWidth/img.naturalHeight, fit:getComputedStyle(img).objectFit, alt:img.alt },
      firstAdd:document.querySelector('[data-add]')?.getBoundingClientRect().bottom,
      motion:hero.getAnimations({ subtree:true }).filter(a => a.playState === 'running').length };
  });
  assert.equal(geometry.overflow, false, `${width}/${id}: overflow`);
  assert.equal(geometry.visible, 1);
  assert.deepEqual(geometry.pressed, [id]);
  assert.equal(geometry.href, hrefs[ids.indexOf(id)]);
  assert.ok(geometry.image.loaded && geometry.image.alt.length > 20);
  assert.equal(geometry.image.ratio, 1);
  assert.equal(geometry.image.fit, 'contain');
  assert.ok(geometry.art.x >= geometry.hero.x && geometry.art.right <= geometry.hero.right + 1);
  assert.ok(geometry.art.top >= geometry.hero.top && geometry.art.bottom <= geometry.hero.bottom);
  assert.ok(geometry.cta.bottom <= geometry.hero.bottom && geometry.cta.height >= 44);
  assert.ok(geometry.title.right <= geometry.art.x + 2, `${width}/${id}: text overlaps artwork`);
  assert.equal(geometry.motion, 0);
  results.push({ width, scale, id, ...geometry });
  if ([320,390,768,1024,1280].includes(width)) {
    await page.screenshot({ path:`${root}/${stage}/home-${width}-${id}${scale > 1 ? `-${scale}x` : ''}.png` });
    await (await page.$('[data-tasting-hero]')).screenshot({ path:`${root}/${stage}/banner-${width}-${id}${scale > 1 ? `-${scale}x` : ''}.png` });
  }
}

try {
  for (const width of [320,390,600,601,768,1024,1280]) {
    const { page, context } = await makePage(width);
    for (const id of ids) {
      if (id !== 'pies') await page.click(`[data-tasting-select="${id}"]`);
      await selected(page, id);
      await inspect(page, width, id);
    }
    await page.click('[data-tasting-next]'); await selected(page, 'pies');
    await page.keyboard.press('ArrowLeft'); await selected(page, 'tea');
    await page.click('[data-tasting-prev]'); await selected(page, 'company');
    await page.click('[data-tasting-cta]');
    await page.waitForFunction(() => location.hash === '#nabory');
    assert.ok(await page.$('#nabory'));
    flows.push({ width, controls:true, keyboard:true, companyAnchor:true });
    await context.close();
  }
  for (const [width, scale] of [[390,3], [768,2]]) {
    const { page, context } = await makePage(width, scale, true, false);
    for (const id of ids) {
      if (id !== 'pies') await page.click(`[data-tasting-select="${id}"]`);
      await selected(page, id); await inspect(page, width, id, scale);
    }
    // Chrome's touch input exercises browser gesture routing and the swipe handler.
    const art = await (await page.$('[data-tasting-art]')).boundingBox();
    const touch = await page.createCDPSession();
    const point = { x:art.x + art.width - 12, y:art.y + art.height / 2 };
    await touch.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[point] });
    for (const dx of [25,50,75,100]) await touch.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:point.x - dx, y:point.y + 2 }] });
    await touch.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await touch.detach();
    await selected(page, 'pies');
    const menu = await page.goto('https://pirogorsk.ru/menu/?qa=1', { waitUntil:'domcontentloaded' });
    assert.equal(menu.status(), 200);
    const cherry = await page.goto('https://pirogorsk.ru/pirogi/pirog-s-vishney/?qa=1', { waitUntil:'domcontentloaded' });
    assert.equal(cherry.status(), 200);
    flows.push({ width, scale, normalMotion:true, browserTouchSwipe:true, destinations:true });
    await context.close();
  }
  const { page, context } = await makePage(390, 1, false);
  const fallback = await page.$eval('[data-tasting-hero]', el => ({ title:el.querySelector('h1').textContent, href:el.querySelector('[data-tasting-cta]').getAttribute('href'), visible:[...el.querySelectorAll('[data-tasting-scene]')].filter(s => !s.hidden).map(s => s.dataset.tastingScene) }));
  assert.equal(fallback.href, '/menu/'); assert.deepEqual(fallback.visible, ['pies']);
  flows.push({ noJavascript:fallback });
  await context.close();
  assert.deepEqual(errors, []);
  await writeFile(`${root}/${stage}-results.json`, JSON.stringify({ checkedAt:new Date().toISOString(), stage, errors, flows, results }, null, 2)+'\n');
  console.log(`PASS: ${results.length} slide/layout checks; phone/tablet Retina, controls, keyboard, browser touch swipe, destinations, reduced/normal motion, no-JS, no overflow/overlap/JS or HTTP errors (${stage}).`);
} finally { await browser.close(); await chrome.kill(); }
