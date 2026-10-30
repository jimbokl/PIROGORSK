import { catalog } from './catalog';

// Each product belongs to exactly one section; product URLs and prices stay canonical.
export const homeCatalogGroups = [
  { id: 'our-pies', label: 'Наши пироги', products: catalog.filter(p => p.kind === 'pie') },
  { id: 'pirogi39', label: 'Целые пироги', products: catalog.filter(p => p.supplier?.name === 'Пироги а-ля Русс') },
  { id: 'holland', label: 'Мини-пироги', products: catalog.filter(p => p.category === 'mini-pies') },
  { id: 'desserts', label: 'К чаю', products: catalog.filter(p => p.category === 'desserts') },
  { id: 'bread', label: 'Хлеб и булочки', products: catalog.filter(p => p.category === 'bread') },
  { id: 'bake', label: 'Для выпечки', products: catalog.filter(p => p.category === 'bake') },
  { id: 'dough', label: 'Тесто', products: catalog.filter(p => p.category === 'dough') },
  { id: 'extras', label: 'Напитки и посуда', products: catalog.filter(p => p.kind === 'drink' || p.kind === 'accessory') },
].filter(group => group.products.length);
