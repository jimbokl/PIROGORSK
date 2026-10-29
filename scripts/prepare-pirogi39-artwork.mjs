import sharp from 'sharp';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const refs = JSON.parse(await readFile('research/pirogi39-20261029/prompts.json', 'utf8'));
const widths = [256, 400, 640, 960];
const previous = await readFile('src/data/pirogi39-artwork.json', 'utf8').then(JSON.parse).catch(() => []);
await mkdir('public/catalog-art', { recursive: true });
await mkdir('public/seo/catalog', { recursive: true });
const manifest = [], missing = [];
for (const ref of refs) {
  const source = `design/pirogi39-source/${ref.id}.png`;
  try { await stat(source); } catch { missing.push(ref.id); continue; }
  const png = await readFile(source);
  const sourceSha256 = createHash('sha256').update(png).digest('hex');
  const base = `/catalog-art/${ref.id}`;
  // Keep the transparent foreground above the ingredient backdrop and motion layers.
  const square = sharp(png).resize(1200, 1200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  for (const width of widths) {
    for (const format of ['avif', 'webp']) {
      const target = `public${base}-${width}.${format}`;
      const cached = await stat(target).then(info => info.size > 100 && info.size < 220000).catch(() => false);
      if (cached && previous.some(item => item.id === ref.id && item.sourceSha256 === sourceSha256)) continue;
      const qualities = format === 'avif' ? [48, 44, 40, 36] : [76, 68, 60, 52];
      for (const quality of qualities) {
        const output = square.clone().resize(width, width);
        const data = await (format === 'avif' ? output.avif({ quality, effort: 4 }) : output.webp({ quality, alphaQuality: 80, effort: 4 })).toBuffer();
        if (data.length >= 220000) continue;
        await writeFile(target, data);
        break;
      }
      if ((await stat(target)).size >= 220000) throw new Error(`Image exceeds transfer budget: ${target}`);
    }
  }
  const ogImage = `/seo/catalog/${ref.id}.jpg`;
  await sharp(png).resize(1200, 630, { fit: 'contain', background: '#fbf9f4' }).flatten({ background: '#fbf9f4' }).jpeg({ quality: 82, mozjpeg: true }).toFile(`public${ogImage}`);
  manifest.push({ id: ref.id, source, sourceSha256, base, widths, ogImage,
    alt: `${ref.name} — иллюстрация пирога`,
    referenceUrl: ref.imageUrl, referenceSha256: ref.referenceSha256,
    promptFile: 'research/pirogi39-20261029/prompts.json', generator: 'builtin-imagegen', generatedOn: '2026-10-29' });
}
if (missing.length && !process.argv.includes('--partial')) throw new Error(`Missing ${missing.length} illustrations: ${missing.join(', ')}`);
await writeFile('src/data/pirogi39-artwork.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ prepared: manifest.length, missing: missing.length, formats: widths.length * 2, originals: 'design/pirogi39-source' }));
