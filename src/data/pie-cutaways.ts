import meat from '../../design/pie-cutaways-20261031/meat.png';
import fish from '../../design/pie-cutaways-20261031/fish.png';
import cabbage from '../../design/pie-cutaways-20261031/cabbage.png';
import cheese from '../../design/pie-cutaways-20261031/cheese.png';
import apple from '../../design/pie-cutaways-20261031/apple.png';
import cherry from '../../design/pie-cutaways-20261031/cherry.png';

/** Original alternate illustrations. These do not assert a final production recipe. */
export const pieCutaways = {
  meat: { image: meat, alt: 'Кусочек мясного пирога: крупный срез мясной начинки под золотистой корочкой' },
  fish: { image: fish, alt: 'Кусочек рыбного пирога: рыбная начинка и тонкие слои золотистого теста' },
  cabbage: { image: cabbage, alt: 'Кусочек пирога с капустой: мягкая капустная начинка на срезе' },
  cheese: { image: cheese, alt: 'Кусочек сырного пирога: светлая сырная начинка под румяной корочкой' },
  apple: { image: apple, alt: 'Кусочек пирога с яблоком и брусникой: яблочные кусочки и красные ягоды на срезе' },
  cherry: { image: cherry, alt: 'Кусочек вишнёвого пирога: крупная сочная вишня между слоями теста' },
} as const;

export const pieCutaway = (id: string) => pieCutaways[id as keyof typeof pieCutaways];
