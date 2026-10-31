import { axeSource } from 'lighthouse/core/lib/axe.js';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';

const base = process.env.QA_BASE || 'http://127.0.0.1:4322';
const stage = process.env.QA_STAGE || 'before';
const routes = ['/', '/menu/', '/osetinskie-pirogi/', '/delivery/', '/zelenogradsk/', '/catalog/osetinskiy-pirog-s-kuritsey-i-syrom/', '/blog/', '/journal/skolko-piroga-na-cheloveka/', '/about/', '/povody/', '/partners/', '/podbor/', '/privacy/', '/terms/', '/nabor/uzhin-v-apartamentah/'];
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
const results = [];
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', req => req.method() === 'GET' && (req.url().startsWith(base + '/') || req.url().startsWith('data:')) ? req.continue() : req.abort());
  for (const width of [390, 768]) {
    await page.setViewport({ width, height: 960 });
    for (const path of routes) {
      await page.goto(`${base}${path}?qa=1`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ content: axeSource });
      const audit = async state => {
        await page.evaluate(async () => {
          await Promise.allSettled(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation => animation.finished));
        });
        const result = await page.evaluate(async () => {
          const report = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
          return { passes: report.passes.length, violations: report.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: report.incomplete.map(v => ({ id: v.id, count: v.nodes.length })) };
        });
        results.push({ path, width, state, ...result });
      };
      await audit('page');
      if (path === '/') {
        await page.click('[data-home-catalog] [data-add]');
        await page.click('.masthead-selection');
        await audit('selection');
        await page.click('[data-order]');
        await audit('interest');
        await page.click('[data-interest-submit]');
        await audit('interest-errors');
        await page.keyboard.press('Escape');
        await page.goto(`${base}/?interest=edit-bundle&bundle=dinner&qa=1`, { waitUntil: 'networkidle0' });
        if (await page.$('#bundle-editor[open]')) {
          await page.addScriptTag({ content: axeSource });
          await audit('bundle-editor');
        }
      }
    }
  }
  await writeFile(new URL(`./${stage}-accessibility.json`, import.meta.url), JSON.stringify({ base, stage, results }, null, 2));
  console.log(JSON.stringify({ stage, states: results.length, violations: results.flatMap(r => r.violations.map(v => ({ path: r.path, width: r.width, state: r.state, ...v }))) }, null, 2));
} finally {
  await browser.disconnect();
  await chrome.kill();
}
