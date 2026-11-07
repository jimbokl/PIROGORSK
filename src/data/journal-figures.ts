import delivery from '../../design/blog-source/reading-20261101/delivery.png';
import picnic from '../../design/blog-source/reading-20261101/picnic.png';
import kitchen from '../../design/blog-source/reading-20261101/kitchen.png';
import svetlogorskBreakfast from '../../design/blog-source/reading-20261107/svetlogorsk-breakfast.png';

import zelenogradskBakery from '../../design/blog-source/reading-20261107/zelenogradsk-bakery-formats.png';
import applePreparation from '../../design/blog-source/reading-20261107/apple-recipe-preparation.png';
import cabbagePreparation from '../../design/blog-source/reading-20261107/cabbage-recipe-preparation.png';

const scenes = {
  delivery: { image: delivery, alt: 'Пирог в крафтовой коробке, чашки и блокнот на деревянном столе у окна с видом на Балтику', caption: 'Для ужина в апартаментах удобно заранее продумать общий стол: еду, напитки и посуду.' },
  picnic: { image: picnic, alt: 'Нарезанный пирог на деревянной доске, чай и ягоды на столе у Балтийского моря', caption: 'Пирог для общего стола: нарежьте порции и подготовьте всё для подачи до начала трапезы.' },
  kitchen: { image: kitchen, alt: 'Золотистый пирог с открытым срезом, скалка, грибы, зелень и ягоды на деревянном столе', caption: 'Тесто, начинка и подача — три детали, из которых складывается впечатление от пирога.' },
};

/** Shared editorial cutaways supplement each article's own unique cover. */
export function journalFigures(slug: string, sectionCount: number, city = false) {
  if (slug === 'zalivnoy-pirog-s-kapustoy-na-kefire') return [
    { image: cabbagePreparation, afterSection: 0, alt: 'Капуста в дуршлаге, нарезанные варёные яйца и отдельная миска с кефирным тестом на деревянном столе', caption: 'Разделите продукты для начинки и теста до замеса. Количества сверяйте с таблицей; иллюстрация показывает этап подготовки.' },
  ];
  if (slug === 'yablochnyy-pirog-v-duhovke') return [
    { image: applePreparation, afterSection: 0, alt: 'Редакционная иллюстрация: яблоки, яйца, миски с мукой и сахаром, венчик и нарезанные яблочные дольки на деревянном столе', caption: 'Подготовьте продукты перед замесом. Количества сверяйте с таблицей; на иллюстрации показан общий набор ингредиентов.' },
  ];
  if (slug === 'gde-pozavtrakat-v-zelenogradske') return [
    { image: svetlogorskBreakfast, afterSection: 2, alt: 'Редакционная иллюстрация завтрака у Балтики: омлет, сырники, каша, круассан и кофе на деревянном столе', caption: 'Разные блюда за одним столом: выбирайте завтрак по меню, времени и своему маршруту. Редакционная иллюстрация.' },
    { ...scenes.picnic, afterSection: Math.min(8, sectionCount - 1), caption: 'Для еды на прогулке заранее продумайте упаковку, напитки и подачу.' },
  ];
  // Keep the earlier cutaways beside their original text when this city guide grows.
  if (slug === 'gde-poest-v-svetlogorske' && sectionCount > 10) return [
    { ...scenes.delivery, afterSection: 1 },
    { ...scenes.picnic, afterSection: 6 },
    { image: svetlogorskBreakfast, afterSection: 10, alt: 'Иллюстрированный семейный завтрак: омлет, сырники, каша и круассан на деревянном столе у окна с видом на Балтику', caption: 'Редакционная иллюстрация, созданная с помощью ИИ. Не фотография конкретного кафе или его блюд.' },
  ];
  if (slug === 'pekarni-i-pirogi-v-zelenogradske' && sectionCount > 4) return [
    { ...scenes.delivery, afterSection: 1 },
    { image: zelenogradskBakery, afterSection: 5, alt: 'Иллюстрированный прилавок приморской пекарни: целый пирог, отдельный кусок, багет, хлеб и вишнёвый штрудель', caption: 'Целое изделие и порция решают разные задачи. Редакционная ИИ-иллюстрация вымышленной пекарни.' },
  ];
  const coastal = /piknik|s-soboy|perevezti|kompaniyu|den-rozhdeniya|kofe-breyk|furshet|chto-pit/.test(slug);
  const atHome = city || /apartament|dostavka|uzhin|obed-v-ofis/.test(slug);
  const primary = atHome ? scenes.delivery : coastal ? scenes.picnic : scenes.kitchen;
  const result = [{ ...primary, afterSection: Math.min(1, sectionCount - 1) }];
  if (sectionCount >= 6) result.push({ ...(coastal ? scenes.delivery : scenes.picnic), afterSection: Math.max(3, Math.floor(sectionCount * .65)) });
  return result;
}
