import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/data/catalog.ts';
import { serializeCatalog } from '../src/data/catalog-contract.ts';
import { releaseManifest, healthUrl, verifyRelease } from './verify-release.mjs';

test('catalog contract ignores display order but detects added products, variants and prices', () => {
  const source = serializeCatalog();
  assert.equal(serializeCatalog([...catalog].reverse().map(p => ({ ...p, variants: [...p.variants].reverse() }))), source);
  for (const mutate of [c => c.pop(), c => c[0].variants.pop(), c => c[0].variants[0].price++]) {
    const copy = structuredClone(catalog); mutate(copy); assert.notEqual(serializeCatalog(copy), source);
  }
  assert.equal(serializeCatalog(), source);
});
test('health URL derives its path from API config and discards query/hash', () => {
  assert.equal(healthUrl('https://worker.example/api/interest?secret=unused#x').href, 'https://worker.example/health');
  assert.equal(healthUrl('http://127.0.0.1:1234/api/interest').href, 'http://127.0.0.1:1234/health');
  for (const url of ['https://worker.example/health', 'https://worker.example/api/interest/other', 'http://worker.example/api/interest', 'https://user:password@worker.example/api/interest']) assert.throws(() => healthUrl(url));
});
const expected = releaseManifest();
const good = { ok: true, storage: 'd1', mode: 'intent', ...expected };
test('release checks Worker and published artifact together', async () => {
  const urls = [];
  const result = await verifyRelease(expected, { endpoint: 'https://worker.example/api/interest', siteUrl: 'https://pirogorsk.ru', fetchImpl: async url => {
    urls.push(url); return Response.json(url.pathname === '/health' ? good : expected);
  } });
  assert.deepEqual(result, good);
  assert.deepEqual(urls.map(url => url.pathname), ['/health', '/release.json']);
});
test('release rejects unavailable, outdated, malformed and incompatible services', async () => {
  for (const response of [new Response('down', { status: 503 }), Response.json({ ...good, apiVersion: 2 }), Response.json({ ...good, catalogSha256: '0'.repeat(64) }), Response.json({ ...good, storage: 'other' }), new Response('invalid json')]) {
    await assert.rejects(verifyRelease(expected, { fetchImpl: async () => response }));
  }
  await assert.rejects(verifyRelease({ ...expected, apiVersion: 2 }));
  await assert.rejects(verifyRelease(expected, { siteUrl: 'https://pirogorsk.ru', fetchImpl: async url => Response.json(url.pathname === '/health' ? good : { ...expected, catalogSha256: '0'.repeat(64) }) }));
});
test('release timeout aborts a hung fetch', async () => {
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(verifyRelease(expected, { timeoutMs: 10, fetchImpl: async (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) }), { name: 'TimeoutError' });
  } finally { clearTimeout(keepAlive); }
});
