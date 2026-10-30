import { catalog } from './catalog.ts';
import { deliveryEstimates } from './pricing.ts';
import { catalogProductHref, selectionHref } from '../lib/product-paths.ts';

const cityMenus = {
  kaliningrad: {
    categoriesTitle: 'Выберите пироги для дома или офиса',
    categories: [
      { href: '/menu/#pirogi39', title: 'Целые сытные пироги', text: 'Мясо, курица, рыба и овощи: сравните начинки и вес для обеда или общего стола.', label: 'Основное блюдо' },
      { href: '/menu/#holland', title: 'Мини-пироги и выпечка', text: 'Порционные форматы для компании. В этой линейке есть замороженные продукты и заготовки.', label: 'Порционные форматы' },
      { href: '/menu/#extras', title: 'Морс и посуда к столу', text: 'Напитки и наборы посуды на гостей можно добавить к пирогам в общую подборку.', label: 'В офис и домой' },
    ],
    city: 'Калининград',
    heading: 'Пироги для общего стола',
    intro: 'Мясные начинки для обеда в офисе или общего стола дома. Сравните вес и состав на отдельных страницах, прежде чем собирать подборку.',
    productIds: ['meat', 'p39-256', 'chicken'],
    occasionSlugs: ['v-ofis-na-den-rozhdeniya', 'furshet-na-korporativ', 'semeynyy-uzhin'],
    faq: [
      { question: 'Как сравнить цены на пироги в Калининграде?', answer: 'В карточках показана цена выбранного веса, а в примере ниже — сумма двух пирогов и 350 ₽ доставки на всю подборку. Все суммы предварительные. Изменить начинки, количество и город можно в подборке.' },
      { question: 'Можно ли заказать пироги в офис уже сейчас?', answer: 'Пока нет. Можно выбрать начинки и отметить Калининград в анонимной форме. Оплата, пропуска, документы для организации и время приезда курьера пока не согласованы.' },
      { question: 'Есть ли бесплатная или круглосуточная доставка?', answer: 'Таких условий сейчас нет. В расчёте используем предварительные 350 ₽ на всю подборку; район, часы и окончательный тариф подтвердим до начала заказов.' },
    ],
  },
  zelenogradsk: {
    categoriesTitle: 'Что взять к ужину в Зеленоградске',
    categories: [
      { href: '/menu/#pirogi39', title: 'Целые пироги к ужину', text: 'Сытные и сладкие начинки для общего стола в апартаментах. Вес указан у каждой позиции.', label: 'Готовые целые пироги' },
      { href: '/pirogi/pirog-s-yablokom-i-brusnikoy/', title: 'Яблоко и брусника к чаю', text: 'Сладкая идея Пирогорска в форматах 500 г и 1 кг. Рецепт ещё разрабатывается.', label: 'Сладкий пирог' },
      { href: '/menu/#extras', title: 'Морс и посуда для гостей', text: 'Если в жилье мало посуды, добавьте наборы на нужное число гостей; морс — по желанию.', label: 'К общему столу' },
    ],
    city: 'Зеленоградск',
    heading: 'Ужин в апартаментах, сладкое к чаю',
    intro: 'Для вечера после прогулки — сырные и сладкие начинки. В полном меню есть и готовая выпечка, и замороженные заготовки: проверяйте формат на странице позиции.',
    productIds: ['cheese', 'p39-249', 'apple'],
    occasionSlugs: ['uzhin-v-apartamentah', 'semeynyy-uzhin', 'eda-na-kurshskuyu-kosu'],
    faq: [
      { question: 'Как выбрать пироги на ужин в Зеленоградске?', answer: 'Начните с числа гостей и начинок: сытный пирог к основному столу, сладкий — к чаю. В каталоге есть разные веса; калькулятор порций поможет сравнить количество. До выбора замороженного продукта проверьте технику для разогрева в апартаментах.' },
      { question: 'Можно ли привезти пироги к заселению в апартаменты?', answer: 'Время к заселению пока не подтверждаем. После запуска потребуется согласовать адрес и точку встречи с хозяином жилья. Сейчас форма фиксирует только интерес к городу и начинкам.' },
      { question: 'Входит ли Куршская коса в доставку по Зеленоградску?', answer: 'Нет подтверждённого маршрута ни по городу, ни на косу. Предварительные 500 ₽ относятся к расчёту по Зеленоградску; для косы понадобятся отдельные условия.' },
    ],
  },
  svetlogorsk: {
    categoriesTitle: 'Соберите ужин после моря',
    categories: [
      { href: '/pirogi/rybnyy-pirog/', title: 'Рыбный пирог к общему столу', text: 'Идея начинки с рыбой: сравните форматы 500 г и 1 кг и пожелания компании.', label: 'Сытный пирог' },
      { href: '/menu/#pirogi39', title: 'Готовые целые пироги', text: 'Варианты для ужина в жилье. Условия хранения и состав смотрите на странице продукта.', label: 'Для ужина в помещении' },
      { href: '/menu/#holland', title: 'Осетинские мини-пироги', text: 'Для жилья с подходящей техникой: в линейке есть готовые замороженные изделия, которые нужно разогреть.', label: 'Проверьте формат продукта' },
    ],
    city: 'Светлогорск',
    heading: 'К ужину после моря',
    intro: 'Рыбный пирог, овощная начинка или вишня к чаю — несколько отправных точек для ужина в жилье. Упаковку и условия хранения нужно будет проверить у выбранного продукта.',
    productIds: ['fish', 'p39-245', 'cherry'],
    occasionSlugs: ['uzhin-v-apartamentah', 'semeynyy-uzhin', 'v-ofis-na-den-rozhdeniya'],
    faq: [
      { question: 'Где посмотреть меню и цены пирогов для Светлогорска?', answer: 'Начинки и предварительные цены есть в каталоге и подборке на этой странице. Пример бюджета учитывает два пирога и 650 ₽ доставки один раз. Это расчёт интереса: приём заказов в Светлогорске пока не открыт.' },
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
    const selection = new URL(selectionHref(product, variant.value), 'https://pirogorsk.ru');
    selection.searchParams.set('city', slug);
    return { product, variant, href: catalogProductHref(product), selectionHref: selection.pathname + selection.search + selection.hash };
  });
  const example = [entries[0], entries[2]];
  const subtotal = example.reduce((sum, entry) => sum + entry.variant.price, 0);
  const delivery = deliveryEstimates[menu.city];
  return { ...menu, entries, example, subtotal, delivery, total: subtotal + delivery };
}
