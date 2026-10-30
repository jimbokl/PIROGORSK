// Deterministic web/icon exports from the approved imagegen PNG. No redrawing.
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

// Retain the original town's alpha-connected pixels, including antialiasing,
// without slicing the wave or keeping a fragment of the first letter.
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const seen = new Uint8Array(width * height);
let town = [];
for (let i = 0; i < width * height; i++) {
  if (seen[i] || data[i * 4 + 3] === 0) continue;
  const component = [i];
  seen[i] = 1;
  for (let n = 0; n < component.length; n++) {
    const p = component[n], x = p % width, y = Math.floor(p / width);
    for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++) {
      for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++) {
        const j = yy * width + xx;
        if (!seen[j] && data[j * 4 + 3] > 0) { seen[j] = 1; component.push(j); }
      }
    }
  }
  if (component.length > town.length) town = component;
}
const pixels = Buffer.alloc(data.length);
for (const p of town) data.copy(pixels, p * 4, p * 4, p * 4 + 4);
const symbol = await sharp(pixels, { raw: { width, height, channels: 4 } })
  .trim().resize(512, 512, { fit: 'contain', background: '#0000' }).png().toBuffer();
await writeFile(new URL('pirogorsk-symbol.png', output), symbol);
await writeFile(new URL('pirogorsk-symbol.svg', output), embeddedSvg(symbol, '0 0 512 512', 'Пироговый город'));

const iconPng = async size => {
  const inset = Math.max(1, Math.round(size * .06));
  const townPng = await sharp(symbol).resize(size - inset * 2, size - inset * 2).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
    .composite([{ input: townPng, left: inset, top: inset }]).png().toBuffer();
};
const sizes = [16, 32, 48];
const pngs = [];
for (const size of sizes) pngs.push(await iconPng(size));
await writeFile(new URL('public/favicon-32.png', root), pngs[1]);
await writeFile(new URL('public/apple-touch-icon.png', root), await iconPng(180));
await writeFile(new URL('public/favicon.svg', root), embeddedSvg(await iconPng(128), '0 0 128 128', 'Пирогорск'));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const at = 6 + i * 16;
  header[at] = sizes[i]; header[at + 1] = sizes[i];
  header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(pngs[i].length, at + 8); header.writeUInt32LE(offset, at + 12);
  offset += pngs[i].length;
}
await writeFile(new URL('public/favicon.ico', root), Buffer.concat([header, ...pngs]));
console.log('Exported logo 400/640/960 WebP + PNG, symbol, SVG wrappers, ICO 16/32/48, PNG 32 and Apple 180.');
