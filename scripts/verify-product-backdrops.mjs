import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { catalog } from '../src/data/catalog.ts';
import { catalogProductHref } from '../src/lib/product-paths.ts';
const manifest = JSON.parse(await readFile('src/data/product-backdrops.json', 'utf8'));
const retained = JSON.parse(await readFile('research/product-backdrops-20261029/retained-backgrounds.json', 'utf8'));
const prompts = JSON.parse(await readFile('research/product-backdrops-20261029/prompts.json', 'utf8'));
const hash = data => createHash('sha256').update(data).digest('hex');
const expected = catalog.map(product => product.id).sort();
assert.equal(manifest.length, 84);
assert.equal(retained.length, 8);
assert.deepEqual([...manifest, ...retained].map(item => item.id).sort(), expected);
assert.deepEqual(prompts.map(item => item.id).sort(), manifest.map(item => item.id).sort());
assert.equal(new Set(manifest.map(item => item.sourceSha256)).size, manifest.length, 'each new product has its own generated source');
const assets = [];
for (const item of manifest) {
  assert.equal(hash(await readFile(item.source)), item.sourceSha256, `${item.id} source provenance`);
  assert.equal(item.generator, 'builtin-imagegen');
  for (const width of item.widths) for (const extension of ['avif','webp']) {
    const file = `public${item.base}-${width}.${extension}`;
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, width, file); assert.equal(metadata.height, width, file);
    assets.push({ id:item.id, file, width, bytes:(await stat(file)).size });
  }
}
assert.equal(assets.length, 672);
for(const item of retained) await stat(item.source);
const menu = await readFile('site/menu/index.html','utf8');
const menuIds = [...menu.matchAll(/data-product-backdrop="([^"]+)"/g)].map(match=>match[1]).sort();
assert.deepEqual(menuIds, manifest.map(item=>item.id).sort());
for (const product of catalog) {
  const route = catalogProductHref(product);
  const html = await readFile(`site${route}index.html`,'utf8');
  if (manifest.some(item => item.id === product.id)) {
    assert.ok(html.includes(`data-product-backdrop="${product.id}"`), `${route} backdrop`);
    assert.match(html, /data-product-backdrop="[^"]+"[^>]*aria-hidden="true"/, `${route} decorative layer`);
    const heroBackdrop = html.match(new RegExp(`<picture[^>]*data-product-backdrop="${product.id}"[^>]*>[\\s\\S]*?</picture>`))?.[0];
    assert.match(heroBackdrop, /loading="eager"/, `${route} hero backdrop loads eagerly`);
    assert.match(heroBackdrop, /fetchpriority="high"/, `${route} hero backdrop has LCP priority`);
  } else assert.ok(html.includes('product-visual-background'), `${route} retained backdrop`);
}
const tableware = await sharp('design/product-backdrops-source/tableware-product.png').metadata();
assert.equal(tableware.hasAlpha,true,'tableware foreground is a separate transparent layer');
const statistics = { checkedAt:new Date().toISOString(), positions:catalog.length, generated:manifest.length, retained:retained.length, responsiveFiles:assets.length, totalBytes:assets.reduce((sum,item)=>sum+item.bytes,0), maxFileBytes:Math.max(...assets.map(item=>item.bytes)), perWidth:Object.fromEntries([256,400,640,960].map(width=>{const selected=assets.filter(item=>item.width===width);return[width,{files:selected.length,averageBytes:Math.round(selected.reduce((sum,item)=>sum+item.bytes,0)/selected.length),maxBytes:Math.max(...selected.map(item=>item.bytes))}]})) };
await writeFile('qa/product-backdrops-20261029/asset-integrity.json',JSON.stringify(statistics,null,2)+'\n');
console.log(JSON.stringify(statistics));
