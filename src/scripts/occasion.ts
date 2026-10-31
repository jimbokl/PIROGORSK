import { createOccasionMemory } from '../lib/interest-entry';

export const occasionMemory = createOccasionMemory({
  getItem: key => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
});
occasionMemory.enter(location.href);
