import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.argv[2] || 'http://127.0.0.1:4322/';
const outputDirectory = process.env.LIGHTHOUSE_OUTPUT_DIR || 'qa';
const mobileRuns = Number(process.env.LIGHTHOUSE_MOBILE_RUNS || 3);
if (!Number.isInteger(mobileRuns) || mobileRuns < 1) throw new Error('LIGHTHOUSE_MOBILE_RUNS must be a positive integer');
await mkdir(outputDirectory, { recursive: true });
const summaries = [];
for (const mode of ['mobile', 'desktop']) {
  for (let run = 1; run <= (mode === 'mobile' ? mobileRuns : 1); run++) {
    // A new process/profile also resets connection pools between samples.
    const chrome = await launch({ chromeFlags: ['--headless=new', '--disable-extensions'] });
    try {
      const result = await lighthouse(url, {
        port: chrome.port,
        output: ['json', 'html'],
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      }, mode === 'desktop' ? desktopConfig : undefined);
      if (!result) throw new Error(`No Lighthouse result for ${mode}`);
      const report = result.lhr;
      const stem = `${outputDirectory}/lighthouse-${mode}-${run}`;
      await writeFile(`${stem}.json`, result.report[0]);
      await writeFile(`${stem}.html`, result.report[1]);
      // Retain the existing paths for the final sample, with every sample saved above.
      await writeFile(`${outputDirectory}/lighthouse-${mode}.json`, result.report[0]);
      await writeFile(`${outputDirectory}/lighthouse-${mode}.html`, result.report[1]);
      const measured = report.audits.metrics.details.items[0];
      const summary = {
        mode,
        run,
        url: report.finalDisplayedUrl,
        timestamp: report.fetchTime,
        lighthouseVersion: report.lighthouseVersion,
        browser: report.environment.hostUserAgent,
        throttlingMethod: report.configSettings.throttlingMethod,
        observed: {
          fcp: measured.observedFirstContentfulPaint,
          lcp: measured.observedLargestContentfulPaint,
        },
        // Insights describe the observed trace, while headline metrics may be simulated.
        lcpBreakdown: Object.fromEntries((report.audits['lcp-breakdown-insight']?.details?.items
          ?.find(item => item.type === 'table')?.items || []).map(item => [item.subpart, item.duration])),
        scores: Object.fromEntries(Object.entries(report.categories).map(([key, value]) => [key, Math.round(value.score * 100)])),
        metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index']
          .map(key => [key, { value: report.audits[key].numericValue, display: report.audits[key].displayValue }])),
        findings: Object.values(report.audits).filter(audit => audit.score !== null && audit.score < 1 && audit.details)
          .map(({ id, title, displayValue, details }) => ({ id, title, displayValue, items: details.items })),
      };
      summaries.push(summary);
      console.log(JSON.stringify({ mode, run, scores: summary.scores, metrics: summary.metrics, observed: summary.observed, lcpBreakdown: summary.lcpBreakdown }, null, 2));
      await writeFile(`${outputDirectory}/performance-summary.json`, JSON.stringify(summaries, null, 2));
    } finally {
      await chrome.kill();
    }
  }
}
const range = values => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return { min: sorted[0], median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, max: sorted.at(-1) };
};
const aggregate = ['mobile', 'desktop'].map(mode => {
  const samples = summaries.filter(sample => sample.mode === mode);
  return { mode, samples: samples.length,
    simulatedLcp: range(samples.map(sample => sample.metrics['largest-contentful-paint'].value)),
    observedLcp: range(samples.map(sample => sample.observed.lcp)),
    observedRenderDelay: range(samples.map(sample => sample.lcpBreakdown.elementRenderDelay)),
  };
});
await writeFile(`${outputDirectory}/performance-ranges.json`, JSON.stringify(aggregate, null, 2));
console.log(JSON.stringify({ ranges: aggregate }, null, 2));
