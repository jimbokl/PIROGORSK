// Approved pie-city wordmark exports; small icons use the dedicated v7 SVG.
// Run from any directory: node design/brand-v6/export-web.mjs
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const output = new URL('public/brand/', root);
const source = await readFile(new URL('pie-city-logo.png', import.meta.url));
await mkdir(output, { recursive: true });
for (const width of [400, 640, 960]) {
  await sharp(source).resize({ width }).webp({ quality: 88, effort: 6 })
    .toFile(new URL(`pirogorsk-logo-${width}.webp`, output).pathname);
}
const logo = await sharp(source).resize({ width: 960 }).png({ compressionLevel: 9 }).toBuffer();
await writeFile(new URL('pirogorsk-logo.png', output), logo);
const embeddedSvg = (png, viewBox, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}"><title>${title}</title><image width="100%" height="100%" href="data:image/png;base64,${png.toString('base64')}"/></svg>\n`;
// Compatibility URLs; these are raster-backed SVG wrappers, not vector artwork.
await writeFile(new URL('pirogorsk-logo.svg', output), embeddedSvg(logo, '0 0 2089 753', 'Пирогорск'));

// Tiny icons have their own simple pie silhouette for legibility at 16 px.
await import('../brand-v7-small-icons/export-icons.mjs');
console.log('Exported approved pie-city wordmark 400/640/960 WebP + PNG/SVG.');
