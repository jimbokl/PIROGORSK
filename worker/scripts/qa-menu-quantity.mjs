import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { catalog } from '../../src/data/catalog.ts';
import { selectionPrice } from '../../src/lib/selection-offers.ts';

export async function verifyMenuQuantity(page, origin, width, output) {
  await mkdir(output, { recursive: true });
  await page.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.removeItem('pirogorsk-selection'));
  const selection = () => page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'));
  const click = async selector => {
    await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.click(selector);
  };
  const setQuantity = async (card, value) => page.$eval(`${card} [data-feed-quantity]`, (input, value) => {
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  const expected = [];
  // All three renderers share quantity, and the format is selected separately.
  for (const card of ['#pirogi39 [data-supplier-id]:first-child', '#holland [data-supplier-id]:first-child', '[data-feed-id=meat]']) {
    const id = await page.$eval(card, el => el.dataset.supplierId || el.dataset.feedId);
    assert.equal(await page.$eval(`${card} [data-feed-decrease]`, el => el.disabled), true);
    await click(`${card} [data-feed-increase]`);
    await click(`${card} [data-feed-increase]`);
    await click(`${card} [data-feed-decrease]`);
    assert.equal(await page.$eval(`${card} [data-feed-quantity]`, el => el.value), '2');
    // Keyboard increase and a format change keep the chosen quantity.
    await page.focus(`${card} [data-feed-increase]`);
    await page.keyboard.press('Enter');
    await click(`${card} label:last-of-type`);
    const value = await page.$eval(`${card} input:checked`, el => Number(el.value));
    const product = catalog.find(product => product.id === id);
    const price = product.variants.find(variant => variant.value === value).price;
    assert.equal(await page.$eval(`${card} [data-feed-quantity]`, el => el.value), '3');
    assert.equal(await page.$eval(`${card} [data-feed-price-label], ${card} [data-supplier-price]`, el => Number(el.textContent.replace(/\D/g, ''))), price * 3);
    const url = new URL(await page.$eval(`${card} [data-supplier-link], ${card} [data-feed-add]`, el => el.href));
    assert.equal(url.searchParams.get('quantity'), '3');
    assert.equal(url.searchParams.get('variant'), String(value));
    await click(`${card} [data-supplier-link], ${card} [data-feed-add]`);
    expected.push({ id, value, quantity: 3 });
    assert.equal(new URL(page.url()).pathname, '/menu/');
    assert.deepEqual(await selection(), expected);
    assert.match(await page.$eval('[data-feed-message]', el => el.textContent), /3 шт/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `quantity overflow at ${width}`);
    assert.equal(await page.$$eval(`${card} [data-feed-quantity-control] button`, controls => controls.every(el => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })), true);
    if (id === 'meat') {
      await page.$eval(card, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: `${output}/quantity-${width}.jpg`, type: 'jpeg', quality: 85 });
    }
  }
  // Repeated add merges the selected batch, not just one item.
  await click('[data-feed-id=meat] [data-feed-add]');
  expected.at(-1).quantity = 6;
  assert.deepEqual(await selection(), expected);
  await page.goto(`${origin}/?interest=selection&qa=1`, { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('#selection-dialog', el => el.open), true);
  assert.equal(await page.$eval('[data-total]', el => Number(el.textContent.replace(/\D/g, ''))), selectionPrice(expected, catalog));
  assert.deepEqual(await selection(), expected);
  await page.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
  // Numeric input and bounds use the existing selection contract (1..99).
  const card = '[data-feed-id=meat]';
  await click(`${card} label:last-of-type`);
  for (const [input, expected] of [['0', '1'], ['-4', '1'], ['', '1'], ['2.8', '2'], ['100', '99']]) {
    await setQuantity(card, input);
    assert.equal(await page.$eval(`${card} [data-feed-quantity]`, el => el.value), expected);
  }
  assert.equal(await page.$eval(`${card} [data-feed-increase]`, el => el.disabled), true);
  await click(`${card} [data-feed-add]`);
  assert.match(await page.$eval('[data-feed-message]', el => el.textContent), /Подборка заполнена/);
  assert.deepEqual(await selection(), expected, 'rejected overflow must preserve the selection');
  // Storage denial follows the exact quantity URL; reload never doubles it.
  await click(`${card} label:first-of-type`);
  await setQuantity(card, '4');
  await page.evaluate(() => {
    localStorage.removeItem('pirogorsk-selection');
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'pirogorsk-selection') throw new DOMException('QA storage denied', 'QuotaExceededError');
      return write.call(this, key, value);
    };
  });
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), click(`${card} [data-feed-add]`)]);
  assert.equal(new URL(page.url()).searchParams.get('quantity'), '4');
  const transferred = [{ id: 'meat', value: 500, quantity: 4 }];
  assert.deepEqual(await selection(), transferred);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.deepEqual(await selection(), transferred, 'quantity URL reload is idempotent');
  console.log(`PASS: menu quantity, keyboard, formats, exact totals, merge, bounds, fallback and reload at ${width}px`);
}
