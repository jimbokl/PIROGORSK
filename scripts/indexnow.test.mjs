import test from 'node:test';
import assert from 'node:assert/strict';
import { changedUrls, submitChanges, submitToEndpoints, validateManifest } from './indexnow.mjs';

const host = 'pirogorsk.ru';
const hash = 'a'.repeat(64);
const manifest = pages => ({ version: 1, host, pages });
const current = manifest({ 'https://pirogorsk.ru/': hash, 'https://pirogorsk.ru/menu/': hash });
test('initial submission, unchanged release, updates and removals', () => {
  assert.equal(changedUrls(current).length, 2);
  assert.deepEqual(changedUrls(current, structuredClone(current)), []);
  assert.deepEqual(changedUrls(current, manifest({ 'https://pirogorsk.ru/': 'b'.repeat(64), 'https://pirogorsk.ru/old/': hash })), ['https://pirogorsk.ru/', 'https://pirogorsk.ru/menu/', 'https://pirogorsk.ru/old/']);
});
test('reject cross-host URLs and invalid hashes from cached state', () => {
  assert.throws(() => validateManifest(manifest({ 'https://elsewhere.ru/': hash }), host));
  assert.throws(() => validateManifest(manifest({ 'https://pirogorsk.ru/': 'bad' }), host));
});
test('unchanged content sends no HTTP request', async () => {
  assert.equal((await submitChanges({ current, previous: current, fetcher: () => { throw new Error('unneeded request'); } })).count, 0);
});
test('verify live release, then make one batch to one endpoint', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push([url, options]);
    if (url.endsWith('.txt')) return new Response('public-key');
    if (url.endsWith('.json')) return Response.json(current);
    return new Response('', { status: 202 });
  };
  const result = await submitChanges({ current, key: 'public-key', endpoint: 'https://api.indexnow.org/indexnow', fetcher });
  assert.equal(result.status, 'received-key-validation-pending');
  assert.equal(calls.filter(([, options]) => options.method === 'POST').length, 1);
  assert.equal(JSON.parse(calls[2][1].body).urlList.length, 2);
});
test('wrong live release, missing key and 429 fail without success', async () => {
  for (const mode of ['stale', 'key', '429']) {
    const fetcher = async url => url.endsWith('.txt') ? new Response(mode === 'key' ? 'wrong' : 'public-key') : url.endsWith('.json') ? Response.json(mode === 'stale' ? manifest({}) : current) : new Response('', { status: 429 });
    await assert.rejects(submitChanges({ current, key: 'public-key', endpoint: 'https://api.indexnow.org/indexnow', fetcher }));
  }
});
test('wait for Pages propagation with GET retries, then submit only once', async () => {
  let keyReads = 0;
  let posts = 0;
  const fetcher = async url => {
    if (url.endsWith('.txt')) return new Response(++keyReads === 1 ? 'old' : 'public-key');
    if (url.endsWith('.json')) return Response.json(current);
    posts++;
    return new Response('', { status: 200 });
  };
  const result = await submitChanges({ current, key: 'public-key', endpoint: 'https://api.indexnow.org/indexnow', fetcher, readinessAttempts: 2, wait: async () => {} });
  assert.equal(result.httpStatus, 200);
  assert.equal(keyReads, 2);
  assert.equal(posts, 1);
});
test('both IndexNow receivers must acknowledge the same published batch',async()=>{
 const endpoints=['https://api.indexnow.org/indexnow','https://yandex.com/indexnow'];
 const posts=[];
 const fetcher=async(url,options)=>{
  if(url.endsWith('.txt'))return new Response('public-key');
  if(url.endsWith('.json'))return Response.json(current);
  posts.push([url,JSON.parse(options.body).urlList]);return new Response('',{status:200});
 };
 const r=await submitToEndpoints({current,key:'public-key',endpoints,fetcher});
 assert.equal(r.status,'received-by-all');assert.deepEqual(posts.map(p=>p[0]),endpoints);assert.deepEqual(posts[0][1],posts[1][1]);
 const failed=async(url,options)=>url===endpoints[1]?new Response('',{status:429}):fetcher(url,options);
 await assert.rejects(submitToEndpoints({current,key:'public-key',endpoints,fetcher:failed}),error=>error.receivers[0].httpStatus===200&&error.receivers[1].status==='failed');
 const unchanged=await submitToEndpoints({current,previous:current,endpoints,fetcher:()=>{throw Error('No requests for unchanged release');}});
 assert.equal(unchanged.status,'unchanged');
});
