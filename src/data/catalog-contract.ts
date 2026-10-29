import { catalog as sourceCatalog } from './catalog.ts';

export const INTEREST_API_VERSION = 1;
type PricedProduct = { id: string; variants: readonly { value: number; price: number }[] };

/** Only the order contract participates; copy before sorting to preserve display order. */
export function serializeCatalog(products: readonly PricedProduct[] = sourceCatalog): string {
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  return JSON.stringify([...products].sort((a, b) => compare(a.id, b.id)).map(product => [
    product.id,
    [...product.variants].sort((a, b) => compare(String(a.value), String(b.value)))
      .map(variant => [String(variant.value), variant.price]),
  ]));
}
