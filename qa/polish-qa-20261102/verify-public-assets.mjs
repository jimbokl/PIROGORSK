import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const origin = 'https://pirogorsk.ru';
const paths = ['/', '/menu/', '/delivery/', '/zelenogradsk/', '/blog/', '/journal/dostavka-edy-v-zelenogradske/', '/nabor/piknik-u-morya/'];
const sha = data => createHash('sha256').update(data).digest('hex');
const inline = html => ({
  styles: [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => sha(match[1])),
  scripts: [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(match => !/\bsrc=/.test(match[1]) && (!/\btype=/.test(match[1]) || /\btype="(?:module|text\/javascript|application\/javascript)"/.test(match[1])))
    .map(match => sha(match[2])),
});
const assets = new Map();
const pages = [];
for (const path of paths) {
  const local = await readFile(`site${path}index.html`, 'utf8');
  const response = await fetch(origin + path + '?qa=1', { cache: 'no-store' });
  assert(response.ok, `Page HTTP ${response.status}: ${path}`);
  const remote = await response.text();
  const acceptedInline = inline(local);
  assert(acceptedInline.styles.length > 0, `Accepted page contains inline CSS: ${path}`);
  assert.deepEqual(inline(remote), acceptedInline, `Published inline CSS/JS SHA256 and order: ${path}`);
  pages.push({ path, ...acceptedInline });
  for (const match of local.matchAll(/(?:href|src)="(\/_astro\/[^"?]+\.(?:css|js))"/g)) {
    assert(remote.includes(match[1]), `Published page references accepted asset: ${path} ${match[1]}`);
    assets.set(match[1], null);
  }
}
for (const path of assets.keys()) {
  const local = await readFile('site' + path);
  const response = await fetch(origin + path, { cache: 'no-store' });
  assert(response.ok, `Asset HTTP ${response.status}: ${path}`);
  const remote = Buffer.from(await response.arrayBuffer());
  assert.equal(sha(remote), sha(local), `Published asset SHA256: ${path}`);
  assets.set(path, sha(remote));
}
const inlineBlocks = pages.reduce((sum, page) => sum + page.styles.length + page.scripts.length, 0);
assert(inlineBlocks > 0, 'Non-empty public asset comparison');
await writeFile('qa/polish-qa-20261102/production-assets.json', JSON.stringify({ pages, assets: Object.fromEntries(assets), inlineBlocks, pass: true }, null, 2) + '\n');
console.log(`PASS: ${paths.length} production pages; ${inlineBlocks} inline CSS/JS blocks and ${assets.size} external assets match local build by SHA256.`);
