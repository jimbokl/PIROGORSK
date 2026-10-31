import * as interestContext from '../src/data/interest-context.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { analyticsPageUrl, trafficCampaigns } from '../src/lib/analytics-pageview.ts';
import { analyticsConfig } from '../src/config/analytics.ts';
import { analyticsSessionEnabled } from '../src/lib/analytics-session.ts';
import { guideTransition } from '../src/lib/seo-navigation.ts';

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

test('content micro-goals keep the saved-request gate and only measure marked editorial links', () => {
  const calls = [], listeners = {}, storage = new Map();
  class TestElement { constructor(marked = false, href = 'https://pirogorsk.ru/podbor/?email=private#table') { this.marked = marked; this.href = href; } closest(selector) { assert.equal(selector, 'a[data-guide-catalog]'); return this.marked ? this : null; } }
  const context = {
    exports: {}, URL, Element: TestElement,
    require(name) {
      if (name === './occasion') return { occasionMemory: { current: () => undefined } };
      if (name === '../data/interest-context') return interestContext;
      if (name === '../config/analytics') return { analyticsConfig };
      if (name === '../lib/analytics-pageview') return { analyticsPageUrl };
      if (name === '../lib/analytics-session') return { analyticsSessionEnabled };
      if (name === '../lib/seo-navigation') return { guideTransition };
      throw new Error(`Unexpected import: ${name}`);
    },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    window: { ym: (...args) => calls.push(args) }, location: { href: 'https://pirogorsk.ru/blog/' },
    document: { addEventListener: (name, callback) => listeners[name] = callback, querySelector: () => true },
  };
  runInNewContext(source, context);
  const { trackGoal } = context.exports;
  listeners.click({ target: new TestElement(false) });
  listeners.click({ target: {} });
  assert.equal(calls.length, 0);
  listeners.click({ target: new TestElement(true) });
  listeners.click({ target: new TestElement(true, 'https://evil.example/podbor/') });
  listeners.click({ target: new TestElement(true, 'https://pirogorsk.ru/not-a-published-page/') });
  trackGoal('guide_to_catalog_click', { source_page: '/blog/', destination_page: '/unknown/' });
  trackGoal('calculator_interact', { city: 'Калининград', private: 'must never leave' });
  trackGoal('calc_apply_set', { city: 'Светлогорск' });
  trackGoal('order_submit');
  trackGoal('order_submit', { requestId: 'invalid' });
  const requestId = 'efebca9b-8748-46ca-80a7-a06b41cfb931';
  trackGoal('order_submit', { requestId });
  trackGoal('order_submit', { requestId });
  assert.deepEqual(calls.map(c => c[2]), ['guide_to_catalog_click', 'calculator_interact', 'calc_apply_set', 'order_submit']);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][3])), { source_page: '/blog/', destination_page: '/podbor/' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1][3])), { city: 'Калининград' });
  assert.equal(calls[3][3].requestId, requestId);
});

