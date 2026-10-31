import { occasions, type InterestContext } from '../data/interest-context';

type Occasion = InterestContext['occasion'];
type Choice = { value: Occasion; source: 'entry' | 'choice' };
type Storage = { getItem(key: string): string | null | undefined; setItem(key: string, value: string): void };
const key = 'pirogorsk:occasion:v1';
const scenarioSlugs: Record<string, Occasion> = {
  'uzhin-v-apartamentah': 'apartments', 'na-kompaniyu': 'company', 'piknik-u-morya': 'picnic',
  'v-ofis-na-den-rozhdeniya': 'company', 'furshet-na-korporativ': 'company', 'na-pominki': 'company',
  'sytnyj-obed-na-strojku': 'company', 'v-banyu-s-druzyami': 'company', 'eda-na-vypisku': 'gift',
  'semeynyy-uzhin': 'dinner', 'eda-na-kurshskuyu-kosu': 'picnic',
};
const articleScenarios: Record<string, Occasion> = {
  'uzhin-v-semnyh-apartamentah': 'apartments', 'kak-razogret-pirog-v-apartamentah': 'apartments',
  'kak-vybrat-pirogi-na-kompaniyu': 'company', 'obed-v-ofis-v-kaliningrade': 'company',
  'pirogi-na-den-rozhdeniya': 'company', 'pirogi-na-svadebnyy-furshet': 'company',
  'piknik-s-pirogom-chto-vzyat': 'picnic', 'piknik-na-kurshskoy-kose': 'picnic',
};
const interestScenarios: Record<string, Occasion> = {
  'scenario-apartamenty': 'apartments', 'scenario-kompaniya': 'company', 'scenario-piknik': 'picnic',
  ...Object.fromEntries(Object.entries(scenarioSlugs).map(([slug, value]) => [`occasion-${slug}`, value])),
  ...Object.fromEntries(Object.entries(articleScenarios).map(([slug, value]) => [`guide-${slug}`, value])),
};
const own = (map: Record<string, Occasion>, value: string) => Object.hasOwn(map, value) ? map[value] : undefined;

/** Explicit content ownership only: no fuzzy matching, referrer, or raw query retention. */
export function occasionFromEntry(href: string): Occasion | undefined {
  try {
    const url = new URL(href);
    if (!['https:', 'http:'].includes(url.protocol) || !['pirogorsk.ru', 'www.pirogorsk.ru', 'localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 2 && parts[0] === 'journal') return own(articleScenarios, parts[1]);
    if (parts.length === 2 && parts[0] === 'nabor' && ['uzhin-v-apartamentah', 'na-kompaniyu', 'piknik-u-morya'].includes(parts[1])) return own(scenarioSlugs, parts[1]);
    if (parts.length === 2 && parts[0] === 'povody' && ['v-ofis-na-den-rozhdeniya', 'furshet-na-korporativ', 'na-pominki', 'sytnyj-obed-na-strojku', 'eda-na-vypisku', 'v-banyu-s-druzyami'].includes(parts[1])) return own(scenarioSlugs, parts[1]);
    if (parts.length === 3 && parts[0] === 'povody' && ['kaliningrad', 'zelenogradsk', 'svetlogorsk'].includes(parts[1]) && (['v-ofis-na-den-rozhdeniya', 'furshet-na-korporativ', 'na-pominki', 'semeynyy-uzhin', 'uzhin-v-apartamentah'].includes(parts[2]) || (parts[1] === 'zelenogradsk' && parts[2] === 'eda-na-kurshskuyu-kosu'))) return own(scenarioSlugs, parts[2]);
    if (url.pathname === '/podbor/' && url.searchParams.getAll('occasion').length === 1) return own(scenarioSlugs, url.searchParams.get('occasion')!);
    if (url.pathname === '/' && url.searchParams.getAll('interest').length === 1) return own(interestScenarios, url.searchParams.get('interest')!);
  } catch { /* Invalid URLs have no inferred occasion. */ }
}

/** Same-tab preference, including an explicit “undecided”; storage failures leave the form usable. */
export function createOccasionMemory(storage?: Storage) {
  let choice: Choice | undefined;
  try {
    const value = JSON.parse(storage?.getItem(key) || 'null');
    if (value && Object.keys(value).length === 2 && occasions.some(([id]) => id === value.value) && ['entry', 'choice'].includes(value.source)) choice = value;
  } catch { /* Corrupt or unavailable storage is ignored. */ }
  function save(next: Choice): void {
    choice = next;
    try { storage?.setItem(key, JSON.stringify(next)); } catch { /* Keep this document's choice in memory. */ }
  }
  return {
    current: () => choice,
    enter(href: string) {
      const value = occasionFromEntry(href);
      if (value && choice?.source !== 'choice') save({ value, source: 'entry' });
      return choice;
    },
    choose(value: string) {
      if (occasions.some(([id]) => id === value)) save({ value: value as Occasion, source: 'choice' });
    },
  };
}
