import type { Product } from '../data/catalog.ts';
import { mergeSelection, type SelectionItem } from './selection-offers.ts';

export const selectionCities = ['Зеленоградск', 'Калининград', 'Светлогорск'] as const;
export type Composition = { version: 1; city: string; items: SelectionItem[] };
type Catalog = Pick<Product, 'id' | 'variants'>[];

/** Prices are always read from the current catalog, never from saved/link data. */
export function readComposition(raw: unknown, catalog: Catalog): { composition: Composition; unavailable: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (data.version !== 1 || !selectionCities.includes(data.city as typeof selectionCities[number]) || !Array.isArray(data.items) || !data.items.length || data.items.length > 24) return null;
  const valid: SelectionItem[] = [];
  let unavailable = 0;
  for (const row of data.items) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !Number.isSafeInteger(row.value) || !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 99) return null;
    if (!catalog.some(product => product.id === row.id && product.variants.some(variant => variant.value === row.value))) { unavailable++; continue; }
    valid.push({ id: row.id, value: row.value, quantity: row.quantity });
  }
  const items = mergeSelection([], valid, catalog);
  if (!items) return null;
  return { composition: { version: 1, city: data.city as string, items }, unavailable };
}

export function compositionLink(composition: Composition, origin: string): string {
  const url = new URL('/', origin);
  // A fragment is not included in HTTP requests or referrer headers.
  url.hash = `selection=${encodeURIComponent(JSON.stringify(composition))}`;
  return url.href;
}

export function readCompositionLink(hash: string, catalog: Catalog) {
  if (!hash.startsWith('#selection=')) return null;
  try { return readComposition(JSON.parse(decodeURIComponent(hash.slice(11))), catalog); } catch { return null; }
}

/** A transparent serving estimate: one 250 ml glass and one place setting per guest. */
export function guestAdditions(items: SelectionItem[], guests: number, bottle: number) {
  const people = Number.isSafeInteger(guests) && guests > 0 ? guests : 1;
  const selectedMl = items.reduce((sum, item) => sum + (['cranberry', 'seabuckthorn'].includes(item.id) ? item.value * item.quantity : 0), 0);
  const selectedSettings = items.reduce((sum, item) => sum + (item.id === 'tableware' ? item.quantity : 0), 0);
  return { selectedMl, selectedSettings, bottles: Math.max(0, Math.ceil((people * 250 - selectedMl) / bottle)), settings: Math.max(0, people - selectedSettings) };
}
