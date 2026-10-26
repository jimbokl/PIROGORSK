import { readFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const manifest = JSON.parse(await readFile('src/data/article-artwork.json', 'utf8'));
await mkdir('public/seo/blog', { recursive: true });
for (const entry of manifest) {
  await sharp(entry.source)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`public/seo/blog/${entry.slug}.jpg`);
}
console.log(`Prepared ${manifest.length} article OG images from their original covers.`);
