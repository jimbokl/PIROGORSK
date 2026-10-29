import original from './product-backdrops.json';
import fresh from './pirogi39-backdrops.json';
const entries = [...original, ...fresh];

// Build-only artwork data never enters the cart or the Worker contract.
export const productBackdrop = (id: string) => entries.find(entry => entry.id === id);
