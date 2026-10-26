import raw from './b2b-occasions.json';
import type { CitySlug } from './local-data';
export type LocalOccasion = Omit<typeof raw[number], 'city'> & {city:CitySlug};
export const localOccasions = raw as LocalOccasion[];
export const occasionHref = (p:LocalOccasion) => `/povody/${p.city}/${p.slug}/`;
