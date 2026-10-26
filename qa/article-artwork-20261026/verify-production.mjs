import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const manifest = JSON.parse(await readFile('src/data/article-artwork.json', 'utf8'));
const paths = new Set(['/blog/', '/sitemap.xml']);
for (const { slug, source } of manifest) {
  const page = `/journal/${slug}/`;
  paths.add(page); paths.add(`/seo/blog/${slug}.jpg`);
  const html = await readFile(`site${page}index.html`, 'utf8');
  const basename = source.split('/').at(-1).replace(/\.png$/, '');
  const tag = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]).find(t => t.includes(`/${basename}.`));
  paths.add(tag.match(/\bsrc="([^"]+)"/)[1]);
}
const queue = [...paths], results = [];
const hash = value => createHash('sha256').update(value).digest('hex');
async function worker() {
  while (queue.length) {
    const path = queue.shift();
    const local = await readFile(`site${path}${path.endsWith('/') ? 'index.html' : ''}`);
    const res = await fetch(`https://pirogorsk.ru${path}`, { signal: AbortSignal.timeout(30000) });
    const bytes = Buffer.from(await res.arrayBuffer());
    results.push({path,status:res.status,bytes:bytes.length,matchesBuild:hash(bytes)===hash(local)});
  }
}
await Promise.all(Array.from({length:4},worker));
await writeFile('qa/article-artwork-20261026/production.json', JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
assert.ok(results.every(r=>r.status===200&&r.matchesBuild),'Production differs from verified build; inspect production.json');
console.log(`Production PASS: ${results.length} article, card, OG, cover and sitemap URLs match the build.`);
