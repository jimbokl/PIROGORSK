// Planning examples only. Portions are editable assumptions, not serving norms.
export const occasionPresets = [
  { slug: 'v-ofis-na-den-rozhdeniya', label: 'День рождения в офисе', guests: 12, grams: 250, ids: ['meat', 'cabbage', 'apple'] },
  { slug: 'furshet-na-korporativ', label: 'Фуршет с другими блюдами', guests: 20, grams: 150, ids: ['cheese', 'cabbage', 'cherry'] },
  { slug: 'na-pominki', label: 'Поминальный стол', guests: 12, grams: 250, ids: ['fish', 'cabbage', 'apple'] },
  { slug: 'sytnyj-obed-na-strojku', label: 'Обед для бригады', guests: 8, grams: 400, ids: ['meat', 'cheese'] },
  { slug: 'eda-na-vypisku', label: 'Еда в подарок семье', guests: 4, grams: 250, ids: ['meat', 'apple'] },
  { slug: 'v-banyu-s-druzyami', label: 'Встреча с друзьями в бане', guests: 6, grams: 300, ids: ['cheese', 'cabbage'] },
] as const;
