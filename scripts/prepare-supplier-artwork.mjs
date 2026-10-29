import sharp from 'sharp';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const refs = JSON.parse(await readFile('research/supplier-artwork-20261029/references.json', 'utf8'));
const widths = [256, 400, 640, 960];
await mkdir('public/catalog-art', { recursive: true });
await mkdir('public/seo/catalog', { recursive: true });
const manifest = [], missing = [];
for (const ref of refs) {
  const source = `design/supplier-source/${ref.id}.png`;
  try { await stat(source); } catch { missing.push(ref.id); continue; }
  const png = await readFile(source);
  const square = sharp(png).resize(1200, 1200, { fit: 'contain', background: '#fbf9f4' });
  await Promise.all(widths.flatMap(width => [
    square.clone().resize(width, width).avif({ quality: 48, effort: 4 }).toFile(`public/catalog-art/${ref.id}-${width}.avif`),
    square.clone().resize(width, width).webp({ quality: 76, effort: 4 }).toFile(`public/catalog-art/${ref.id}-${width}.webp`),
  ]));
  await sharp(png).resize(1200, 630, { fit: 'contain', background: '#fbf9f4' }).jpeg({ quality: 82, mozjpeg: true }).toFile(`public/seo/catalog/${ref.id}.jpg`);
  manifest.push({ id: ref.id, source, sourceSha256: createHash('sha256').update(png).digest('hex'),
    base: `/catalog-art/${ref.id}`, widths, ogImage: `/seo/catalog/${ref.id}.jpg`,
    alt: `${ref.name} — авторская иллюстрация по описанию производителя`,
    referenceUrl: ref.imageUrl, referenceSha256: ref.referenceSha256,
    promptFile: 'research/supplier-artwork-20261029/prompts.json', generator: 'builtin-imagegen', generatedOn: '2026-10-29' });
}
if (missing.length && !process.argv.includes('--partial')) throw new Error(`Missing ${missing.length} illustrations: ${missing.join(', ')}`);
await writeFile('src/data/supplier-artwork.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ prepared: manifest.length, missing: missing.length, formats: widths.length * 2, originals: 'design/supplier-source' }));
