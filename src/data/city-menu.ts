import { catalog } from './catalog.ts';
import { deliveryEstimates } from './pricing.ts';
import { catalogProductHref } from '../lib/product-paths.ts';

const cityMenus = {
  kaliningrad: {
    city: 'Калининград',
    heading: 'Пироги для общего стола',
    intro: 'Мясные начинки для обеда в офисе или общего стола дома. Сравните вес и состав на отдельных страницах, прежде чем собирать подборку.',
    productIds: ['meat', 'p39-256', 'chicken'],
    occasionSlugs: ['v-ofis-na-den-rozhdeniya', 'furshet-na-korporativ', 'semeynyy-uzhin'],
    faq: [
      { question: 'Можно ли заказать пироги в офис уже сейчас?', answer: 'Пока нет. Можно выбрать начинки и отметить Калининград в анонимной форме. Оплата, пропуска, документы для организации и время приезда курьера пока не согласованы.' },
      { question: 'Есть ли бесплатная или круглосуточная доставка?', answer: 'Таких условий сейчас нет. В расчёте используем предварительные 350 ₽ на всю подборку; район, часы и окончательный тариф подтвердим до начала заказов.' },
    ],
  },
  zelenogradsk: {
    city: 'Зеленоградск',
    heading: 'Ужин в апартаментах, сладкое к чаю',
    intro: 'Для вечера после прогулки — сырные и сладкие начинки. В полном меню есть и готовая выпечка, и замороженные заготовки: проверяйте формат на странице позиции.',
    productIds: ['cheese', 'p39-249', 'apple'],
    occasionSlugs: ['uzhin-v-apartamentah', 'semeynyy-uzhin', 'eda-na-kurshskuyu-kosu'],
    faq: [
      { question: 'Можно ли привезти пироги к заселению в апартаменты?', answer: 'Время к заселению пока не подтверждаем. После запуска потребуется согласовать адрес и точку встречи с хозяином жилья. Сейчас форма фиксирует только интерес к городу и начинкам.' },
      { question: 'Входит ли Куршская коса в доставку по Зеленоградску?', answer: 'Нет подтверждённого маршрута ни по городу, ни на косу. Предварительные 500 ₽ относятся к расчёту по Зеленоградску; для косы понадобятся отдельные условия.' },
    ],
  },
  svetlogorsk: {
    city: 'Светлогорск',
    heading: 'К ужину после моря',
    intro: 'Рыбный пирог, овощная начинка или вишня к чаю — несколько отправных точек для ужина в жилье. Упаковку и условия хранения нужно будет проверить у выбранного продукта.',
    productIds: ['fish', 'p39-245', 'cherry'],
    occasionSlugs: ['uzhin-v-apartamentah', 'semeynyy-uzhin', 'v-ofis-na-den-rozhdeniya'],
    faq: [
      { question: 'Можно ли встретить курьера у пляжа или на променаде?', answer: 'Такой услуги пока нет. Для гостиницы или апартаментов после запуска понадобится проверить зону доставки и правила передачи еды в месте проживания.' },
      { question: 'Почему расчёт доставки отличается от Калининграда?', answer: 'Для Светлогорска заложен отдельный предварительный ориентир — 650 ₽ на всю подборку. Это не тариф курьера: маршрут, интервалы и доступные адреса ещё предстоит согласовать.' },
    ],
  },
} as const;

export type CityMenuSlug = keyof typeof cityMenus;

/** All displayed prices come from the same catalog as the selection form. */
export function cityMenu(slug: CityMenuSlug) {
  const menu = cityMenus[slug];
  const entries = menu.productIds.map(id => {
    const product = catalog.find(product => product.id === id);
    if (!product) throw new Error(`City menu ${slug}: unknown product ${id}`);
    const variant = product.variants.find(variant => variant.value === product.defaultVariant);
    if (!variant) throw new Error(`City menu ${slug}: missing default variant ${id}`);
    return { product, variant, href: catalogProductHref(product) };
  });
  const example = [entries[0], entries[2]];
  const subtotal = example.reduce((sum, entry) => sum + entry.variant.price, 0);
  const delivery = deliveryEstimates[menu.city];
  return { ...menu, entries, example, subtotal, delivery, total: subtotal + delivery };
}
