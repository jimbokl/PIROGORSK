import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { catalog } from '../../src/data/catalog.ts';
import { catalogProductHref } from '../../src/lib/product-paths.ts';

const base = 'https://pirogorsk.ru';
const sha = process.argv[2];
assert.match(sha || '', /^[a-f0-9]{40}$/);
const run = JSON.parse(execFileSync('gh', ['run', 'list', '--workflow', 'pages.yml', '--commit', sha, '--limit', '1', '--json', 'databaseId,headSha,conclusion,status,url'], { encoding: 'utf8' }))[0];
assert.equal(run?.headSha, sha);
assert.equal(run?.conclusion, 'success');
const runtimeFiles = execFileSync('git', ['diff', 'b5ece2e', sha, '--name-only', '--', 'src', 'public'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
assert.deepEqual(runtimeFiles, [], 'this QA-only release preserves website runtime and assets');
const report = { checked: new Date().toISOString(), deployment: run, runtimeFiles, pages: [] };
const get = async path => {
  const response = await fetch(base + path, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, path);
  return Buffer.from(await response.arrayBuffer());
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.deepEqual(JSON.parse((await get('/release.json')).toString()), JSON.parse(await readFile('site/release.json', 'utf8')));
for (const path of ['/', '/menu/', catalogProductHref(catalog.find(p => p.id === 'meat')), '/blog/', '/journal/napitki-kaliningradskoy-oblasti/', '/journal/gde-poest-s-detmi-v-zelenogradske/']) {
  const actual = await get(path);
  const expected = await readFile(`site${path}index.html`);
  assert.equal(hash(actual), hash(expected), `${path} published HTML`);
  assert(actual.toString().includes(`rel="canonical" href="${base + path}"`), `${path} canonical`);
  report.pages.push({ path, status: 200, sha256: hash(actual), bytes: actual.length });
}
const blog = (await get('/blog/')).toString();
report.articles = new Set([...blog.matchAll(/href="(\/journal\/[^"?#]+\/)"/g)].map(m => m[1])).size;
assert.equal(report.articles, 80);
report.sitemap = [...(await get('/sitemap.xml')).toString().matchAll(/<loc>/g)].length;
assert.equal(report.sitemap, 275);
assert.equal(catalog.length, 154);
report.catalog = catalog.length;
await writeFile(new URL('./production-readback.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log('Production PASS: CI success, 6 HTML SHA256/canonical, catalog 154, articles 80, sitemap 275, release manifest.');
