import { parseAttribution, type EntryAttribution } from '../data/interest-context';

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };
const attributionKey = 'pirogorsk:attribution:v1';
export function createAttributionMemory(store?: Store) {
  let current: EntryAttribution | undefined;
  try { current = parseAttribution(JSON.parse(store?.getItem(attributionKey) || 'null')) || undefined; } catch { /* Optional storage. */ }
  return {
    current: () => current,
    enter(href: string) {
      try {
        const url = new URL(href);
        if (!['pirogorsk.ru', 'www.pirogorsk.ru', 'localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !['https:', 'http:'].includes(url.protocol)) return current;
        if (url.searchParams.getAll('pg_channel').length !== 1 || url.searchParams.getAll('pg_partner').length > 1) return current;
        const next = parseAttribution({ channel: url.searchParams.get('pg_channel'), ...(url.searchParams.has('pg_partner') ? { partnerCode: url.searchParams.get('pg_partner') } : {}) });
        if (next) {
          current = next;
          try { store?.setItem(attributionKey, JSON.stringify(next)); } catch { /* Keep same-document attribution. */ }
        }
      } catch { /* Invalid entry is ignored. */ }
      return current;
    },
  };
}
