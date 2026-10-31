import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { verifySelectionTools } from '../../worker/scripts/qa-selection-tools.mjs';

const base = process.env.QA_BASE || 'http://127.0.0.1:4322';
const stage = process.env.QA_STAGE || 'local';
const output = new URL(`./${stage}-functional/`, import.meta.url).pathname;
await mkdir(output, { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
try {
  for (const width of (process.env.QA_WIDTHS || '320,390,768,1024,1280').split(',').map(Number)) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width, height: width === 768 ? 1024 : width === 1024 ? 768 : 844 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.method() === 'GET' && (request.url().startsWith(base + '/') || request.url().startsWith('data:'))) request.continue();
      else request.abort();
    });
    await verifySelectionTools(page, base, width, output);
    if (errors.length) throw new Error(errors.join('\n'));
    await context.close();
  }
} finally {
  await browser.disconnect();
  await chrome.kill();
}
