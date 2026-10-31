import { createOccasionMemory } from '../lib/interest-entry';
import { createAttributionMemory } from '../lib/entry-attribution';

export const occasionMemory = createOccasionMemory({
  getItem: key => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
});
occasionMemory.enter(location.href);
export const attributionMemory = createAttributionMemory({
  getItem: key => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
});
attributionMemory.enter(location.href);
