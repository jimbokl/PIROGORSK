import entries from './product-backdrops.json';

// Build-only artwork data never enters the cart or the Worker contract.
export const productBackdrop = (id: string) => entries.find(entry => entry.id === id);
