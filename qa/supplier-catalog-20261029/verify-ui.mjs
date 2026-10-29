import assert from 'node:assert/strict';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';
const [origin = 'http://127.0.0.1:4323', label = 'local'] = process.argv.slice(2);
const directory = new URL('./', import.meta.url);
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const errors = [], samples = [];
try {
  for (const width of [320, 390, 1280]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${origin}/?qa=1`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$$eval('[data-product]', nodes => nodes.length), 92);
    assert.equal(await page.$$eval('[data-supplier-id]', nodes => nodes.length), 78);
    assert.equal(await page.$$eval('[data-supplier-id]:not([hidden])', nodes => nodes.length), 24);
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: new URL(`${label}-hero-${width}.png`, directory).pathname });
    await page.$eval('#holland', el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.screenshot({ path: new URL(`${label}-catalog-${width}.png`, directory).pathname });
    await page.click('[data-supplier-filter=dough]');
    assert.equal(await page.$$eval('[data-supplier-id]:not([hidden])', nodes => nodes.length), 6);
    await page.click('[data-open=city-dialog]');
    await page.click('#city-dialog [data-select-city="Калининград"]');
    await page.click('[data-supplier-filter=mini-pies]');
    await page.click('[data-product=hb-osetinskiy-pirog-s-govyadinoy] [data-add]');
    await page.click('[data-open=selection-dialog]');
    const total = await page.$eval('[data-selection-grand-total]', el => el.textContent);
    assert.match(total, /1\s*900/);
    await page.click('[data-order]');
    await page.select('#interest-delivery', 'delivery');
    assert.match(await page.$eval('[data-interest-grand-total]', el => el.textContent), /1\s*900/);
    const formLayout = await page.$eval('#interest-dialog', el => ({ client: el.clientWidth, scroll: el.scrollWidth,
      wide: [...el.querySelectorAll('*')].filter(node => node.getBoundingClientRect().right > el.getBoundingClientRect().right).map(node => ({ tag: node.tagName, class: node.className, width: node.getBoundingClientRect().width, text: node.textContent?.slice(0, 70) })) }));
    if (formLayout.scroll > formLayout.client) {
      await page.screenshot({ path: new URL(`${label}-form-overflow-${width}.png`, directory).pathname });
      console.error({ width, formLayout });
    }
    assert.equal(formLayout.scroll <= formLayout.client, true, `form at ${width}px`);
    samples.push({ width, products: 92, supplier: 78, beef1050gWithKaliningradDelivery: total, overflow: false });
    await page.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
    assert.equal(await page.$$eval('[data-supplier-id]', nodes => nodes.length), 78);
    await page.$eval('#holland', el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.screenshot({ path: new URL(`${label}-menu-${width}.png`, directory).pathname });
    assert.equal(await page.evaluate(() => document.body.scrollWidth <= innerWidth), true, `menu at ${width}px`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  const result = { origin, checkedAt: new Date().toISOString(), samples, errors, note: 'QA mode; no form submission.' };
  await writeFile(new URL(`${label}-readback.json`, directory), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await chrome.kill();
}
