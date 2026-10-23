import meat from '../../design/assets-source/meat.png';
import fish from '../../design/assets-source/fish.png';
import cabbage from '../../design/assets-source/cabbage.png';
import cheese from '../../design/assets-source/cheese.png';

export const cities = ['Зеленоградск', 'Калининград', 'Светлогорск'] as const;
export const products = [
  { id: 'meat', name: 'Мясной пирог', description: 'Сочная мясная начинка', category: 'meat', image: meat, prices: { 500: 690, 1000: 1290 } },
  { id: 'fish', name: 'Рыбный пирог', description: 'Нежная рыбная начинка', category: 'fish', image: fish, prices: { 500: 790, 1000: 1490 } },
  { id: 'cabbage', name: 'Пирог с капустой', description: 'Тушёная капуста', category: 'cabbage', image: cabbage, prices: { 500: 390, 1000: 690 } },
  { id: 'cheese', name: 'Сырный пирог', description: 'Мягкая сырная начинка', category: 'cheese', image: cheese, prices: { 500: 590, 1000: 1090 } },
] as const;

export const filters = [
  ['all', 'Все'], ['meat', 'Мясо'], ['fish', 'Рыба'], ['cabbage', 'Капуста'], ['cheese', 'Сыр'],
] as const;
