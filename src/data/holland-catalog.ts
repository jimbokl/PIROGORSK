import source from './holland-source.json' with { type: 'json' };
import type { Product } from './catalog.ts';
import { estimatePrice, pricingModel } from './pricing.ts';

export const supplierGroups = [
  ['all', 'Весь ассортимент'], ['mini-pies', 'Мини-пироги'], ['bread', 'Хлеб и булочки'],
  ['desserts', 'Десерты'], ['bake', 'Для выпечки'], ['dough', 'Тесто'],
] as const;
const weightLabel = (g: number) => g < 1000 ? `${g} г` : `${(g / 1000).toLocaleString('ru-RU')} кг`;

export const supplierProducts: Product[] = [...source].sort((a, b) =>
  Number(b.group === 'mini-pies') - Number(a.group === 'mini-pies')
).map(item => {
  const wholeCake = (item.group === 'desserts' && item.name.startsWith('Торт')) || item.name === 'Флай Зимняя вишня';
  const bulkDough = item.group === 'dough' && item.packCount === 1;
  const onlyWhole = wholeCake || bulkDough || item.priceFrom || item.name.startsWith('Хлебная корзина');
  // Consumer bundles are planned formats. Purchase always uses the factory pack.
  const sizes = onlyWhole ? [item.packCount] : item.group === 'mini-pies' ? [1, 5, item.packCount]
    : [...new Set([item.unitWeightG <= 40 ? 10 : 4, item.packCount])];
  const variants = sizes.map(count => {
    const value = count === item.packCount ? item.packWeightG : count * item.unitWeightG;
    const inbound = item.group === 'dough' ? value / 1000 * pricingModel.inboundPerKgDough : count * pricingModel.inboundPerPiece;
    const calculation = estimatePrice(item.packPrice * count / item.packCount, inbound);
    return { value, label: wholeCake ? `Целый · ${weightLabel(value)}` : bulkDough ? `${weightLabel(value)}` : `${count} шт. · ${weightLabel(value)}`, price: calculation.price };
  });
  const form = item.group === 'bake' || item.group === 'dough' ? 'Замороженные заготовки для выпечки'
    : item.group === 'bread' ? 'Замороженная выпечка; подготовка по инструкции производителя' : 'Готовый замороженный продукт';
  return {
    id: item.id, name: item.name, description: form, category: item.group as Product['category'],
    kind: 'bakery', unit: 'g', variants, defaultVariant: variants[item.group === 'mini-pies' ? 1 : 0].value,
    slug: item.id, prices: Object.fromEntries(variants.map(v => [v.value, v.price])), priceStatus: 'draft',
    supplier: { name: 'Holland Bakery', url: item.sourceUrl, packLabel: item.sourceLabel,
      group: item.group, priceFrom: item.priceFrom, form },
  };
});

export { source as supplierSource };
