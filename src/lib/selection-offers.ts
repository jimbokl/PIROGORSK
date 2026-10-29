import type { Product } from '../data/catalog.ts';

export type SelectionItem = { id: string; value: number; quantity: number };
type PricedProduct = Pick<Product, 'id' | 'variants'>;

export function selectionPrice(items: SelectionItem[], catalog: PricedProduct[]) {
  return items.reduce((total, item) => {
    const variant = catalog.find(product => product.id === item.id)?.variants.find(variant => variant.value === item.value);
    if (!variant) throw new Error(`Unknown variant: ${item.id}:${item.value}`);
    return total + variant.price * item.quantity;
  }, 0);
}

/** All-or-nothing merge. `ensure` makes a followed bundle URL safe to reload. */
export function mergeSelection(current: SelectionItem[], incoming: SelectionItem[], catalog: PricedProduct[], mode: 'add' | 'ensure' = 'add'): SelectionItem[] | null {
  const merged = current.map(item => ({ ...item }));
  for (const item of incoming) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 || !catalog.some(product => product.id === item.id && product.variants.some(variant => variant.value === item.value))) return null;
    const existing = merged.find(entry => entry.id === item.id && entry.value === item.value);
    if (existing) existing.quantity = mode === 'ensure' ? Math.max(existing.quantity, item.quantity) : existing.quantity + item.quantity;
    else merged.push({ ...item });
  }
  return merged.length > 24 || merged.some(item => item.quantity > 99) ? null : merged;
}

export function availableAddOns(items: SelectionItem[], catalog: Pick<Product, 'id' | 'kind' | 'category'>[]): string[] {
  const selected = items.map(item => catalog.find(product => product.id === item.id)).filter(product => product !== undefined);
  if (!selected.some(product => product.kind === 'pie' || product.kind === 'bakery')) return [];
  const sweet = selected.some(product => ['sweet', 'sweet-pies', 'desserts'].includes(product.category));
  return [
    !selected.some(product => ['cranberry', 'seabuckthorn'].includes(product.id)) && 'morse',
    !sweet && 'sweet',
    !selected.some(product => product.id === 'tableware') && 'tableware',
  ].filter((id): id is string => Boolean(id));
}
