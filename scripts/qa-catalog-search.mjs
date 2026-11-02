import assert from 'node:assert/strict';

/** Dynamic states that used to move the search panel or strand keyboard focus. */
export async function verifyCatalogSearch(page, go, { width, output, stage }) {
  const cases = [];
  for (const [name, path, form, input, reset, empty, result, query] of [
    ['home', '/', '[data-home-finder]', '[data-catalog-query]', '[data-catalog-reset]', '[data-home-empty]', '[data-home-group]:not([hidden])', 'морс'],
    ['menu', '/menu/', '[data-menu-finder]', '[data-catalog-query]', '[data-catalog-reset]', '[data-menu-empty]', '[data-menu-section]:not([hidden])', 'морс'],
    ['blog', '/blog/', '[data-blog-search-form]', '#blog-query', '[data-blog-search-reset]', '[data-blog-empty]', '[data-blog-entry]:not([hidden])', 'сыр'],
  ]) {
    await go(path);
    await page.evaluate(() => document.fonts.ready);
    const height = () => page.$eval(form, element => element.getBoundingClientRect().height);
    const initial = await height();
    const stable = async label => assert(Math.abs(await height() - initial) <= 1, `${name} ${width}: stable search height after ${label}`);
    const submit = async target => {
      await page.focus(input);
      await page.keyboard.press('Enter');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.$eval(input, element => element === document.activeElement), false, `${name}: releases search field`);
      const box = await page.$eval(target, element => ({ top: element.getBoundingClientRect().top, hidden: element.hidden, viewport: innerHeight }));
      assert(!box.hidden && box.top >= -1 && box.top < box.viewport, `${name}: submitted results/empty state visible`);
    };
    await page.locator(input).fill(query);
    await stable('query');
    assert.equal(new URL(page.url()).searchParams.get('q'), query);
    const targetHeight = await page.$eval(reset, element => element.getBoundingClientRect().height);
    assert(targetHeight >= 44, `${name}: reset has a 44px touch target`);
    await page.$eval(form, element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${output}/${stage}-search-${name}-${width}.png` });
    await submit(result);
    await page.locator(input).fill('zzzzнеттакоговкуса');
    await stable('empty query');
    await submit(empty);
    await page.$eval(reset, element => element.click());
    await stable('reset');
    assert.equal(await page.$eval(input, element => element === document.activeElement), true, `${name}: reset returns focus`);
    assert.equal(new URL(page.url()).searchParams.has('q'), false);
    assert.equal(await page.$eval(empty, element => element.hidden), true);
    if (name !== 'blog') {
      await page.$eval('[data-filling="cheese"]', element => element.click());
      await page.locator(input).fill('сыр');
      await stable('filling plus query');
      const filteredUrl = page.url();
      assert.equal(new URL(filteredUrl).searchParams.get('filling'), 'cheese');
      await page.$eval(reset, element => element.click());
      await page.goBack({ waitUntil: 'networkidle0' });
      assert.equal(await page.$eval(input, element => element.value), 'сыр', `${name}: history restores query`);
      assert.equal(await page.$eval('[data-filling="cheese"]', element => element.getAttribute('aria-pressed')), 'true');
      assert.equal(page.url(), filteredUrl);
      await stable('Back');
      await page.goForward({ waitUntil: 'networkidle0' });
      assert.equal(await page.$eval(input, element => element.value), '');
      await stable('Forward');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, `${name}: no horizontal overflow`);
    cases.push({ name, width, stableHeight: initial, resetTouchPx: targetHeight, resultsAndEmpty: true, keyboardReleased: true, reset: true, history: name !== 'blog' });
  }
  // Manual loading must remain usable if automatic observation is unavailable.
  const script = await page.evaluateOnNewDocument(() => { delete window.IntersectionObserver; });
  const manual = [];
  try {
    await go('/menu/');
    for (const id of ['pirogi39', 'holland']) {
      const root = `#${id}`, more = `${root} [data-supplier-more]`;
      const total = await page.$$eval(`${root} [data-supplier-id]`, cards => cards.length);
      let batches = 0;
      while (!await page.$eval(more, element => element.hidden)) {
        const count = await page.$$eval(`${root} [data-supplier-id]:not([hidden])`, cards => cards.length);
        const nextId = await page.$$eval(`${root} [data-supplier-id]`, (cards, index) => cards[index].dataset.supplierId, count);
        await page.focus(more);
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(id => document.activeElement === document.querySelector(`[data-supplier-id="${id}"] a[href]`), nextId), true, `${id}: focus reaches the first new product`);
        assert.equal(await page.$$eval(`${root} [data-supplier-id]:not([hidden])`, cards => cards.length), Math.min(total, count + 24));
        batches++;
        assert(batches < 10, 'Loading terminates');
      }
      assert.equal(await page.$$eval(`${root} [data-supplier-id]:not([hidden])`, cards => cards.length), total);
      manual.push({ id, width, total, batches, focusOnNewProduct: true });
    }
  } finally {
    await page.removeScriptToEvaluateOnNewDocument(script.identifier);
  }
  return { cases, manual };
}
