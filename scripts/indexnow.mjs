import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
export function validateManifest(manifest, host) {
  if (manifest?.version !== 1 || manifest.host !== host || !manifest.pages || typeof manifest.pages !== 'object' || Array.isArray(manifest.pages)) throw new Error('Invalid IndexNow manifest');
  for (const [url, hash] of Object.entries(manifest.pages)) {
    const parsed = new URL(url);
    if (parsed.origin !== `https://${host}` || parsed.search || parsed.hash || !/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid manifest page: ${url}`);
  }
  return manifest;
}

export function changedUrls(current, previous) {
  validateManifest(current, current.host);
  if (previous) validateManifest(previous, current.host);
  return [...new Set([
    ...Object.keys(current.pages).filter(url => current.pages[url] !== previous?.pages[url]),
    ...Object.keys(previous?.pages ?? {}).filter(url => !Object.hasOwn(current.pages, url)),
  ])].sort();
}

export async function buildManifest(directory, host) {
  const sitemap = await readFile(path.join(directory, 'sitemap.xml'), 'utf8');
  const pages = {};
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = new URL(match[1]);
    if (url.origin !== `https://${host}` || url.search || url.hash || !url.pathname.endsWith('/')) throw new Error(`Unexpected sitemap URL ${url}`);
    const html = await readFile(path.join(directory, decodeURIComponent(url.pathname), 'index.html'), 'utf8');
    if (!html.includes(`rel="canonical" href="${url.href}"`) || /name="robots"[^>]*content="[^"]*noindex/.test(html)) throw new Error(`Not an indexable canonical: ${url}`);
    if (Object.hasOwn(pages, url.href)) throw new Error(`Duplicate sitemap URL ${url}`);
    pages[url.href] = createHash('sha256').update(html).digest('hex');
  }
  if (!Object.keys(pages).length) throw new Error('Empty sitemap');
  return validateManifest({ version: 1, host, pages }, host);
}

export async function submitChanges({ current, previous, key, endpoint, fetcher = fetch, readinessAttempts = 1, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const urlList = changedUrls(current, previous);
  if (!urlList.length) return { status: 'unchanged', count: 0 };
  if (urlList.length > 10000) throw new Error('IndexNow batch exceeds 10000 URLs');
  // Verify the actually published release and key before acknowledging its hashes.
  const origin = `https://${current.host}`;
  for (let attempt = 1; attempt <= readinessAttempts; attempt++) {
    try {
      const [keyResponse, manifestResponse] = await Promise.all([
        fetcher(`${origin}/${key}.txt`, { cache: 'no-store', signal: AbortSignal.timeout(20000) }),
        fetcher(`${origin}/indexnow-manifest.json`, { cache: 'no-store', signal: AbortSignal.timeout(20000) }),
      ]);
      if (!keyResponse.ok || (await keyResponse.text()).trim() !== key) throw new Error('Published IndexNow key is not ready');
      if (!manifestResponse.ok) throw new Error('Published manifest is not ready');
      const published = validateManifest(await manifestResponse.json(), current.host);
      if (changedUrls(current, published).length) throw new Error('Domain still serves a different release');
      break;
    } catch (error) {
      if (attempt === readinessAttempts) throw error;
      console.warn(`Waiting for public release (${attempt}/${readinessAttempts}): ${error.message}`);
      await wait(5000);
    }
  }
  const response = await fetcher(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: current.host, key, keyLocation: `${origin}/${key}.txt`, urlList }),
    signal: AbortSignal.timeout(30000),
  });
  if (![200, 202].includes(response.status)) throw new Error(`IndexNow rejected submission: HTTP ${response.status}`);
  return { status: response.status === 200 ? 'received' : 'received-key-validation-pending', httpStatus: response.status, count: urlList.length, urls: urlList };
}

async function main() {
  const config = JSON.parse(await readFile(path.join(root, 'config/indexnow.json'), 'utf8'));
  const command = process.argv[2];
  if (command === 'manifest') {
    const manifest = await buildManifest(path.join(root, 'site'), config.host);
    await writeFile(path.join(root, 'site/indexnow-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`IndexNow manifest: ${Object.keys(manifest.pages).length} canonical pages`);
    return;
  }
  if (command !== 'submit') throw new Error('Usage: node scripts/indexnow.mjs manifest|submit');
  const current = validateManifest(JSON.parse(await readFile(path.join(root, 'site/indexnow-manifest.json'), 'utf8')), config.host);
  const statePath = path.join(root, '.indexnow/state.json');
  let previous;
  try { previous = validateManifest(JSON.parse(await readFile(statePath, 'utf8')), config.host); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const report = await submitToEndpoints({ current, previous, ...config, readinessAttempts: 7 });
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(path.join(root, '.indexnow/report.json'), `${JSON.stringify({ ...report, checkedAt: new Date().toISOString() }, null, 2)}\n`);
  // A failed network request never advances the acknowledgement state.
  await writeFile(statePath, `${JSON.stringify(current, null, 2)}\n`);
  console.log(JSON.stringify(report));
}

/** Only acknowledge a release once every configured receiver accepts the batch. */
export async function submitToEndpoints({ endpoints, ...options }) {
  if (!Array.isArray(endpoints) || !endpoints.length || new Set(endpoints).size !== endpoints.length) throw new Error('Expected distinct IndexNow endpoints');
  for (const endpoint of endpoints) if (!['https://api.indexnow.org/indexnow', 'https://yandex.com/indexnow'].includes(endpoint)) throw new Error('Unexpected IndexNow receiver');
  const receivers=[];
  for (const endpoint of endpoints) {
    try { receivers.push({endpoint,...await submitChanges({...options,endpoint})}); }
    catch (cause) { const error=new Error(`${endpoint}: ${cause.message}`); error.receivers=[...receivers,{endpoint,status:'failed',message:cause.message}]; throw error; }
  }
  return {status:receivers.every(r=>r.status==='unchanged')?'unchanged':'received-by-all',count:receivers[0].count,receivers};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(async error => {
    console.error(error.message);
    await mkdir(path.join(root, '.indexnow'), { recursive: true });
    await writeFile(path.join(root, '.indexnow/report.json'), `${JSON.stringify({ status: 'failed', message: error.message, receivers:error.receivers, checkedAt: new Date().toISOString() }, null, 2)}\n`);
    process.exitCode = 1;
  });
}
