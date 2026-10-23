export const cities = ['Зеленоградск', 'Калининград', 'Светлогорск'] as const;

export type ProductKind = 'pie' | 'drink' | 'accessory';
export type ProductUnit = 'g' | 'ml' | 'pcs';
export type ProductCategory = 'meat' | 'fish' | 'cabbage' | 'cheese' | 'sweet' | 'drinks' | 'accessories';
export type ProductBadgeKind = 'hearty' | 'sweet' | 'tea' | 'vegetable' | 'cheese' | 'refreshing' | 'promotion' | 'bestseller';
export type ProductVariant = { value: number; label: string; price: number };

/** JSON-safe catalog data. Images stay in ProductVisual, outside browser/order data. */
export type Product = {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  kind: ProductKind;
  unit: ProductUnit;
  variants: ProductVariant[];
  defaultVariant: number;
  slug: string;
  prices: Record<number, number>;
  priceStatus: 'draft';
  badge?: ProductBadgeKind;
  visualKey?: string;
};

type ProductDraft = Omit<Product, 'prices' | 'priceStatus'>;
const draftProduct = (product: ProductDraft): Product => ({
  ...product,
  prices: Object.fromEntries(product.variants.map(({ value, price }) => [value, price])),
  priceStatus: 'draft',
});
const pieVariants = (small: number, large: number): ProductVariant[] => [
  { value: 500, label: '500 г', price: small },
  { value: 1000, label: '1 кг', price: large },
];
const morsVariants = (): ProductVariant[] => [
  { value: 500, label: '500 мл', price: 200 },
  { value: 1000, label: '1 л', price: 350 },
];

// Working prices only: production, final recipes and costs have not been agreed.
export const products: Product[] = [
  draftProduct({ id: 'meat', name: 'Мясной пирог', description: 'Сочная мясная начинка', category: 'meat', kind: 'pie', unit: 'g', variants: pieVariants(690, 1290), defaultVariant: 500, slug: 'myasnoy-pirog', badge: 'hearty', visualKey: 'meat' }),
  draftProduct({ id: 'fish', name: 'Рыбный пирог', description: 'Нежная рыбная начинка', category: 'fish', kind: 'pie', unit: 'g', variants: pieVariants(790, 1490), defaultVariant: 500, slug: 'rybnyy-pirog', badge: 'hearty', visualKey: 'fish' }),
  draftProduct({ id: 'cabbage', name: 'Пирог с капустой', description: 'Мягкая тушёная капуста', category: 'cabbage', kind: 'pie', unit: 'g', variants: pieVariants(390, 690), defaultVariant: 500, slug: 'pirog-s-kapustoy', badge: 'vegetable', visualKey: 'cabbage' }),
  draftProduct({ id: 'cheese', name: 'Сырный пирог', description: 'Мягкая сырная начинка', category: 'cheese', kind: 'pie', unit: 'g', variants: pieVariants(590, 1090), defaultVariant: 500, slug: 'syrnyy-pirog', badge: 'cheese', visualKey: 'cheese' }),
  draftProduct({ id: 'apple', name: 'Пирог с яблоком и брусникой', description: 'Сладкое яблоко, кислинка брусники', category: 'sweet', kind: 'pie', unit: 'g', variants: pieVariants(490, 890), defaultVariant: 500, slug: 'pirog-s-yablokom-i-brusnikoy', badge: 'sweet', visualKey: 'apple' }),
  draftProduct({ id: 'cherry', name: 'Пирог с вишней', description: 'Сочная вишнёвая начинка', category: 'sweet', kind: 'pie', unit: 'g', variants: pieVariants(590, 1090), defaultVariant: 500, slug: 'pirog-s-vishney', badge: 'sweet', visualKey: 'cherry' }),
  draftProduct({ id: 'curd', name: 'Пирог с творогом и малиной', description: 'Нежный творог и яркая малина', category: 'sweet', kind: 'pie', unit: 'g', variants: pieVariants(590, 1090), defaultVariant: 500, slug: 'pirog-s-tvorogom-i-malinoy', badge: 'tea', visualKey: 'curd' }),
];

export const extras: Product[] = [
  draftProduct({ id: 'cranberry', name: 'Клюквенный морс', description: 'Ягодный вкус с приятной кислинкой', category: 'drinks', kind: 'drink', unit: 'ml', variants: morsVariants(), defaultVariant: 500, slug: 'klyukvennyy-mors', badge: 'refreshing', visualKey: 'cranberry' }),
  draftProduct({ id: 'seabuckthorn', name: 'Облепиховый морс', description: 'Яркая облепиха к любимому пирогу', category: 'drinks', kind: 'drink', unit: 'ml', variants: morsVariants(), defaultVariant: 500, slug: 'oblepikhovyy-mors', badge: 'refreshing', visualKey: 'seabuckthorn' }),
  draftProduct({ id: 'tea', name: 'Чай', description: 'Чашка чая к сладкому или сытному', category: 'drinks', kind: 'drink', unit: 'ml', variants: [{ value: 250, label: '250 мл', price: 100 }], defaultVariant: 250, slug: 'chay', visualKey: 'tea' }),
  draftProduct({ id: 'coffee', name: 'Кофе', description: 'К чашке кофе — кусочек пирога', category: 'drinks', kind: 'drink', unit: 'ml', variants: [{ value: 250, label: '250 мл', price: 160 }], defaultVariant: 250, slug: 'kofe', visualKey: 'coffee' }),
  draftProduct({ id: 'water', name: 'Питьевая вода', description: 'Без газа', category: 'drinks', kind: 'drink', unit: 'ml', variants: [{ value: 500, label: '500 мл', price: 80 }], defaultVariant: 500, slug: 'pitevaya-voda', visualKey: 'water' }),
  draftProduct({ id: 'tableware', name: 'Набор посуды', description: 'Тарелка, вилка и салфетка на одного гостя', category: 'accessories', kind: 'accessory', unit: 'pcs', variants: [{ value: 1, label: '1 набор', price: 35 }], defaultVariant: 1, slug: 'nabor-posudy' }),
];

export const catalog: Product[] = [...products, ...extras];

// These filters belong to the pie section; ExtrasSection has its own heading.
export const filters = [
  ['all', 'Все'], ['meat', 'Мясо'], ['fish', 'Рыба'], ['cabbage', 'Капуста'], ['cheese', 'Сыр'], ['sweet', 'Сладкие'],
] as const;
