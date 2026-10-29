import type { Product } from '../data/catalog';

/** Stable public routes are independent of SKU/Worker identifiers. */
export const catalogProductHref = (product: Pick<Product, 'kind' | 'slug' | 'id'>) =>
  product.kind === 'pie' ? `/pirogi/${product.slug}/` : `/catalog/${product.slug.replace(/^hb-/, '')}/`;

export const selectionHref = (product: Pick<Product, 'kind' | 'id'>, value: number) =>
  `/?interest=${encodeURIComponent(product.id)}&variant=${value}#${product.id.startsWith('p39-') ? 'pirogi39' : product.kind === 'bakery' ? 'holland' : product.kind === 'pie' ? 'pirogi' : 'extras'}`;
