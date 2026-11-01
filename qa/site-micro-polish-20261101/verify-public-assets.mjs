import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const origin = 'https://pirogorsk.ru';
const paths = ['/', '/menu/', '/delivery/', '/zelenogradsk/', '/blog/', '/journal/dostavka-edy-v-zelenogradske/', '/nabor/piknik-u-morya/'];
const assets = new Map();
for (const path of paths) {
  const local = await readFile(`site${path}index.html`, 'utf8');
  const response = await fetch(origin + path + '?qa=1', { cache: 'no-store' });
  assert(response.ok, `Page HTTP ${response.status}: ${path}`);
  const remote = await response.text();
  for (const match of local.matchAll(/(?:href|src)="(\/_astro\/[^"?]+\.(?:css|js))"/g)) {
    assert(remote.includes(match[1]), `Published page references accepted asset: ${path} ${match[1]}`);
    assets.set(match[1], null);
  }
}
const sha = data => createHash('sha256').update(data).digest('hex');
for (const path of assets.keys()) {
  const local = await readFile('site' + path);
  const response = await fetch(origin + path, { cache: 'no-store' });
  assert(response.ok, `Asset HTTP ${response.status}: ${path}`);
  const remote = Buffer.from(await response.arrayBuffer());
  assert.equal(sha(remote), sha(local), `Published asset SHA256: ${path}`);
  assets.set(path, sha(remote));
}
await writeFile('qa/site-micro-polish-20261101/production-assets.json', JSON.stringify({ pages: paths, assets: Object.fromEntries(assets), pass: true }, null, 2));
console.log(`PASS: ${paths.length} production pages reference accepted assets; ${assets.size} CSS/JS match local build by SHA256.`);
