import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
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
  assert.equal(rows.length, 154);
  assert.equal(new Set(rows.map(row => row.id)).size, 154);
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
        // Keep the capture in the current viewport. Chromium's beyond-viewport
        // path temporarily hides scrollbars and re-emulates the viewport; on
        // Linux that can change the 320px layout to 305px between capture and
        // the next physical click. These are viewport evidence, not full-page
        // exports, so no viewport override is needed.
        await element.screenshot({ path: `${output}/${surface}-three-formats-${width}.png`, captureBeyondViewport: false });
        await page.screenshot({ path: `${output}/${surface}-phone-context-${width}.png` });
      }
      const add = await element.$('[data-add], [data-feed-add], [data-supplier-link]');
      await page.evaluate(() => {
        window.__catalogClickEvents = [];
        if (window.__catalogClickProbe) return;
        window.__catalogClickProbe = true;
        for (const type of ['pointerdown', 'pointerup', 'click']) document.addEventListener(type, event => {
          const card = event.target.closest?.('[data-product], [data-feed-id], [data-supplier-id]');
          const button = event.target.closest?.('button, a');
          window.__catalogClickEvents.push({ type, x: event.clientX, y: event.clientY, scrollY,
            target: event.target.tagName, text: button?.textContent.trim(),
            product: card?.dataset.product || card?.dataset.feedId || card?.dataset.supplierId,
            button: button?.getBoundingClientRect().toJSON() });
        }, true);
      });
      // Center the button and wait for stable geometry before a physical click.
      // The exact selection assertion below also catches a misdirected click.
      await add.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await add.asLocator().click();
      expected.push({ id: product.id, value: last.value, quantity: 2 });
      const actual = await selection();
      try { assert.deepEqual(actual, expected); }
      catch (error) {
        const diagnostic = { surface, width, product: product.id, actual, expected,
          browser: await browserVersion(page),
          state: await add.evaluate(el => ({ events: window.__catalogClickEvents,
            button: el.getBoundingClientRect().toJSON(), scrollY, viewport: [innerWidth, innerHeight],
            clientWidth: document.documentElement.clientWidth,
            active: document.activeElement?.outerHTML.slice(0, 500) })) };
        console.error('Catalog physical-click diagnostic:', JSON.stringify(diagnostic));
        await writeFile(`${output}/click-failure-${surface}-${width}.json`, JSON.stringify(diagnostic, null, 2));
        await page.screenshot({ path: `${output}/click-failure-${surface}-${width}.png` });
        throw error;
      }
    }
  }
  for (const product of [samples[0], mini, samples[1], samples.at(-1), catalog.find(product => product.id === 'hb-osetinskiy-pirog-s-kuritsey-i-syrom')]) {
    await page.goto(`${origin}${catalogProductHref(product)}?qa=1`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    const options = '[data-product-options]';
    const shown = await page.$$eval(`${options} [data-variant-price]`, labels => labels.map(el => Number(el.dataset.variantPrice)));
    assert.deepEqual(shown, product.variants.map(variant => variant.price));
    await click(`${options} label:last-of-type`);
    await click('[data-option-increase]');
    assert.equal(await page.$eval('[data-option-price]', el => Number(el.textContent.replace(/\D/g, ''))), product.variants.at(-1).price * 2);
    assert.equal(await page.$eval(`${options} input:checked`, el => el.value), String(product.variants.at(-1).value), 'selected format stays checked');
    if (product.supplier?.priceFrom) assert.match(await page.$eval('.product-options-price small', el => el.textContent), /^от /);
    await assertFits(page, options);
    const geometry = () => page.$eval(options, el => {
      const panel = el.getBoundingClientRect();
      const button = el.querySelector('[data-option-link]').getBoundingClientRect();
      const price = el.querySelector('[data-option-price]');
      return { height: panel.height, buttonY: button.y - panel.y, priceFits: price.scrollWidth <= price.clientWidth + 1 };
    });
    const baseline = await geometry();
    for (const quantity of [99, 1]) {
      await page.$eval('[data-option-quantity]', (el, value) => { el.value = String(value); el.dispatchEvent(new Event('input', { bubbles: true })); }, quantity);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const changed = await geometry();
      assert(Math.abs(changed.height - baseline.height) <= 1 && Math.abs(changed.buttonY - baseline.buttonY) <= 1, `${product.id} ${width}: quantity ${quantity} keeps the purchase button in place`);
      assert(changed.priceFits, `${product.id} ${width}: total stays within its column`);
      assert.equal(await page.$eval('[data-option-price]', el => Number(el.textContent.replace(/\D/g, ''))), product.variants.at(-1).price * quantity);
    }
    await page.$eval(options, el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: `${output}/product-${product.id}-${width}.png` });
  }
  console.log(`PASS: all 154 format prices in home/menu, quantity/add synchronization and 1/2/3-format product pages at ${width}px`);
}

const browserVersion = page => page.browser().version();
