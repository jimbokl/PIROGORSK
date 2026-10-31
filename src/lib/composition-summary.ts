import type { Product } from '../data/catalog.ts';
import { mergeSelection, type SelectionItem } from './selection-offers.ts';
import { hasPiePortions, portionSummary } from './product-portions.ts';

type SummaryProduct = Pick<Product, 'id' | 'kind' | 'unit' | 'category' | 'variants'>;
const mass = (grams: number) => grams < 1000 ? `${grams} г` : `${(grams / 1000).toLocaleString('ru-RU')} кг`;

/** Count portions only for pies; drinks, dough and tableware never become food weight. */
export function compositionSummary(items: SelectionItem[], catalog: SummaryProduct[]) {
  const valid = mergeSelection([], items, catalog);
  if (!valid) return null;
  let pieGrams = 0, otherGrams = 0, drinkMl = 0, settings = 0;
  for (const item of valid) {
    const product = catalog.find(product => product.id === item.id)!;
    const amount = item.value * item.quantity;
    if (hasPiePortions(product)) pieGrams += amount;
    else if (product.unit === 'g') otherGrams += amount;
    else if (product.unit === 'ml') drinkMl += amount;
    else if (product.id === 'tableware') settings += amount;
  }
  const text = [
    pieGrams ? `${portionSummary(pieGrams)} пирогов` : '',
    otherGrams ? `${mass(otherGrams)} других продуктов` : '',
    drinkMl ? `Напитки — ${(drinkMl / 1000).toLocaleString('ru-RU')} л` : '',
    settings ? `Посуда — ${settings} наб.` : '',
  ].filter(Boolean).join(' · ');
  return { pieGrams, otherGrams, drinkMl, settings, text };
}
