export const foodGuide = {
  slug: 'gde-poest-v-zelenogradske',
  title: 'Где поесть в Зеленоградске: меню и цены на четверых',
  description: 'Два кафе Зеленоградска, четыре блюда из официальных меню и расчёт на четверых. Цены, адреса, размеры порций и ссылки на источники: проверка 24 октября 2026.',
  checkedAt: '2026-10-24',
  checkedLabel: '24 октября 2026',
} as const;

interface MenuDish {
  name: string;
  priceRub: number;
  weightGrams?: number;
}

interface MenuVenue {
  id: string;
  name: string;
  address: string;
  note: string;
  website: string;
  menuUrl: string;
  sourceNote: string;
  dishes: readonly MenuDish[];
}

// Observed on the venues' own published menus, not an estimate of a restaurant bill.
// Keep the observation date and source alongside the facts when refreshing prices.
export const menuVenues: readonly MenuVenue[] = [
  {
    id: 'gnezdo',
    name: 'Гнездо',
    address: 'Зеленоградск, прибрежная полоса в районе п. Малиновка',
    note: 'Вариант для прогулки у моря. Для расчёта взяли две кесадильи из меню нижнего яруса: рыбную и овощную.',
    website: 'https://gnezdo.cafe/',
    menuUrl: 'https://gnezdo.cafe/#popup:infoblo',
    sourceNote: 'На сайте откройте «Меню» в блоке «Рыбный гриль», затем второй лист «Нижний ярус».',
    dishes: [
      { name: 'Кесадилья со скумбрией', priceRub: 520, weightGrams: 280 },
      { name: 'Кесадилья с кабачками', priceRub: 420, weightGrams: 280 },
    ],
  },
  {
    id: 'dacha',
    name: 'Дача',
    address: 'Зеленоградск, ул. Володарского, 32',
    note: 'Вариант с пастой или горячим с гарниром. В примерах — «Карбонара» и куриная котлета с кускусом.',
    website: 'https://kafeymoryadacha.tilda.ws/',
    menuUrl: 'https://kafeymoryadacha.tilda.ws/menu',
    sourceNote: 'Разделы «Пасты и домашние пельмени» и «Блюда из птицы». Вес этих порций в списке меню не указан.',
    dishes: [
      { name: 'Паста «Карбонара»', priceRub: 690 },
      { name: 'Куриная котлета «по-пожарски» с кускусом', priceRub: 790 },
    ],
  },
];
