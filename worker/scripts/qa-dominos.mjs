import assert from 'node:assert/strict';
import { catalog } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';
import { fillingFilters, productFillings } from '../../src/lib/catalog-fillings.ts';

// Called by the fully intercepted Astro/Worker fixture. No production applications.
export async function verifyDominos(page, origin, width, output) {
  const click = async selector => {
    await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click(selector);
  };
  for (const path of ['/', '/menu/']) {
    await page.goto(`${origin}${path}?qa=1`, { waitUntil: 'networkidle0' });
    const home = path === '/';
    const status = home ? '[data-home-filter-status]' : '[data-menu-status]';
    assert.match(await page.$eval(status, el => el.textContent), /153/);
    for (const [filling] of fillingFilters.slice(1)) {
      await click(`[data-catalog-fillings] [data-filling=${filling}]`);
      const expected = catalog.filter(product => productFillings(product).includes(filling)).length;
      assert.equal(await page.$eval(status, el => Number(el.textContent.match(/\d+/)[0])), expected, `${path} ${filling}`);
      assert.equal(new URL(page.url()).searchParams.get('filling'), filling);
      assert.equal(await page.$$eval(home ? '[data-home-catalog] [data-product]:not([hidden])' : '[data-menu-product]:not([hidden]), [data-supplier-id]:not([hidden])', (cards, filling) => cards.every(card => card.dataset.fillings.split(' ').includes(filling)), filling), true);
    }
    await click('[data-filling=fish]');
    await click('[data-filling=cheese]');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[data-filling=fish]').getAttribute('aria-pressed') === 'true');
    await click('[data-catalog-reset]');
    assert.match(await page.$eval(status, el => el.textContent), /153/);
    await page.$eval('[data-catalog-query]', input => { input.value = 'несуществующаяначинка'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.match(await page.$eval(status, el => el.textContent), /: 0$/);
    assert.equal(await page.$eval(home ? '[data-home-empty]' : '[data-menu-empty]', el => el.hidden), false);
    await click('[data-catalog-reset]');
    assert.match(await page.$eval(status, el => el.textContent), /153/);
    // An item originally outside the progressive batch must be searchable.
    const last = catalog.at(-1);
    await page.$eval('[data-catalog-query]', (input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, last.name);
    const selector = home ? `[data-product="${last.id}"]` : `[data-supplier-id="${last.id}"], [data-feed-id="${last.id}"]`;
    assert.equal(await page.$eval(selector, el => !el.hidden && !el.closest('[hidden]')), true, 'full catalog searched');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path} ${width} overflow`);
  }
  await page.goto(`${origin}/?qa=1`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.removeItem('pirogorsk-selection'));
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('[data-selection-dock]', el => el.hidden), true);
  await click('[data-product=meat] [data-add]');
  assert.equal(await page.$eval('[data-dock-total]', el => Number(el.textContent.replace(/\D/g, ''))), 690);
  for (const path of ['/menu/', '/delivery/', '/blog/', catalogProductHref(catalog.find(product => product.id === 'meat'))]) {
    await page.goto(`${origin}${path}?qa=1`, { waitUntil: 'networkidle0' });
    const url = page.url();
    await click('.masthead-selection');
    assert.equal(page.url(), url);
    assert.equal(await page.$eval('#selection-dialog', el => el.open), true);
    assert.equal(await page.$eval('[data-total]', el => Number(el.textContent.replace(/\D/g, ''))), 690);
    assert.equal(await page.$eval('#selection-dialog', el => el.scrollWidth <= el.clientWidth), true, 'dialog overflow');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('.masthead-selection', el => document.activeElement === el), true, 'focus returns to trigger');
  }
  await click('[data-selection-dock] a');
  await page.click('#selection-dialog .selection-city');
  await page.waitForSelector('#city-dialog[open]');
  await page.click('#city-dialog [data-select-city="Калининград"]');
  await page.waitForSelector('#selection-dialog[open]');
  assert.equal(await page.$eval('[data-selection-grand-total]', el => Number(el.textContent.replace(/\D/g, ''))), 1040, 'delivery once for selected city');
  await page.click('[data-increase]');
  assert.equal(await page.$eval('[data-total]', el => Number(el.textContent.replace(/\D/g, ''))), 1380);
  assert.equal(await page.$eval('[data-increase]', el => document.activeElement === el), true);
  await page.screenshot({ path: `${output}/selection-${width}.png` });
  await page.click('[data-remove]');
  assert.equal(await page.$eval('[data-selection-dock]', el => el.hidden), true);
  assert.equal(await page.$eval('#selection-dialog [data-go-catalog]', el => document.activeElement === el), true);
  await page.keyboard.press('Escape');
  await page.evaluate(() => localStorage.setItem('pirogorsk-selection', '{broken'));
  await page.reload({ waitUntil: 'networkidle0' });
  await click('.masthead-selection');
  assert.equal(await page.$('[data-item]'), null, 'corrupted persistence safely starts empty');
  await page.keyboard.press('Escape');
  console.log(`PASS: global 153-product filling/search/reset/history, shared dialog, dock/totals, focus/city handoff and corrupted storage at ${width}px`);
}
