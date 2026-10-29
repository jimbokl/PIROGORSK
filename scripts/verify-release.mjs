import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { INTEREST_API_VERSION, serializeCatalog } from '../src/data/catalog-contract.ts';
import { analyticsConfig } from '../src/config/analytics.ts';

export function releaseManifest() {
  return { apiVersion: INTEREST_API_VERSION, catalogSha256: createHash('sha256').update(serializeCatalog()).digest('hex') };
}

export function healthUrl(endpoint) {
  const url = new URL(endpoint);
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.pathname !== '/api/interest' || url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) {
    throw new Error('Expected HTTPS API endpoint ending in /api/interest');
  }
  url.pathname = '/health'; url.search = ''; url.hash = '';
  return url;
}

export async function verifyRelease(manifest, { endpoint = analyticsConfig.interestEndpoint, fetchImpl = fetch, timeoutMs = 15000, siteUrl } = {}) {
  if (manifest?.apiVersion !== INTEREST_API_VERSION || !/^[a-f0-9]{64}$/.test(manifest?.catalogSha256 ?? '')) throw new Error('Invalid local release manifest');
  const signal = AbortSignal.timeout(timeoutMs);
  const response = await fetchImpl(healthUrl(endpoint), { signal, cache: 'no-store' });
  if (response.status !== 200) throw new Error(`Worker health HTTP ${response.status}`);
  const health = await response.json();
  if (health.ok !== true || health.storage !== 'd1' || health.mode !== 'intent' || health.apiVersion !== manifest.apiVersion || health.catalogSha256 !== manifest.catalogSha256) {
    throw new Error('Worker API/catalog differs from the Pages artifact or D1 is unavailable');
  }
  if (siteUrl) {
    const url = new URL('/release.json', siteUrl);
    url.searchParams.set('verify', String(Date.now()));
    const published = await fetchImpl(url, { signal, cache: 'no-store' });
    if (published.status !== 200) throw new Error(`Published manifest HTTP ${published.status}`);
    const actual = await published.json();
    if (actual.apiVersion !== manifest.apiVersion || actual.catalogSha256 !== manifest.catalogSha256) throw new Error('Published Pages manifest differs from the artifact');
  }
  return health;
}

async function main() {
  const [command, endpointOrSite] = process.argv.slice(2);
  if (command === 'manifest') {
    await writeFile('site/release.json', JSON.stringify(releaseManifest(), null, 2) + '\n');
    console.log('Release manifest written: site/release.json');
    return;
  }
  if (!['check', 'published'].includes(command)) throw new Error('Usage: verify-release.mjs manifest | check [API endpoint] | published [site URL]');
  const manifest = JSON.parse(await readFile('site/release.json', 'utf8'));
  const deadline = Date.now() + (command === 'published' ? 60000 : 15000);
  while (true) {
    try {
      await verifyRelease(manifest, {
        ...(command === 'published' ? { siteUrl: endpointOrSite || 'https://pirogorsk.ru/' } : { endpoint: endpointOrSite || analyticsConfig.interestEndpoint }),
        timeoutMs: Math.max(1, Math.min(15000, deadline - Date.now())),
      });
      console.log(`Release compatibility PASS (${command})`);
      return;
    } catch (error) {
      if (command !== 'published' || Date.now() >= deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.min(5000, deadline - Date.now())));
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`Release compatibility FAIL: ${error.message}`); process.exitCode = 1; });
}
