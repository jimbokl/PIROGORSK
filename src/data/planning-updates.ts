import { catalog, products } from './catalog.ts';
import { planPies } from '../lib/pie-planner.ts';
import type { ArticleSource, BlogSection } from './blog-articles';

const money = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;
const product = (id: string) => {
  const item = catalog.find(item => item.id === id);
  if (!item) throw new Error(`Unknown editorial product: ${id}`);
  return item;
};
const price = (id: string, value: number) => {
  const variant = product(id).variants.find(variant => variant.value === value);
  if (!variant) throw new Error(`Unknown editorial variant: ${id}:${value}`);
  return variant.price;
};
const productLink = (id: string) => {
  const item = product(id);
  return { href: `/${item.kind === 'pie' ? 'pirogi' : 'catalog'}/${item.slug}/`, title: item.name };
};

/** The table uses the same rounding and supported formats as the live calculator. */
export const portionTableRows = Array.from({ length: 14 }, (_, index) => {
  const guests = index + 2;
  return [String(guests), ...[150, 250, 350].map(grams =>
    `${(planPies(guests, grams, ['apple'], products).weight / 1000).toLocaleString('ru-RU')} кг`)];
});

export const breakfastExamples = [
  { guests: 2, pies: [{ id: 'apple', value: 500 }] },
  { guests: 4, pies: [{ id: 'cheese', value: 500 }, { id: 'apple', value: 500 }] },
  { guests: 6, pies: [{ id: 'cheese', value: 1000 }, { id: 'apple', value: 500 }] },
].map(example => ({
  ...example,
  pieWeight: example.pies.reduce((sum, item) => sum + item.value, 0),
  piePrice: example.pies.reduce((sum, item) => sum + price(item.id, item.value), 0),
  total: example.pies.reduce((sum, item) => sum + price(item.id, item.value), 0)
    + example.guests * (price('tea', 250) + price('tableware', 1)),
}));

interface PlanningUpdate {
  ownerURL: string;
  modified: string;
  sections: BlogSection[];
  sources: ArticleSource[];
}
const checked = '2026-11-02';
const catalogSource = { href: '/menu/', title: 'Меню Пирогорска: форматы, описания и цены для расчёта', checked };

