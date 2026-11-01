type PortionProduct = { kind: string; unit: string; category: string };
const pieCategories = new Set(['mini-pies', 'hearty-pies', 'sweet-pies', 'siberian-pies', 'kurniki', 'prussian-pies', 'ossetian-pies']);

/** Only finished pies: flour, dough, bread, desserts and drinks use other serving sizes. */
export function hasPiePortions(product: PortionProduct): boolean {
  return product.unit === 'g' && (product.kind === 'pie' || pieCategories.has(product.category));
}

/** Compare whole pies on the same basis; individual pastries have their own serving size. */
export function hasPortionPrice(product: PortionProduct): boolean {
  return hasPiePortions(product) && product.category !== 'mini-pies';
}

/** Use weight rather than the rounded portion count, so different formats stay comparable. */
export function portionPriceLabel(price: number, grams: number, from = false): string {
  if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(grams) || grams <= 0) return '';
  const cost = Math.round(price * 250 / grams);
  return `${from ? 'от' : '≈'} ${cost.toLocaleString('ru-RU')} ₽ за порцию 250 г`;
}

export function portionSummary(grams: number, quantity = 1): string {
  if (!Number.isSafeInteger(grams) || grams <= 0 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return '';
  const weight = grams * quantity;
  const lower = Math.max(1, Math.floor(weight / 250));
  const upper = Math.max(1, Math.ceil(weight / 250));
  const portions = lower === upper ? `${lower}` : `${lower}–${upper}`;
  const unit = upper % 10 === 0 || upper % 10 >= 5 || upper % 100 >= 11 && upper % 100 <= 14 ? 'порций' : upper % 10 === 1 ? 'порция' : 'порции';
  const mass = weight < 1000 ? `${weight} г` : `${(weight / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 3 })} кг`;
  return `≈ ${portions} ${unit} · ${mass}`;
}
