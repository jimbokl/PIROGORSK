// Build-time editorial data. Keep descriptions and artwork out of the order payload.
import { catalog, extras, type Product } from './catalog.ts';
import { supplierProducts, supplierGroups, supplierSource } from './holland-catalog.ts';
import { freshProducts, freshGroups, freshSource } from './pirogi39-catalog.ts';
import freshContent from './pirogi39-content.json' with { type: 'json' };
import content from './supplier-content.json' with { type: 'json' };
import { catalogProductHref } from '../lib/product-paths.ts';

export const newPageProducts = [...supplierProducts, ...extras, ...freshProducts];
export const formatWeight = (g: number) => g < 1000 ? `${g} г` : `${(g / 1000).toLocaleString('ru-RU')} кг`;
const extraCopy: Record<string, { intro: string; serving: string }> = {
  cranberry: { intro: 'Клюквенный морс в двух объёмах: 500 мл и 1 л. Планируем ягодный напиток с кислинкой к сытным и сладким пирогам.', serving: 'Пол-литра можно выбрать для небольшой подборки, литр — для общего стола. Рецепт, количество сахара и условия хранения опубликуем перед продажами.' },
  seabuckthorn: { intro: 'Облепиховый морс в бутылках по 500 мл и 1 л — ягодный вариант напитка к пирогам. Сейчас изучаем интерес к вкусу и объёму.', serving: 'Сравните с клюквенным морсом того же объёма. Состав, сладость и срок хранения пока уточняются.' },
  tea: { intro: 'Чай объёмом 250 мл к пирогу или десерту. Планируем одну порцию напитка; сорт и способ подачи определим к запуску.', serving: 'Удобно добавить по порции на гостя. Вид чая, возможность добавить сахар или молоко и формат стакана ещё не подтверждены.' },
  coffee: { intro: 'Кофе объёмом 250 мл для завтрака или кофе-паузы с выпечкой. На странице указана предварительная цена одной порции.', serving: 'Сочетайте с круассаном, маффином или сырной выпечкой. Тип напитка, зерно и доступные добавки опубликуем перед началом продаж.' },
  water: { intro: 'Питьевая вода объёмом 500 мл как простое дополнение к общей подборке. Марку и вид упаковки уточним перед запуском.', serving: 'Можно предусмотреть отдельную порцию воды для каждого гостя. Газированная или негазированная вода будет в меню — сообщим после выбора поставщика.' },
  tableware: { intro: 'Один набор посуды на гостя: тарелка, вилка и салфетка. Предварительная цена позволяет сразу оценить дополнения к общему столу.', serving: 'Добавляйте по одному набору на человека. Материал, размер тарелки и упаковку определим перед запуском; стакан в заявленный набор не входит.' },
};

export function productPage(product: Product) {
  const fresh = product.id.startsWith('p39-');
  const source = [...supplierSource, ...freshSource].find(item => item.id === product.id);
  const freshFacts = freshContent.find(item => item.id === product.id);
  const facts = freshFacts ?? content.find(item => item.id === product.id);
  const copy = facts ?? extraCopy[product.id]!;
  const duplicate = catalog.filter(item => item.name === product.name).length > 1;
  const heading = fresh ? `${product.name} · ${product.variants.map(v => formatWeight(v.value)).join(' / ')}` : duplicate && source ? `${product.name} · ${source.packCount > 1 ? `${source.unitWeightG} г` : formatWeight(source.packWeightG)}` : product.name;
  const selected = product.variants.find(v => v.value === product.defaultVariant)!;
  const group = [...supplierGroups, ...freshGroups].find(([key]) => key === product.category)?.[1] ?? (product.kind === 'drink' ? 'Напитки' : 'К общему столу');
  const description = `${product.name}. ${product.description}`;
  const prep = fresh ? `Это готовый пирог. ${freshFacts?.storage ? 'Производитель указывает условия хранения: ' + freshFacts.storage + '. ' : ''}Условия получения и температуру при передаче уточним перед продажами; сверяйте маркировку конкретной партии.` : !source ? 'Условия подачи и хранения пока уточняются. Перед началом продаж укажем состав, упаковку и необходимые сведения о продукте.'
    : product.category === 'mini-pies' ? 'Это готовый замороженный пирог. Перед подачей его нужно разморозить и разогреть по инструкции производителя. Доставку горячих пирогов сейчас не предлагаем.'
    : product.category === 'desserts' ? 'Замороженный десерт нужно подготовить заранее по инструкции на упаковке. Время размораживания и срок после него зависят от изделия; сверяйте маркировку конкретной партии.'
    : product.category === 'dough' ? 'Это сырое тесто для самостоятельной выпечки. Размораживание, формовка, необходимость расстойки и режим духовки зависят от типа теста и выбранного изделия. Следуйте инструкции производителя.'
    : product.category === 'bread' ? 'Хлеб поставляется замороженным: в ассортименте есть полностью и предварительно выпеченные изделия. Перед подачей подготовьте именно эту позицию по инструкции на упаковке.'
    : facts?.needsProofing ? 'Это сырая дрожжевая заготовка. По описанию производителя, перед выпечкой нужны размораживание и расстойка. Оставьте время на оба этапа и следуйте инструкции на упаковке.'
    : facts?.prebaked ? 'Производитель указывает предварительную выпечку. Замороженное изделие нужно подготовить и при необходимости допечь по его инструкции; это не готовая горячая выпечка.'
    : 'Замороженная заготовка требует выпечки. По описанию производителя, отдельная расстойка не нужна. Размораживайте и выпекайте по инструкции на упаковке.';
  return { source, facts, fresh, heading, selected, group, description, intro: product.description, serving: copy.serving, prep,
    related: newPageProducts.filter(other => other.id !== product.id && other.category === product.category).slice(0, 3),
    href: catalogProductHref(product) };
}
