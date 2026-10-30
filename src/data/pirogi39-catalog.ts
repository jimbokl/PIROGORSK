import source from './pirogi39-source.json' with { type: 'json' };
import type { Product } from './catalog.ts';
import { productDescriptions } from './product-descriptions.ts';
import { estimatePrice } from './pricing.ts';

export const freshPricingModel = { pickupDiscount: 0.10, inboundPerPie: 60 } as const;
export const freshGroups = [
  ['all', 'Все пироги'], ['hearty-pies', 'Сытные'], ['sweet-pies', 'Сладкие'],
  ['siberian-pies', 'Сибирские'], ['kurniki', 'Курники'], ['prussian-pies', 'Прусские'], ['ossetian-pies', 'Осетинские'],
] as const;
export const freshPurchasePrice = (variant: { price: number; regularPrice: number | null }) =>
  variant.regularPrice && variant.regularPrice > variant.price ? variant.price : Math.round(variant.price * (1 - freshPricingModel.pickupDiscount) * 100) / 100;
const weightLabel = (g: number) => g < 1000 ? `${g} г` : `${(g / 1000).toLocaleString('ru-RU')} кг`;
export const freshProducts: Product[] = source.map(item => {
  const variants = item.variants.map(variant => ({ value: variant.weightG, label: `Целый · ${weightLabel(variant.weightG)}`,
    price: estimatePrice(freshPurchasePrice(variant), freshPricingModel.inboundPerPie).price }));
  const form = 'Готовый целый пирог';
  return { id: item.id, name: item.name, description: productDescriptions[item.id] ?? `${form} · ${variants.map(v => weightLabel(v.value)).join(' / ')}`,
    category: item.group as Product['category'], kind: 'bakery', unit: 'g', variants, defaultVariant: variants[0].value,
    slug: item.slug, prices: Object.fromEntries(variants.map(v => [v.value, v.price])), priceStatus: 'draft',
    supplier: { name: 'Пироги а-ля Русс', url: item.sourceUrl, packLabel: item.sourceLabel, group: item.group, priceFrom: false, form },
  };
});
export { source as freshSource };