test('real analytics initializer queues one explicit pageview and no goal', () => {
  const calls = [];
  const scripts = [];
  const input = tagged(trafficCampaigns[0]);
  input.searchParams.set('email', 'qa@example.invalid');
  const context = {
    exports: {}, URL,
    require(name) {
      if (name === './occasion') return { occasionMemory: { current: () => undefined } };
      if (name === '../data/interest-context') return interestContext;
      if (name === '../config/analytics') return { analyticsConfig };
      if (name === '../lib/analytics-pageview') return { analyticsPageUrl };
      if (name === '../lib/analytics-session') return { analyticsSessionEnabled };
      if (name === '../lib/seo-navigation') return { guideTransition };
      throw new Error(`Unexpected import: ${name}`);
    },
    window: { ym: (...args) => calls.push(args) },
    location: { href: input.href },
    document: {
      addEventListener() {},
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
      if (name === './occasion') return { occasionMemory: { current: () => undefined } };
      if (name === '../data/interest-context') return interestContext;
        if (name === '../config/analytics') return { analyticsConfig };
        if (name === '../lib/analytics-pageview') return { analyticsPageUrl };
        if (name === '../lib/analytics-session') return { analyticsSessionEnabled };
        if (name === '../lib/seo-navigation') return { guideTransition };
        throw new Error(`Unexpected import: ${name}`);
      },
      window: { ym: (...args) => calls.push(args) },
      document: { addEventListener() {}, querySelector() { throw new Error('Tracking must not initialize'); } },
    };
    runInNewContext(source, context);
    context.exports.trackGoal('product_view', { productid: 'fish' });
    context.exports.trackGoal('catalog_remove', { productid: 'fish', qty: 1 });
    context.exports.trackGoal('city_select', { city: 'Калининград' });
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


test('selection/filter goals send only closed parameters and never raw search text', () => {
  const calls = [];
  const context = {
    exports: {}, URL, location: { href: 'https://pirogorsk.ru/menu/?q=private' },
    require(name) {
      if (name === './occasion') return { occasionMemory: { current: () => undefined } };
      if (name === '../data/interest-context') return interestContext;
      if (name === '../config/analytics') return { analyticsConfig };
      if (name === '../lib/analytics-pageview') return { analyticsPageUrl };
      if (name === '../lib/analytics-session') return { analyticsSessionEnabled };
      if (name === '../lib/seo-navigation') return { guideTransition };
      throw new Error(`Unexpected import: ${name}`);
    },
    sessionStorage: { getItem() {}, setItem() {} },
    window: { ym: (...args) => calls.push(args) },
    document: { addEventListener() {}, querySelector: () => true },
  };
  runInNewContext(source, context);
  const track = context.exports.trackGoal;
  track('catalog_filter_apply', { surface: 'menu', filling: 'fish', search_used: true, results: 5, q: 'private', email: 'private' });
  track('selection_open', { surface: 'product', city: 'Калининград' });
  track('catalog_add', { source: 'addon', surface: 'home', productid: 'cranberry', qty: 1 });
  track('catalog_add', { source: 'favorite', surface: 'other', city: 'Калининград', productid: 'fish', qty: 2 });
  track('catalog_add', { source: 'share', surface: 'home', city: 'Светлогорск', productid: 'apple', qty: 1, link: 'private' });
  track('product_view', { surface: 'product', productid: 'p39-256', variant: '850', phone: 'private' });
  track('catalog_remove', { source: 'selection', surface: 'menu', productid: 'fish', variant: '1000', qty: 2, value: 2980, text: 'private' });
  track('city_select', { city: 'Калининград', surface: 'home', address: 'private' });
  track('prepay_click', { value: 100 }); // No such action is offered yet.
  track('catalog_filter_apply', { source: 'private', surface: 'private', filling: 'private', search_used: 'private', results: 154, query: 'private' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.map(call => call[3]))), [
    { surface: 'menu', filling: 'fish', search_used: true, results: 5 },
    { surface: 'product', city: 'Калининград' },
    { source: 'addon', surface: 'home', productid: 'cranberry', qty: 1 },
    { source: 'favorite', surface: 'other', city: 'Калининград', productid: 'fish', qty: 2 },
    { source: 'share', surface: 'home', city: 'Светлогорск', productid: 'apple', qty: 1 },
    { surface: 'product', productid: 'p39-256', variant: '850' },
    { source: 'selection', surface: 'menu', productid: 'fish', variant: '1000', qty: 2, value: 2980 },
    { city: 'Калининград', surface: 'home' },
    {},
  ]);
  assert.ok(!JSON.stringify(calls).includes('private'));
});

test('scenario context reaches composition goals and confirmed saves without leaking entry text', () => {
  const calls = [];
  const context = {
    exports: {}, URL, location: { href: 'https://pirogorsk.ru/menu/?private=secret' },
    require(name) {
      if (name === './occasion') return { occasionMemory: { current: () => ({ value: 'picnic', source: 'entry' }) } };
      if (name === '../data/interest-context') return interestContext;
      if (name === '../config/analytics') return { analyticsConfig };
      if (name === '../lib/analytics-pageview') return { analyticsPageUrl };
      if (name === '../lib/analytics-session') return { analyticsSessionEnabled };
      if (name === '../lib/seo-navigation') return { guideTransition };
      throw new Error(`Unexpected import: ${name}`);
    },
    sessionStorage: { getItem() {}, setItem() {} },
    window: { ym: (...args) => calls.push(args) },
    document: { addEventListener() {}, querySelector: () => true },
  };
  runInNewContext(source, context);
  const track = context.exports.trackGoal;
  track('catalog_add', { productid: 'meat', qty: 1, entry: 'private' });
  track('catalog_remove', { productid: 'meat', qty: 1 });
  track('order_submit', { occasion: 'gift' });
  track('order_submit', { occasion: 'gift', requestId: '10000000-0000-4000-8000-000000000001' });
  track('order_submit', { occasion: 'gift', requestId: '10000000-0000-4000-8000-000000000001' });
  assert.deepEqual(calls.map(call => call[2]), ['catalog_add', 'catalog_remove', 'order_submit']);
  assert.deepEqual(calls.map(call => call[3].occasion), ['picnic', 'picnic', 'gift']);
  assert.ok(!JSON.stringify(calls).includes('private'));
});
