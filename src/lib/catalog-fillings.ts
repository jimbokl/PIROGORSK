/** Filling tags describe the named filling, never an allergen or dietary guarantee. */
export const fillingFilters = [
  ['all', 'Все начинки'], ['meat', 'Мясо'], ['poultry', 'Птица'], ['fish', 'Рыба'],
  ['cheese', 'Сыр'], ['vegetables', 'Овощи и грибы'], ['fruit', 'Фрукты и ягоды'],
] as const;
export type Filling = typeof fillingFilters[number][0];
export type Criteria = { query: string; filling: Filling };
export const parseCriteria = (search: string): Criteria => {
  const params = new URLSearchParams(search);
  const value = params.get('filling');
  return { query: (params.get('q') || '').slice(0, 100), filling: fillingFilters.some(([id]) => id === value) ? value as Filling : 'all' };
};
export function productFillings(product: { id: string; name: string; kind: string }): Filling[] {
  if (product.kind === 'drink' || product.kind === 'accessory') return [];
  // Supplier recipes resolve names that do not reveal their actual filling.
  const recipes: Record<string, Filling[]> = {
    'p39-151': ['poultry'],
    'p39-485': ['meat', 'cheese', 'vegetables'],
    'p39-162': ['fish', 'cheese', 'vegetables'],
    'p39-136': ['meat', 'cheese', 'vegetables'],
    'p39-415': ['fruit'],
  };
  if (recipes[product.id]) return [...recipes[product.id]];
  const name = product.name.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');
  const tags: Filling[] = [];
  if (/мяс|говяд|свин|баран|бекон|ветчин|колбас|чизбургер|болоньез/.test(name)) tags.push('meat');
  if (/куриц|курин|цыпл|индей|утк|утин/.test(name)) tags.push('poultry');
  if (/рыб|семг|лосос|палтус|форел|сельд|тунец|тунц|треск|горбуш/.test(name)) tags.push('fish');
  if (/сыр|сулугун|брынз|моцарел|фет[ао]/.test(name)) tags.push('cheese');
  if (/капуст|картоф|гриб|шампиньон|шпинат|брокколи|овощ|тыкв|томат|помидор|свекл|лук|зелень|зеленью|фасол|морков|маслин|базилик/.test(name)) tags.push('vegetables');
  if (/яблок|вишн|брусник|клюкв|малин|клубник|черник|чернич|смородин|ягод|абрикос|персик|груш|сливов|со сливой|сливами|изюм|лимон|лайм|апельсин|банан|манго|ананас|облепих/.test(name)) tags.push('fruit');
  return tags;
}
