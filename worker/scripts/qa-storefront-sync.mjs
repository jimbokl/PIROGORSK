import assert from 'node:assert/strict';

// Reuse the caller's intercepted local origins; neither tab sends real interests.
export async function verifyStorefrontSync(page, origin, width, preparePage) {
  const other = await page.browserContext().newPage();
  await other.setViewport(page.viewport());
  try {
    await preparePage(other);
    await page.goto(`${origin}/?qa=1`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => { localStorage.removeItem('pirogorsk-selection'); localStorage.removeItem('pirogorsk-city'); });
    await page.reload({ waitUntil: 'networkidle0' });
    await other.goto(`${origin}/menu/?qa=1`, { waitUntil: 'networkidle0' });
    const card = '#pirogi39 [data-supplier-id]:first-child';
    const id = await other.$eval(card, el => el.dataset.supplierId);
    await other.click(`${card} [data-feed-increase]`);
    await other.click(`${card} [data-supplier-link]`);
    await page.bringToFront();
    await page.waitForFunction(() => document.querySelector('[data-count]').textContent === '2', { polling: 100 });
    await page.click('[data-open="selection-dialog"]');
    assert.equal(await page.$$eval('[data-item]', rows => rows.length), 1);
    await page.focus('[data-increase]');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('[data-increase]', el => document.activeElement === el), true);
    await other.waitForFunction(() => document.querySelector('[data-count]').textContent === '3', { polling: 100 });
    // An external change while the dialog is open keeps both contents and focus current.
    await other.bringToFront();
    await other.click(`${card} [data-supplier-link]`);
    await page.bringToFront();
    await page.waitForFunction(() => document.querySelector('[data-item] output').textContent === '5', { polling: 100 });
    assert.equal(await page.$eval('[data-increase]', el => document.activeElement === el), true);
    await page.keyboard.press('Escape');
    await page.click('[data-product] [data-add]');
    assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem('pirogorsk-selection')).find(item => item.id === id)?.quantity, id), 5);
    await page.click('[data-open="selection-dialog"]');
    while (await page.$('[data-remove]')) await page.click('[data-remove]');
    assert.equal(await page.$eval('[data-go-catalog]', el => document.activeElement === el), true, 'last removal retains focus inside modal');
    await page.keyboard.press('Escape');
    await other.bringToFront();
    await other.click(width <= 1000 ? '.masthead-city--mobile' : '.masthead-city--desktop');
    await other.click('#city-dialog [data-select-city="Калининград"]');
    await page.bringToFront();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-city]')].every(el => el.textContent === 'Калининград'), { polling: 100 });
    // localStorage.clear in another tab clears the open home without writing old items back.
    await other.evaluate(() => localStorage.clear());
    await page.waitForFunction(() => document.querySelector('[data-count]').hidden && document.querySelector('[data-city]').textContent === 'Зеленоградск', { polling: 100 });
    console.log(`PASS: two-tab selection/city sync, no lost items, live dialog and empty-state focus at ${width}px`);
  } finally { await other.close(); await page.bringToFront(); }
}
