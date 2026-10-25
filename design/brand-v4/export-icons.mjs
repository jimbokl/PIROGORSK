// Run from the repository root: node design/brand-v4/export-icons.mjs
import sharp from 'sharp';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const icon = new URL('favicon-source.svg', import.meta.url);
await copyFile(icon, new URL('public/favicon.svg', root));
const source = await readFile(icon);
const sizes = [16, 32, 48];
const pngs = [];
for (const size of sizes) {
  const png = await sharp(source, { density: 288 }).resize(size, size).png().toBuffer();
  pngs.push(png);
  if (size === 32) await writeFile(new URL('public/favicon-32.png', root), png);
}
await sharp(source, { density: 288 }).resize(180, 180).flatten({ background: '#123B4A' }).png().toFile(fileURLToPath(new URL('public/apple-touch-icon.png', root)));
// ICO entries contain standard PNG payloads; no additional runtime dependency.
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const entry = 6 + i * 16;
  header[entry] = sizes[i];
  header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(pngs[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += pngs[i].length;
}
await writeFile(new URL('public/favicon.ico', root), Buffer.concat([header, ...pngs]));
console.log('Exported favicon.svg, favicon-32.png, favicon.ico (16/32/48), apple-touch-icon.png (180).');
