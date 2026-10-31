import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { catalog } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';

const amount = text => Number(text.replace(/\D/g, ''));
const mini = catalog.find(product => product.category === 'mini-pies' && product.variants.length === 3);
const samples = ['meat', 'p39-10', 'p39-482', mini.id, 'cranberry', 'tableware', catalog.find(product => product.supplier?.priceFrom).id].map(id => catalog.find(product => product.id === id));

async function compareFormats(page, selector) {
  const rows = await page.$$eval(selector, cards => cards.map(card => ({
    id: card.dataset.product || card.dataset.supplierId || card.dataset.feedId,
    variants: Array.from(card.querySelectorAll('fieldset label')).map(label => ({
      value: Number(label.querySelector('input').value),
      price: Number(label.querySelector('[data-variant-price]').dataset.variantPrice),
      text: label.querySelector('small').textContent,
    })),
  })));
  assert.equal(rows.length, 153);
  assert.equal(new Set(rows.map(row => row.id)).size, 153);
  for (const row of rows) {
    const product = catalog.find(product => product.id === row.id);
    assert.deepEqual(row.variants.map(({ value, price }) => ({ value, price })), product.variants.map(({ value, price }) => ({ value, price })));
    for (const variant of row.variants) assert.equal(amount(variant.text), variant.price, `${row.id}: price rendered in HTML`);
  }
}

async function assertFits(page, selector) {
  const element = await page.$(selector);
  const problems = await element.$$eval('.variant-summary', labels => labels.flatMap(label => {
    const box = label.getBoundingClientRect();
    if (!box.width) return [];
    const outside = [label, ...label.children].some(el => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > innerWidth + 1);
    return outside || box.height < 44 ? [label.textContent] : [];
  }));
  assert.deepEqual(problems, [], 'format labels fit and retain a 44px touch target');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}

export async function verifyCatalogFormats(page, origin, width, output) {
  await mkdir(output, { recursive: true });
  const click = async selector => { await page.$eval(selector, el => el.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.click(selector); };
  const selection = () => page.evaluate(() => JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'));
  for (const surface of ['home', 'menu']) {
    await page.goto(`${origin}/${surface === 'menu' ? 'menu/' : ''}?qa=1#nabory`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => { localStorage.removeItem('pirogorsk-selection'); });
    await page.reload({ waitUntil: 'networkidle0' });
    const cards = surface === 'home' ? '[data-home-catalog] [data-product]' : '.menu-feed [data-feed-id], .menu-feed [data-supplier-id]';
    await compareFormats(page, cards);
    const expected = [];
    for (const product of samples) {
      if (surface === 'menu' && product.supplier) {
        const section = product.id.startsWith('p39-') ? '#pirogi39' : '#holland';
        await click(`${section} [data-supplier-filter="${product.category}"]`);
      }
      const card = surface === 'home' ? `[data-home-catalog] [data-product="${product.id}"]` : `.menu-feed [data-feed-id="${product.id}"], .menu-feed [data-supplier-id="${product.id}"]`;
      // The #nabory anchor reveals the full SSR feed through the real navigation.
      const last = product.variants.at(-1);
      const element = await page.$(card);
      const label = await element.$('fieldset label:last-of-type');
      await label.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await label.click();
      await (await element.$('[data-feed-increase]')).click();
      assert.equal(await element.$eval('[data-price], [data-feed-price-label], [data-supplier-price]', el => Number(el.textContent.replace(/\D/g, ''))), last.price * 2);
      assert.match(await element.$eval('[data-feed-price-note]', el => el.textContent), /шт/);
      await assertFits(page, card);
      if (product.supplier?.priceFrom) {
        assert.match(await element.$eval('.variant-summary small', el => el.textContent), /^от /);
        assert.match(await element.$eval('[data-feed-price-note]', el => el.textContent), /^от /);
        if (surface === 'home') assert.match(await element.$eval('[data-price]', el => el.textContent), /^от /);
      }
      if (product.id === mini.id) {
        await element.screenshot({ path: `${output}/${surface}-three-formats-${width}.png` });
        await page.screenshot({ path: `${output}/${surface}-phone-context-${width}.png` });
      }
      await (await element.$('[data-add], [data-feed-add], [data-supplier-link]')).click();
      expected.push({ id: product.id, value: last.value, quantity: 2 });
      assert.deepEqual(await selection(), expected);
    }
  }
  for (const product of [samples[0], mini, samples[1], samples.at(-1)]) {
    await page.goto(`${origin}${catalogProductHref(product)}?qa=1`, { waitUntil: 'networkidle0' });
    const options = '[data-product-options]';
    const shown = await page.$$eval(`${options} [data-variant-price]`, labels => labels.map(el => Number(el.dataset.variantPrice)));
    assert.deepEqual(shown, product.variants.map(variant => variant.price));
    await click(`${options} label:last-of-type`);
    await click('[data-option-increase]');
    assert.equal(await page.$eval('[data-option-price]', el => Number(el.textContent.replace(/\D/g, ''))), product.variants.at(-1).price * 2);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-product-options] input:checked + .variant-summary')).color === 'rgb(255, 255, 255)');
    if (product.supplier?.priceFrom) assert.match(await page.$eval('.product-options-price small', el => el.textContent), /^от /);
    await assertFits(page, options);
    await (await page.$(options)).screenshot({ path: `${output}/product-${product.id}-${width}.png` });
  }
  console.log(`PASS: all 153 format prices in home/menu, quantity/add synchronization and 1/2/3-format product pages at ${width}px`);
}
