import delivery from '../../design/blog-source/reading-20261101/delivery.png';
import picnic from '../../design/blog-source/reading-20261101/picnic.png';
import kitchen from '../../design/blog-source/reading-20261101/kitchen.png';

const scenes = {
  delivery: { image: delivery, alt: 'Пирог в крафтовой коробке, чашки и блокнот на деревянном столе у окна с видом на Балтику', caption: 'Для ужина в апартаментах удобно заранее продумать общий стол: еду, напитки и посуду.' },
  picnic: { image: picnic, alt: 'Нарезанный пирог на деревянной доске, чай и ягоды на столе у Балтийского моря', caption: 'Пирог для общего стола: нарежьте порции и подготовьте всё для подачи до начала трапезы.' },
  kitchen: { image: kitchen, alt: 'Золотистый пирог с открытым срезом, скалка, грибы, зелень и ягоды на деревянном столе', caption: 'Тесто, начинка и подача — три детали, из которых складывается впечатление от пирога.' },
};

/** Shared editorial cutaways supplement each article's own unique cover. */
export function journalFigures(slug: string, sectionCount: number, city = false) {
  const coastal = /piknik|s-soboy|perevezti|kompaniyu|den-rozhdeniya|kofe-breyk|furshet|chto-pit/.test(slug);
  const atHome = city || /apartament|dostavka|uzhin|obed-v-ofis/.test(slug);
  const primary = atHome ? scenes.delivery : coastal ? scenes.picnic : scenes.kitchen;
  const result = [{ ...primary, afterSection: Math.min(1, sectionCount - 1) }];
  if (sectionCount >= 6) result.push({ ...(coastal ? scenes.delivery : scenes.picnic), afterSection: Math.max(3, Math.floor(sectionCount * .65)) });
  return result;
}
