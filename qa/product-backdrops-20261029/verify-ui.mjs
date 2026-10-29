import assert from 'node:assert/strict';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { newPageProducts } from '../../src/data/product-pages.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';
const [origin = 'http://127.0.0.1:4325', label = 'local'] = process.argv.slice(2);
const directory = new URL('./', import.meta.url);
await mkdir(directory, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const errors = [], samples = [], motion = [];
const routeProducts = ['mini-pies','bread','desserts','bake','dough'].map(category => newPageProducts.find(p => p.category === category));
routeProducts.push(...newPageProducts.filter(p => ['cranberry','tableware'].includes(p.id)));
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const decode = page => page.$$eval('[data-product-backdrop] img, [data-supplier-artwork] .product-artwork-subject img', async images => {
  images.forEach(image => { image.loading = 'eager'; });
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return Promise.all(images.map(async image => {
    let error;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await image.decode(); error = undefined; break; }
      catch (caught) { error = caught.message; await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    return { src: image.currentSrc, width: image.naturalWidth, error };
  }));
});
const readMotion = (page, selector) => page.$eval(selector, element => ({
  subject: getComputedStyle(element.querySelector('.product-artwork-subject')).transform,
  background: getComputedStyle(element.querySelector('.product-backdrop')).transform,
  subjectTransition: getComputedStyle(element.querySelector('.product-artwork-subject')).transitionDuration,
  backgroundTransition: getComputedStyle(element.querySelector('.product-backdrop')).transitionDuration,
}));
try {
  for (const width of [320, 390, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
    const backdrops = await page.$$eval('[data-product-backdrop]', elements => elements.map(element => ({ id: element.dataset.productBackdrop, decorative: element.getAttribute('aria-hidden'), alt: element.querySelector('img').alt })));
    assert.equal(backdrops.length, 84);
    assert.equal(new Set(backdrops.map(item => item.id)).size, 84);
    assert.ok(backdrops.every(item => item.decorative === 'true' && item.alt === ''));
    assert.equal(await page.$$eval('[data-supplier-artwork]', elements => elements.length), 78);
    const images = await decode(page);
    assert.equal(images.length, 162);
    assert.deepEqual(images.filter(image => !image.width || image.error), []);
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true);
    await page.$eval('[data-supplier-id]', element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: new URL(`${label}-cards-${width}.png`, directory).pathname });
    samples.push({ route: '/menu/', width, backdrops: backdrops.length, decodedImages: images.length, overflow: false });
    for (const product of routeProducts) {
      const route = catalogProductHref(product);
      await page.goto(`${origin}${route}?qa=1`, { waitUntil: 'networkidle0' });
      assert.equal(await page.$$eval(`[data-product-backdrop="${product.id}"]`, elements => elements.length), 1);
      const images = await decode(page);
      assert.deepEqual(images.filter(image => !image.width || image.error), []);
      assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `${route} at ${width}`);
      if (product === routeProducts[0] || ['tableware','cranberry'].includes(product.id)) await page.screenshot({ path: new URL(`${label}-${product.id}-${width}.png`, directory).pathname });
      samples.push({ route, width, decodedImages: images.length, overflow: false });
    }
    await context.close();
  }
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
  const selector = '[data-supplier-artwork]';
  await page.$eval(selector, element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.mouse.move(0, 0); await delay(750);
  const rest = await readMotion(page, selector);
  assert.equal(rest.subject, 'none'); assert.equal(rest.background, 'none');
  await page.hover(selector); await delay(750);
  const hover = await readMotion(page, selector);
  assert.notEqual(hover.subject, 'none'); assert.notEqual(hover.background, 'none'); assert.notEqual(hover.subject, hover.background);
  motion.push({ type: 'desktop-hover', rest, active: hover });
  await page.mouse.move(0, 0); await page.keyboard.press('Tab');
  await page.$eval('.supplier-art-link', element => element.focus()); await delay(750);
  const focus = await readMotion(page, selector);
  assert.notEqual(focus.subject, 'none'); assert.notEqual(focus.background, 'none');
  motion.push({ type: 'keyboard-focus', active: focus });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.hover(selector); await delay(50);
  const reduced = await readMotion(page, selector);
  assert.equal(reduced.subject, 'none'); assert.equal(reduced.background, 'none');
  assert.equal(reduced.subjectTransition, '0s'); assert.equal(reduced.backgroundTransition, '0s');
  motion.push({ type: 'reduced-motion', active: reduced });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(`${origin}${catalogProductHref(routeProducts[0])}?qa=1`, { waitUntil: 'networkidle0' });
  await page.hover('.product-artwork--hero'); await delay(750);
  const hero = await readMotion(page, '.product-artwork--hero');
  assert.notEqual(hero.subject, 'none'); assert.notEqual(hero.background, 'none');
  motion.push({ type: 'product-hero-hover', active: hero });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const reducedHero = await readMotion(page, '.product-artwork--hero');
  assert.equal(reducedHero.subject, 'none'); assert.equal(reducedHero.background, 'none');
  motion.push({ type: 'product-hero-reduced', active: reducedHero });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(`${origin}${catalogProductHref(routeProducts.find(product => product.id === 'cranberry'))}?qa=1`, { waitUntil: 'networkidle0' });
  const drinkMotion = () => page.$eval('.product-visual--hero', element => ({ subject:getComputedStyle(element.querySelector('.product-visual-subject')).transform, background:getComputedStyle(element.querySelector('.product-backdrop')).transform, transition:getComputedStyle(element.querySelector('.product-visual-subject')).transitionDuration }));
  await page.mouse.move(0,0); await delay(750);
  const drinkRest = await drinkMotion();
  await page.hover('.product-visual--hero'); await delay(750);
  const drinkHover = await drinkMotion();
  assert.notEqual(drinkHover.subject, drinkRest.subject); assert.notEqual(drinkHover.background,'none');
  motion.push({ type:'drink-hero-hover', rest:drinkRest, active:drinkHover });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const drinkReduced = await drinkMotion();
  assert.equal(drinkReduced.subject,drinkRest.subject); assert.equal(drinkReduced.background,'none'); assert.equal(drinkReduced.transition,'0s');
  motion.push({ type:'drink-hero-reduced', active:drinkReduced });
  await page.close();
  const context = await browser.createBrowserContext();
  const touch = await context.newPage();
  touch.on('pageerror', error => errors.push(error.message));
  await touch.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await touch.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
  await touch.$eval('.supplier-art-link', element => { const url = new URL(element.href); url.searchParams.set('qa','1'); element.href = url.href; });
  await touch.$eval(selector, element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const rect = await touch.$eval(selector, element => { const r = element.getBoundingClientRect(); return { x: r.x+r.width/2, y:r.y+r.height/2 }; });
  await touch.touchscreen.touchStart(rect.x, rect.y); await delay(120);
  const press = await readMotion(touch, selector);
  assert.notEqual(press.subject, 'none'); assert.notEqual(press.background, 'none');
  motion.push({ type: 'touch-press', active: press });
  await touch.emulateMediaFeatures([{ name:'prefers-reduced-motion', value:'reduce' }]);
  const reducedPress = await readMotion(touch,selector);
  assert.equal(reducedPress.subject,'none'); assert.equal(reducedPress.background,'none');
  motion.push({ type:'touch-press-reduced', active:reducedPress });
  await Promise.all([touch.waitForNavigation({ waitUntil: 'networkidle0' }), touch.touchscreen.touchEnd()]);
  assert.equal(new URL(touch.url()).pathname, catalogProductHref(routeProducts[0]));
  await context.close();
  assert.deepEqual(errors, []);
  const result = { origin, checkedAt: new Date().toISOString(), samples, motion, errors, note: 'QA mode, no order submission. 84 new borders plus 8 retained pie backgrounds.' };
  await writeFile(new URL(`${label}-readback.json`, directory), JSON.stringify(result, null, 2)+'\n');
  console.log(JSON.stringify({ samples:samples.length, responsiveWidths:[320,390,1280], decodedPerWidth:162, motion:motion.length, errors }));
} finally { await browser.close(); chrome.kill(); }
