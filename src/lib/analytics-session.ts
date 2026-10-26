const qaSessionKey = 'pirogorsk-qa-session';
const productionHosts = new Set(['pirogorsk.ru', 'www.pirogorsk.ru']);

type SessionStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** Local previews and explicitly marked QA tabs are not demand measurements. */
export function analyticsSessionEnabled(value: string, store?: SessionStore): boolean {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== 'https:' || !productionHosts.has(url.hostname)) return false;

  if (url.searchParams.getAll('qa').length === 1 && url.searchParams.get('qa') === '1') {
    try { store?.setItem(qaSessionKey, '1'); } catch { /* This page is still excluded. */ }
    return false;
  }
  try { return store?.getItem(qaSessionKey) !== '1'; } catch { return true; }
}
