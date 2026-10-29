// Compositions refer to existing variants; no separate bundle SKU or discount.
export const bundles = [
  { id: 'dinner', title: 'Ужин в апартаментах', note: 'Идеи Пирогорска · рецепты в разработке', href: '/nabor/uzhin-v-apartamentah/', items: [{ id: 'meat', value: 500, quantity: 1 }, { id: 'cheese', value: 500, quantity: 1 }] },
  { id: 'company', title: 'На компанию', note: 'Идеи Пирогорска · рецепты в разработке', href: '/nabor/na-kompaniyu/', items: [{ id: 'meat', value: 1000, quantity: 1 }, { id: 'fish', value: 1000, quantity: 1 }, { id: 'cabbage', value: 1000, quantity: 1 }] },
  { id: 'sweet-table', title: 'Сытное и сладкое', note: 'Пироги а-ля Русс · целые пироги', href: '/menu/#pirogi39', items: [{ id: 'p39-10', value: 1200, quantity: 1 }, { id: 'p39-110', value: 1200, quantity: 1 }] },
];

export const addOnGroups = [
  { id: 'morse', title: 'Морс к пирогам', description: 'Клюква или облепиха, 500 мл или 1 л.', imageId: 'cranberry', choices: ['cranberry', 'seabuckthorn'].flatMap(id => [500, 1000].map(value => ({ id, value, quantity: 1 }))) },
  { id: 'sweet', title: 'Пирог к чаю', description: 'Небольшой сладкий пирог к сытному столу.', imageId: 'apple', choices: ['apple', 'cherry', 'curd'].map(id => ({ id, value: 500, quantity: 1 })) },
  { id: 'tableware', title: 'Посуда для гостей', description: 'Тарелка, вилка и салфетка каждому.', imageId: 'tableware', choices: [1, 5, 10].map(quantity => ({ id: 'tableware', value: 1, quantity })) },
];
