import raw from './local-places.json';
export const cityNames = { kaliningrad: 'Калининград', zelenogradsk: 'Зеленоградск', svetlogorsk: 'Светлогорск' } as const;
export type CitySlug = keyof typeof cityNames;
export type CityName = typeof cityNames[CitySlug];
export type LocalPlace = {
  id: string; name: string; city: string; category: string; address: string;
  coords: [number, number] | null; avgCheckRub: number | null; familyOf4DinnerRub: number | null;
  waitTimeMin: number | null; hasTakeaway: boolean | null; pros: string[]; cons: string[]; verifiedAt: string;
  sources: { url: string; fields: string[]; checkedAt: string }[];
  basket?: { items: { name: string; priceRub: number; quantity: number }[]; note: string; checkedAt: string };
  breakfastBasket?: { totalRub: number; sourceUrl: string; note: string; checkedAt: string };
};
export const localPlaces = raw as LocalPlace[];
export const placesForCity = (city: CitySlug) => localPlaces.filter(p => p.city === cityNames[city]);
export const rub = (value: number) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)} ₽`;
