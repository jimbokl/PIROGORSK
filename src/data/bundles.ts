// Compositions refer to existing variants; no separate bundle SKU or discount.
export const bundles = [
  { id: 'dinner', title: 'Ужин в апартаментах', intro: 'Мясной и сырный пироги для спокойного вечера за одним столом. Два вкуса по 500 г: удобно разделить и попробовать оба.', note: 'Идеи Пирогорска · рецепты в разработке', href: '/nabor/uzhin-v-apartamentah/', items: [{ id: 'meat', value: 500, quantity: 1 }, { id: 'cheese', value: 500, quantity: 1 }] },
  { id: 'company', title: 'На компанию', intro: 'Мясо, рыба и капуста — три сытных вкуса для общего стола. По килограмму каждого пирога, чтобы гостям было из чего выбрать.', note: 'Идеи Пирогорска · рецепты в разработке', href: '/nabor/na-kompaniyu/', items: [{ id: 'meat', value: 1000, quantity: 1 }, { id: 'fish', value: 1000, quantity: 1 }, { id: 'cabbage', value: 1000, quantity: 1 }] },
  { id: 'sweet-table', title: 'Сытное и сладкое', intro: 'Пирог с куриным филе к основному столу и творожный с изюмом к чаю. Два целых пирога по 1,2 кг для встречи, которая плавно переходит в десерт.', note: 'Пироги а-ля Русс · целые пироги', href: '/nabor/sytnoe-i-sladkoe/', items: [{ id: 'p39-10', value: 1200, quantity: 1 }, { id: 'p39-110', value: 1200, quantity: 1 }] },
  { id: 'office', title: 'Обед в офисе', intro: 'Куриное филе и капуста — два целых пирога по 1,2 кг для обеда с коллегами. Сытное сочетание, которое удобно нарезать и поставить в центр стола.', note: 'Курица и капуста · два сытных вкуса', href: '/nabor/obed-v-ofise/', items: [{ id: 'p39-10', value: 1200, quantity: 1 }, { id: 'p39-99', value: 1200, quantity: 1 }] },
  { id: 'birthday', title: 'Ко дню рождения', intro: 'Пироги с куриным филе и капустой для начала встречи, вишнёвый — к чаю. Три целых пирога для праздничного стола с сытной и сладкой частью.', note: 'Два сытных пирога и вишня к чаю', href: '/nabor/ko-dnyu-rozhdeniya/', items: [{ id: 'p39-10', value: 1200, quantity: 1 }, { id: 'p39-99', value: 1200, quantity: 1 }, { id: 'p39-482', value: 1300, quantity: 1 }] },
];

export const addOnGroups = [
  { id: 'morse', title: 'Морс к пирогам', description: 'Клюква или облепиха, 500 мл или 1 л.', imageId: 'cranberry', choices: ['cranberry', 'seabuckthorn'].flatMap(id => [500, 1000].map(value => ({ id, value, quantity: 1 }))) },
  { id: 'sweet', title: 'Пирог к чаю', description: 'Небольшой сладкий пирог к сытному столу.', imageId: 'apple', choices: ['apple', 'cherry', 'curd'].map(id => ({ id, value: 500, quantity: 1 })) },
  { id: 'tableware', title: 'Посуда для гостей', description: 'Тарелка, вилка и салфетка каждому.', imageId: 'tableware', choices: [1, 5, 10].map(quantity => ({ id: 'tableware', value: 1, quantity })) },
];
