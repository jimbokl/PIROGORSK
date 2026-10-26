import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { analyticsPageUrl, trafficCampaigns } from '../src/lib/analytics-pageview.ts';
import { analyticsConfig } from '../src/config/analytics.ts';
import { analyticsSessionEnabled } from '../src/lib/analytics-session.ts';

const tagged = (campaign) => {
  const url = new URL(campaign.path, 'https://pirogorsk.ru');
  for (const [key, value] of Object.entries(campaign)) if (key.startsWith('utm_')) url.searchParams.set(key, value);
  return url;
};

test('prepared placements retain their exact UTM tuple while dropping extra data', () => {
  for (const campaign of trafficCampaigns) {
    const expected = tagged(campaign).href;
    const input = tagged(campaign);
    input.searchParams.set('email', 'qa@example.invalid');
    input.searchParams.set('phone', '+70000000000');
    input.searchParams.set('utm_term', 'private text');
    input.hash = 'private-hash';
    assert.equal(analyticsPageUrl(input.href), expected);
  }
});

test('unknown, partial, duplicate and tampered campaign values cannot reach analytics', () => {
  const original = tagged(trafficCampaigns[0]);
  for (const change of [
    url => url.searchParams.delete('utm_medium'),
    url => url.searchParams.set('utm_content', 'qa@example.invalid'),
    url => url.searchParams.append('utm_source', 'telegram'),
    url => url.searchParams.set('utm_campaign', 'not_configured'),
  ]) {
    const input = new URL(original);
    change(input);
    assert.equal(analyticsPageUrl(input.href), 'https://pirogorsk.ru/menu/');
  }
  assert.equal(analyticsPageUrl('https://pirogorsk.ru/?email=qa%40example.invalid#private'), 'https://pirogorsk.ru/');
  assert.equal(analyticsPageUrl('not a URL'), '');
  assert.equal(analyticsPageUrl('javascript:alert(1)'), '');
});

const source = ts.transpileModule(readFileSync(new URL('../src/scripts/analytics.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test('real analytics initializer queues one explicit pageview and no goal', () => {
  const calls = [];
  const scripts = [];
  const input = tagged(trafficCampaigns[0]);
  input.searchParams.set('email', 'qa@example.invalid');
  const context = {
    exports: {}, URL,
    require(name) {
      if (name === '../config/analytics') return { analyticsConfig };
      if (name === '../lib/analytics-pageview') return { analyticsPageUrl };
      if (name === '../lib/analytics-session') return { analyticsSessionEnabled };
      throw new Error(`Unexpected import: ${name}`);
    },
    window: { ym: (...args) => calls.push(args) },
    location: { href: input.href },
    document: {
      referrer: 'https://t.me/example?private=value#private',
      querySelector: () => scripts[0] ?? null,
      createElement: () => ({ dataset: {} }),
      head: { append: script => scripts.push(script) },
    },
  };
  runInNewContext(source, context);
  runInNewContext(source, { ...context, exports: {} });
  assert.deepEqual(calls.map(call => call[1]), ['init', 'hit']);
  assert.equal(calls[0][2].defer, true);
  assert.equal(calls[0][2].webvisor, false);
  assert.equal(calls[1][2], tagged(trafficCampaigns[0]).href);
  assert.equal(calls[1][3].referer, 'https://t.me/example');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://mc.yandex.ru/metrika/tag.js');
});

test('local previews and QA tabs never load Metrica or send goals', () => {
  for (const href of ['http://127.0.0.1:4322/', 'http://localhost:4322/blog/', 'https://preview.example/blog/', 'https://pirogorsk.ru/?qa=1']) {
    const calls = [];
    const context = {
      exports: {}, URL, location: { href },
      require(name) {
        if (name === '../config/analytics') return { analyticsConfig };
        if (name === '../lib/analytics-pageview') return { analyticsPageUrl };
        if (name === '../lib/analytics-session') return { analyticsSessionEnabled };
        throw new Error(`Unexpected import: ${name}`);
      },
      window: { ym: (...args) => calls.push(args) },
      document: { querySelector() { throw new Error('Tracking must not initialize'); } },
    };
    runInNewContext(source, context);
    context.exports.trackGoal('order_form_open', { city: 'Зеленоградск' });
    context.exports.trackGoal('order_submit', { requestId: '10000000-0000-4000-8000-000000000001' });
    assert.deepEqual(calls, []);
  }
});

test('QA exclusion follows navigation in the same tab; other sessions still count', () => {
  const entries = new Map();
  const store = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  assert.equal(analyticsSessionEnabled('https://pirogorsk.ru/blog/', store), true);
  assert.equal(analyticsSessionEnabled('https://pirogorsk.ru/blog/?qa=1', store), false);
  assert.equal(analyticsSessionEnabled('https://pirogorsk.ru/podbor/', store), false);
  assert.equal(analyticsSessionEnabled('https://pirogorsk.ru/podbor/'), true);
  assert.equal(analyticsSessionEnabled('https://www.pirogorsk.ru/'), true);
  assert.equal(analyticsSessionEnabled('https://pirogorsk.ru.evil.example/'), false);
  assert.equal(analyticsSessionEnabled('invalid'), false);
  const blockedStore = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(analyticsSessionEnabled('https://pirogorsk.ru/?qa=1', blockedStore), false);
  assert.equal(analyticsSessionEnabled('https://pirogorsk.ru/', blockedStore), true);
});
