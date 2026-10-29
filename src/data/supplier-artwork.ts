import manifest from './supplier-artwork.json';
export const supplierArtwork = (id: string) => {
  const art = manifest.find(item => item.id === id);
  if (!art) throw new Error(`Missing supplier artwork: ${id}`);
  return art;
};
