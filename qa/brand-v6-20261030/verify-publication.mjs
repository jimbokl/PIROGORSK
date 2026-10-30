// Compare production with independently downloaded CI Pages artifact.
import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve('qa/brand-v6-20261030');
const artifact = resolve(root, 'artifact-site');
const paths = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes:true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) await walk(path);
    else paths.push(relative(artifact, path));
  }
}
await walk(artifact);
const html = paths.filter(path => path.endsWith('.html'));
assert.equal(html.length, 217);
const files = [], failures = [];
const queue = [...paths];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await Promise.all(Array.from({ length:8 }, async () => {
  for (let file; (file = queue.shift());) {
    const expected = await readFile(resolve(artifact, file));
    const path = file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -10)}` : `/${file}`;
    const url = new URL(path, 'https://pirogorsk.ru');
    url.searchParams.set('qa', '1');
    if (!file.endsWith('.html')) url.searchParams.set('v', file.startsWith('favicon') || file === 'apple-touch-icon.png' ? '20261030-6' : '6');
    try {
      const response = await fetch(url, { headers:{ 'Cache-Control':'no-cache' }, signal:AbortSignal.timeout(30000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      const sha256 = hash(bytes), matchesBuild = sha256 === hash(expected);
      assert.equal(response.status, 200, path);
      assert.equal(matchesBuild, true, `Bytes differ: ${path}`);
      if (file.endsWith('.html')) {
        const text = bytes.toString();
        // Three historical city URLs are minimal redirects, without a site head.
        if (!text.includes('http-equiv="refresh"')) {
          assert.ok(text.includes('/brand/pirogorsk-logo.png?v=6'), `Old schema logo: ${path}`);
          for (const icon of ['favicon.ico', 'favicon-32.png', 'favicon.svg', 'apple-touch-icon.png']) assert.ok(text.includes(`/${icon}?v=20261030-6`), `Old icon: ${path}`);
        }
        // Privacy and terms intentionally have no shared masthead/footer.
        if (text.includes('data-site-header')) assert.ok(text.includes('pirogorsk-logo-640.webp?v=6'), `Old brand: ${path}`);
      }
      files.push({ path, status:response.status, bytes:bytes.length, sha256, encoding:response.headers.get('content-encoding'), matchesBuild });
    } catch (error) { failures.push({ path, error:error.message }); }
  }
}));
await writeFile(`${root}/publication.json`, JSON.stringify({ checkedAt:new Date().toISOString(), source:'GitHub Actions Pages artifact', htmlPages:html.length, files:files.sort((a,b)=>a.path.localeCompare(b.path)), failures }, null, 2)+'\n');
assert.deepEqual(failures, []);
console.log(`PASS: ${files.length} production resources match CI artifact; all ${html.length} HTML pages checked, shared headers and site heads use new brand assets.`);
