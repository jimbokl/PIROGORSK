// Canonical small mark: a round golden pie, drawn to stay clear at 16 px.
// node design/brand-v7-small-icons/export-icons.mjs
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const publicDir = new URL('public/', root);
const brandDir = new URL('brand/', publicDir);
const svg = await readFile(new URL('pie-sun.svg', import.meta.url));
await mkdir(brandDir, { recursive: true });
await writeFile(new URL('favicon.svg', publicDir), svg);
await writeFile(new URL('pirogorsk-symbol.svg', brandDir), svg);
const render = size => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
await writeFile(new URL('pirogorsk-symbol.png', brandDir), await render(512));

const sizes = [16, 32, 48];
const pngs = [];
for (const size of sizes) {
  const png = await render(size);
  pngs.push(png);
  await writeFile(new URL(`favicon-${size}.png`, publicDir), png);
}
// Apple touch icons use an opaque tile; iOS applies its own corner mask.
const tile = await sharp({ create: { width: 180, height: 180, channels: 4, background: '#FFF8EA' } })
  .composite([{ input: await render(148), left: 16, top: 16 }]).png().toBuffer();
await writeFile(new URL('apple-touch-icon.png', publicDir), tile);

const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const at = 6 + i * 16;
  header[at] = sizes[i];
  header[at + 1] = sizes[i];
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(pngs[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += pngs[i].length;
}
await writeFile(new URL('favicon.ico', publicDir), Buffer.concat([header, ...pngs]));
console.log('Exported pie-sun SVG, symbol 512, ICO/PNG 16/32/48 and Apple touch 180.');