export const planningUpdates: PlanningUpdate[] = [
  {
    ownerURL: '/journal/skolko-piroga-na-cheloveka/', modified: checked,
    sections: [{
      title: 'Открыть расчёт на 2, 6 или 15 гостей',
      paragraphs: [
        'В этих примерах заложено по 250 г на человека. На двоих получается 500 г, на шестерых — 1,5 кг, на пятнадцать гостей — 4 кг после округления. Это весь вес пирогов: если сладкий входит в него, прибавлять десерт второй раз не нужно.',
        'Ссылка переносит число гостей и порцию в калькулятор. Там можно выбрать другие начинки, изменить вес на человека и увидеть конкретные форматы и сумму. После перехода в подборку количество каждой позиции остаётся редактируемым.',
        'Таблица и калькулятор считают форматы 500 г и 1 кг из раздела «Наши пироги». У целых пирогов из других разделов свой вес: сравнивайте его с нужной общей массой, а не с числом коробок в примере.',
      ],
      links: [2, 6, 15].map(guests => ({ href: `/podbor/?guests=${guests}&grams=250`, title: `Рассчитать на ${guests} гостей · по 250 г` })),
    }],
    sources: [{ href: '/podbor/', title: 'Калькулятор Пирогорска: гости × порция, округление до 500 г', checked }, catalogSource],
  },
  {
    ownerURL: '/journal/pirogi-na-kofe-breyk/', modified: checked,
    sections: [
      {
        title: 'Домашний завтрак: пирог, напиток и посуда',
        paragraphs: [
          'Для завтрака дома или в апартаментах начните с того, что уже есть на кухне. Если есть чайник, чашки и тарелки, достаточно выбрать пирог: напитки и одноразовую посуду добавлять необязательно. Если завтракаете на прогулке, удобнее заранее посчитать их по числу участников.',
          'Сырный пирог даёт солоноватый акцент, яблоко с брусникой — фруктовую кислинку. Их можно сочетать в одной подборке или оставить только сладкий вариант к чаю. Сначала уточните начинки у всех за столом; перечисление вкусов не заменяет проверку полного состава при аллергии.',
          'Ниже — три примера по 250 г пирога на человека. Это выбранный вес для расчёта, который можно уменьшить или увеличить под свой завтрак. Миллилитры напитка и количество посуды в массу пирогов не включены.',
        ],
        table: {
          caption: 'Примеры завтрака: пироги, чай 250 мл и набор посуды на каждого гостя',
          headers: ['Гостей', 'Пироги', 'Только пироги', 'С чаем и посудой'],
          rows: breakfastExamples.map(example => [
            String(example.guests),
            example.pies.map(item => `${product(item.id).name} · ${item.value === 1000 ? '1 кг' : '500 г'}`).join(' + '),
            money(example.piePrice), money(example.total),
          ]),
        },
      },
      {
        title: 'Как изменить завтрак под себя',
        paragraphs: [
          `В примерах чашка чая стоит ${money(price('tea', 250))}, набор посуды на одного человека — ${money(price('tableware', 1))}. Суммы берутся из меню при обновлении сайта; доставка считается отдельно. В калькуляторе сначала подберите пироги, а напитки и посуду добавьте в общей подборке.`,
          'Для двух гостей показан яблочный пирог 500 г. Для четырёх — сырный и яблочный по 500 г. Для шести — сырный 1 кг и яблочный 500 г. Разные размеры позволяют менять сочетание, не добавляя целый лишний килограмм ради второго вкуса.',
          'Если берёте пирог на следующее утро, проверьте инструкцию на упаковке, возможность хранения и разогрева в месте проживания. Замороженное изделие сначала готовят по инструкции изготовителя; оно не равно готовому завтраку. Ранний интервал получения нужно уточнять отдельно.',
        ],
        links: [productLink('cheese'), productLink('apple'), { href: '/podbor/?guests=4&grams=250', title: 'Рассчитать вес пирогов на четверых' }, { href: '/journal/kak-hranit-pirogi/', title: 'Хранение пирогов: что проверить заранее' }],
      },
    ],
    sources: [catalogSource, { href: '/catalog/chay/', title: 'Чай: объём и цена', checked }, { href: '/catalog/nabor-posudy/', title: 'Набор посуды: состав на одного гостя и цена', checked }],
  },
  {
    ownerURL: '/journal/sladkie-pirogi-k-chayu/', modified: checked,
    sections: [
      {
        title: 'Брусника, облепиха и марципан: разные роли за столом',
        paragraphs: [
          'Брусника сочетается со сладким яблоком или мягкой сметанной заливкой. В первом случае получается фруктовая начинка с ягодной кислинкой, во втором — более нежное сочетание ягоды и крема. В меню есть оба направления, но это разные изделия и разные форматы.',
          'Облепиха в нашем ассортименте представлена морсом. Его можно поставить рядом с пирогом как отдельный напиток; пирога с облепиховой начинкой в текущем меню нет. Чтобы сравнение было честным, выбирайте отдельно вкус выпечки и отдельно то, чем будете её запивать.',
          'Марципан — ещё одна тема балтийского чаепития, но изделия с марципаном сейчас не входят в меню Пирогорска. Если планируете добавить его отдельно, проверьте состав выбранного продукта: миндаль важен для гостей с ограничениями по орехам.',
        ],
        table: {
          caption: 'Сладкие варианты из текущего меню: вкус, формат и цена',
          headers: ['Позиция', 'Формат', 'Цена'],
          rows: [['apple', 500], ['apple', 1000], ['curd', 500], ['p39-366', 1600]].map(([id, value]) => {
            const item = product(String(id));
            const variant = item.variants.find(variant => variant.value === value)!;
            return [item.name, variant.label, money(variant.price)];
          }),
        },
        links: [productLink('apple'), productLink('p39-366'), { href: '/journal/kenigsbergskiy-martsipan/', title: 'Марципан в Калининграде: отдельный гид' }],
      },
      {
        title: 'Два вкуса к чаю: пример на четверых',
        paragraphs: [
          `Яблочный пирог с брусникой 500 г и пирог с творогом и малиной 500 г дают 1 кг выпечки за ${money(price('apple', 500) + price('curd', 500))}. Если разделить поровну на четверых, получится по 250 г пирога. Это пример распределения, а не обязательная порция.`,
          `Можно разрезать каждый пирог на четыре части, чтобы каждому достался кусочек обоих вкусов. Четыре чашки чая по 250 мл добавят ${money(4 * price('tea', 250))}; вместе с пирогами получится ${money(price('apple', 500) + price('curd', 500) + 4 * price('tea', 250))} без доставки. Если чай завариваете дома, считайте только выпечку.`,
          `Вместо чая можно выбрать облепиховый морс: 1 л за ${money(price('seabuckthorn', 1000))}, по 250 мл на четверых. Это замена напитка в примере, а не обязательное дополнение к заказу. Формат, количество и состав подборки можно изменить.`,
        ],
        links: [productLink('curd'), productLink('seabuckthorn'), { href: '/podbor/?guests=4&grams=250', title: 'Рассчитать вес пирогов для своего чаепития' }],
      },
    ],
    sources: [catalogSource, ...['apple', 'curd', 'p39-366', 'seabuckthorn'].map(id => ({ ...productLink(id), checked }))],
  },
];
