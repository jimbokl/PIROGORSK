import holland from './supplier-artwork.json';
import fresh from './pirogi39-artwork.json';
const manifest = [...holland, ...fresh];
export const supplierArtwork = (id: string) => {
  const art = manifest.find(item => item.id === id);
  if (!art) throw new Error(`Missing supplier artwork: ${id}`);
  return art;
};
