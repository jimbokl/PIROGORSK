import sharp from 'sharp';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const prompts = JSON.parse(await readFile('research/product-backdrops-20261029/prompts.json', 'utf8'));
const widths = [256, 400, 640, 960];
const prior = new Map();
try {
  for (const entry of JSON.parse(await readFile('src/data/product-backdrops.json', 'utf8'))) prior.set(entry.id, entry);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir('public/product-backdrops', { recursive: true });
const manifest = [], missing = [];
for (const item of prompts) {
  try { await stat(item.source); } catch { missing.push(item.id); continue; }
  const png = await readFile(item.source);
  const sourceSha256 = createHash('sha256').update(png).digest('hex');
  const files = widths.flatMap(width => ['avif', 'webp'].map(extension => `public/product-backdrops/${item.id}-${width}.${extension}`));
  const cached = prior.get(item.id);
  if (cached?.sourceSha256 === sourceSha256 && (await Promise.all(files.map(file => stat(file).then(() => true, () => false)))).every(Boolean)) {
    manifest.push(cached);
    continue;
  }
  const square = sharp(png).resize(1200, 1200, { fit: 'cover' });
  await Promise.all(widths.flatMap(width => [
    square.clone().resize(width, width).avif({ quality: 43, effort: 4 }).toFile(`public/product-backdrops/${item.id}-${width}.avif`),
    square.clone().resize(width, width).webp({ quality: 69, effort: 4 }).toFile(`public/product-backdrops/${item.id}-${width}.webp`),
  ]));
  manifest.push({ id: item.id, source: item.source, sourceSha256, base: `/product-backdrops/${item.id}`, widths, promptFile: 'research/product-backdrops-20261029/prompts.json', generator: 'builtin-imagegen', generatedOn: '2026-10-29' });
}
if (missing.length && !process.argv.includes('--partial')) throw new Error(`Missing ${missing.length} backdrops: ${missing.join(', ')}`);
await writeFile('src/data/product-backdrops.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ prepared: manifest.length, missing: missing.length, responsiveFiles: manifest.length * widths.length * 2 }));
