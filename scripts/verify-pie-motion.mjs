import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const base = process.env.QA_BASE || 'http://127.0.0.1:4321';
const stage = process.env.QA_BASE ? 'production' : 'local';
const output = process.env.PIE_MOTION_QA_DIR || `qa/pie-motion-20261031/${stage}`;
await mkdir(output, { recursive: true });
const report = { base, views: [], checks: [], errors: [] };
let chrome, browser;
try {
  chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions', '--no-first-run'] });
  browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
  const page = await browser.newPage();
  const imageRequests = [];
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (/\/(whole-pie|oak-board|baltic-terrace)\./.test(url.pathname)) imageRequests.push(url.pathname);
    if (request.method() !== 'GET' || (['http:', 'https:'].includes(url.protocol) && url.origin !== new URL(base).origin)) request.abort();
    else request.continue();
  });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  for (const width of [320, 390, 768, 1024, 1280]) {
    // Retire the previous warm scene before resizing: its responsive image
    // requests must not be counted as requests from the next initial banner.
    await page.goto('about:blank');
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    imageRequests.length = 0;
    const response = await page.goto(`${base}/?qa=1`, { waitUntil: 'networkidle0' });
    assert.equal(response.status(), 200);
    assert.deepEqual(imageRequests, [], `seventh-slide images stay lazy on the first banner ${width}`);
    const slides = [];
    for (const id of ['pies', 'company', 'tea', 'mini', 'seaside', 'bake', 'warm']) {
      await page.click(`[data-tasting-select=${id}]`);
      await page.waitForFunction(id => document.querySelector('[data-tasting-hero]').dataset.flavor === id, {}, id);
      slides.push(await page.$eval('[data-tasting-hero]', hero => {
        const box = hero.getBoundingClientRect();
        const cta = hero.querySelector('[data-tasting-cta]').getBoundingClientRect();
        return { id: hero.dataset.flavor, height: box.height, ctaInside: cta.bottom <= box.bottom && cta.left >= box.left && cta.right <= box.right };
      }));
    }
    assert.ok(Math.max(...slides.map(s => s.height)) - Math.min(...slides.map(s => s.height)) < 1, `consistent slide height ${width}`);
    assert.ok(slides.every(slide => slide.ctaInside), `CTA inside hero ${width}`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.querySelector('[data-pie-motion]').scrollIntoView({ block: 'center', behavior: 'instant' });
      await Promise.all([...document.querySelectorAll('[data-tasting-scene=warm] img')].map(image => image.decode()));
    });
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      images: [...document.querySelectorAll('[data-tasting-scene=warm] img')].every(image => image.complete && image.naturalWidth > 0),
      hiddenControl: document.querySelector('[data-pie-replay]').hidden,
      animations: document.querySelector('[data-pie-motion]').getAnimations({ subtree: true }).length,
      height: document.querySelector('[data-tasting-hero]').getBoundingClientRect().height,
    }));
    assert.equal(state.overflow, false, `overflow ${width}`);
    assert.equal(state.images, true); assert.equal(state.hiddenControl, true); assert.equal(state.animations, 0);
    await (await page.$('[data-tasting-hero]')).screenshot({ path: `${output}/scene-${width}.png` });
    report.views.push({ width, ...state, slides });
  }
  report.checks.push('five widths; all seven slides keep equal height and visible CTA; reduced motion has no active animations');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });
  const scrollToPie = () => page.evaluate(() => document.querySelector('.pie-motion-stage').scrollIntoView({ block: 'center', behavior: 'instant' }));
  const stateIs = state => page.waitForFunction(value => document.querySelector('[data-pie-motion]').dataset.motionState === value, { timeout: 6500 }, state);
  await page.click('[data-tasting-select=warm]');
  await scrollToPie(); await stateIs('playing');
  await page.click('[data-pie-replay]'); await stateIs('paused');
  const position = () => page.evaluate(() => document.querySelector('[data-pie-food]').getAnimations()[0]?.currentTime);
  await page.waitForFunction(() => document.querySelector('[data-pie-food]').getAnimations().every(animation => animation.playState === 'paused' && !animation.pending));
  const paused = await position();
  await new Promise(done => setTimeout(done, 180));
  assert.equal(await position(), paused);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.pie-motion-stage').getBoundingClientRect().bottom < 0);
  await scrollToPie();
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  await stateIs('paused');
  await page.click('[data-pie-replay]'); await stateIs('playing');
  await page.click('[data-tasting-select=pies]'); await stateIs('paused');
  await page.click('[data-tasting-select=warm]'); await stateIs('playing');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })); await stateIs('paused');
  await scrollToPie(); await stateIs('playing'); await stateIs('done');
  await page.click('[data-pie-replay]'); await stateIs('playing');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await stateIs('done');
  assert.equal(await page.$eval('[data-pie-motion]', scene => scene.getAnimations({ subtree: true }).length), 0);
  report.checks.push('pause holds position; manual pause survives scrolling; hidden-slide and offscreen pause/resume; finish; replay; live reduced-motion switch');
  await page.setJavaScriptEnabled(false);
  await page.reload({ waitUntil: 'networkidle0' });
  await (await page.$('[data-tasting-hero]')).screenshot({ path: `${output}/no-js.png` });
  assert.equal(await page.$eval('[data-pie-replay]', button => button.hidden), true);
  assert.equal(await page.$eval('[data-tasting-hero]', hero => hero.dataset.flavor), 'pies');
  assert.equal(await page.$eval('[data-tasting-cta]', cta => cta.getAttribute('href')), '/menu/');
  assert.equal(await page.$$eval('[data-tasting-scene]', scenes => scenes.length), 7);
  report.checks.push('no-JavaScript original first banner and menu link; seven server-rendered scenes');
  assert.deepEqual(report.errors, []);
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`Pie motion PASS: ${report.views.length} widths, ${report.checks.length} groups, no page errors (${stage})`);
} finally {
  await browser?.disconnect();
  if (chrome) chrome.kill();
}
