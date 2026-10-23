import { catalog as products } from '../../src/data/catalog.ts';

/** Bundle the same JSON-safe source as the website: no separate list to drift. */
export const catalog: Record<string, Record<string, number>> = Object.fromEntries(
  products.map(product => [product.id, Object.fromEntries(product.variants.map(variant => [String(variant.value), variant.price]))]),
);
