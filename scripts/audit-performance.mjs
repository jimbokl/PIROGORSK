import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.argv[2] || 'http://127.0.0.1:4322/';
await mkdir('qa', { recursive: true });
const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
const summaries = [];
try {
  for (const mode of ['mobile', 'desktop']) {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: ['json', 'html'],
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    }, mode === 'desktop' ? desktopConfig : undefined);
    if (!result) throw new Error(`No Lighthouse result for ${mode}`);
    const report = result.lhr;
    await writeFile(`qa/lighthouse-${mode}.json`, result.report[0]);
    await writeFile(`qa/lighthouse-${mode}.html`, result.report[1]);
    const summary = {
      mode,
      url: report.finalDisplayedUrl,
      timestamp: report.fetchTime,
      lighthouseVersion: report.lighthouseVersion,
      scores: Object.fromEntries(Object.entries(report.categories).map(([key, value]) => [key, Math.round(value.score * 100)])),
      metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index']
        .map(key => [key, { value: report.audits[key].numericValue, display: report.audits[key].displayValue }])),
      findings: Object.values(report.audits).filter(audit => audit.score !== null && audit.score < 1 && audit.details)
        .map(({ id, title, displayValue, details }) => ({ id, title, displayValue, items: details.items })),
    };
    summaries.push(summary);
    console.log(JSON.stringify({ mode, scores: summary.scores, metrics: summary.metrics }, null, 2));
  }
  await writeFile('qa/performance-summary.json', JSON.stringify(summaries, null, 2));
} finally {
  chrome.kill();
}
