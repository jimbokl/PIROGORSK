/** Match every word, independent of word order, punctuation and Russian ё. */
export function matchesCatalogSearch(text: string, query: string): boolean {
  const normalize = (value: string) => value.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');
  const haystack = normalize(text);
  const words = normalize(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.every(word => haystack.includes(word));
}
