export type PlannedItem = { id: string; value: number; quantity: number };
type Pie = { id: string; kind: string; variants: { value: number; price: number }[] };

/** Portion size is a visitor's estimate, not a nutritional or satiety claim. */
export function planPies(guests: number, grams: number, ids: string[], catalog: Pie[]) {
  if (!Number.isInteger(guests) || guests < 1 || guests > 50 || !Number.isInteger(grams) || grams < 100 || grams > 500 || grams % 50) throw new Error('Проверьте число гостей и порцию.');
  if (!ids.length || ids.length > 8 || new Set(ids).size !== ids.length) throw new Error('Выберите хотя бы одну начинку.');
  const pies = ids.map(id => catalog.find(pie => pie.id === id && pie.kind === 'pie'));
  if (pies.some(pie => !pie || ![500, 1000].every(value => pie.variants.some(variant => variant.value === value && Number.isFinite(variant.price))))) throw new Error('Неизвестный вариант пирога.');
  const requested = guests * grams;
  const units = Math.ceil(requested / 500);
  const items: PlannedItem[] = [];
  pies.forEach((pie, index) => {
    const allocated = Math.floor(units / pies.length) + (index < units % pies.length ? 1 : 0);
    if (allocated >= 2) items.push({ id: pie!.id, value: 1000, quantity: Math.floor(allocated / 2) });
    if (allocated % 2) items.push({ id: pie!.id, value: 500, quantity: 1 });
  });
  const total = items.reduce((sum, item) => sum + catalog.find(pie => pie.id === item.id)!.variants.find(variant => variant.value === item.value)!.price * item.quantity, 0);
  return { requested, weight: units * 500, items, total };
}

/** Reject the entire transfer if any row is invalid; never trust URL quantities. */
export function parsePlan(value: string | null, catalog: Pie[]): PlannedItem[] | null {
  if (!value || value.length > 1000) return null;
  const rows = value.split(',');
  if (rows.length > 16) return null;
  const seen = new Set<string>();
  const items: PlannedItem[] = [];
  for (const row of rows) {
    const match = /^([a-z]+):(500|1000):([1-9]\d?)$/.exec(row);
    if (!match) return null;
    const [, id, size, count] = match;
    const product = catalog.find(pie => pie.id === id && pie.kind === 'pie');
    const value = Number(size);
    if (!product?.variants.some(variant => variant.value === value) || seen.has(`${id}:${value}`)) return null;
    seen.add(`${id}:${value}`);
    items.push({ id, value, quantity: Number(count) });
  }
  return items;
}
