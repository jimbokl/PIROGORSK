import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.QA_BASE || 'http://127.0.0.1:4322';
const stage = process.env.QA_STAGE || 'local';
const directory = new URL('./', import.meta.url);
await mkdir(directory, { recursive: true });
const routes = [
  ['home', '/'], ['menu', '/menu/'], ['delivery', '/delivery/'],
  ['city', '/zelenogradsk/'], ['product', '/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/'],
  ['blog', '/blog/'], ['article', '/journal/skolko-piroga-na-cheloveka/'],
  ['about', '/about/'], ['occasions', '/povody/'], ['partners', '/partners/'],
  ['planner', '/podbor/'], ['privacy', '/privacy/'], ['terms', '/terms/'],
];
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const views = [];
try {
  for (const [name, path] of routes.filter(([name]) => !process.env.QA_ONLY || process.env.QA_ONLY.split(',').includes(name))) for (const width of [320, 390, 768, 1280]) {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width, height: width === 768 ? 1024 : 844, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) request.continue();
      else request.abort();
    });
    page.on('response', response => {
      if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle0' });
    assert.equal(response.status(), 200, `${name}: HTTP`);
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => {
      const signature = document.querySelector('.town-signature');
      const mark = document.querySelector('.ed-hero .ed-eyebrow,.product-hero .ed-eyebrow,.planner-intro>.ed-eyebrow,.interest-document>.ed-eyebrow,.town-hero-eyebrow');
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        signature: signature?.getAttribute('aria-hidden') === 'true' && signature.getBoundingClientRect().width > 0,
        gold: getComputedStyle(document.documentElement).getPropertyValue('--brand-gold').trim(),
        mark: mark ? getComputedStyle(mark, '::before').backgroundImage.includes('pirogorsk-symbol.svg') : null,
        chapterNumbers: document.querySelector('.blog-toc a') ? getComputedStyle(document.querySelector('.blog-toc a'), '::before').content.includes('chapter') : null,
      };
    });
    assert(state.overflow <= 1, `${name} ${width}: overflow ${state.overflow}`);
    assert(state.signature, `${name} ${width}: signature missing`);
    assert.equal(state.gold, '#d39139');
    assert.notEqual(state.mark, false, `${name} ${width}: eyebrow mark missing`);
    assert.notEqual(state.chapterNumbers, false, `${name} ${width}: chapter numbers missing`);
    assert.deepEqual(errors, [], `${name} ${width}: browser errors`);
    if ([390, 768].includes(width) || (['home', 'menu'].includes(name) && width === 1280)) {
      await page.screenshot({ path: new URL(`${stage}-${name}-${width}.png`, directory).pathname });
    }
    if (width === 390 && ['delivery', 'article', 'product'].includes(name)) {
      const selector = name === 'article' ? '.blog-toc' : name === 'product' ? '.product-options' : '.town-signature';
      await page.$eval(selector, element => element.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: new URL(`${stage}-${name}-detail.png`, directory).pathname });
    }
    if (width === 390 && ['privacy', 'terms'].includes(name)) {
      await page.click('[data-menu-open]');
      await page.waitForSelector('#site-menu-dialog[open]');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#site-menu-dialog').hasAttribute('open'));
      await page.click('.masthead-city--mobile');
      await page.waitForSelector('#city-dialog[open]');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#city-dialog').hasAttribute('open'));
      state.legalDialogs = true;
    }
    views.push({ name, path, width, ...state, errors });
    await page.close();
  }
  // These details also render without scripts and without motion.
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setJavaScriptEnabled(false);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`${base}/menu/`, { waitUntil: 'networkidle0' });
  assert(await page.$('.town-signature svg'), 'No-JS signature');
  await page.close();
  await writeFile(new URL(`${stage}-responsive.json`, directory), JSON.stringify({ base, stage, views, noJs: true, reducedMotion: true }, null, 2));
  console.log(`${stage}: ${views.length} responsive views, no overflow/browser errors; no-JS/reduced-motion PASS`);
} finally {
  await browser.disconnect();
  await Promise.resolve(chrome.kill());
}
