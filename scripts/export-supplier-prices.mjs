import { mkdir, writeFile } from 'node:fs/promises';
import { supplierProducts, supplierSource } from '../src/data/holland-catalog.ts';
import { estimatePrice, pricingModel } from '../src/data/pricing.ts';
const directory = new URL('../research/suppliers-20261029/', import.meta.url);
const rows = supplierProducts.flatMap(product => {
  const source = supplierSource.find(s => s.id === product.id);
  return product.variants.map(variant => {
    const count = variant.value === source.packWeightG ? source.packCount : variant.value / source.unitWeightG;
    const purchase = source.packPrice * count / source.packCount;
    const inbound = product.category === 'dough' ? variant.value / 1000 * pricingModel.inboundPerKgDough : count * pricingModel.inboundPerPiece;
    const calculation = estimatePrice(purchase, inbound);
    return { id: product.id, product: product.name, group: product.category, format: variant.label,
      weight_g: variant.value, source_pack_pieces: source.packCount, source_pack_price_rub: source.packPrice,
      purchase_rub: Number(purchase.toFixed(2)), inbound_rub: inbound, packing_rub: calculation.packing,
      retail_rub: variant.price, variable_reserve_rub: calculation.variableReserve,
      contribution_rub: calculation.contribution, contribution_percent: Number((calculation.contribution / variant.price * 100).toFixed(2)),
      price_from: source.priceFrom, source_url: source.sourceUrl, source_checked: source.checkedOn };
  });
});
const columns = Object.keys(rows[0]);
const quote = value => `"${String(value).replaceAll('"', '""')}"`;
await mkdir(directory, { recursive: true });
await writeFile(new URL('pirogorsk-retail-prices.csv', directory), '\ufeff' + [columns, ...rows.map(row => columns.map(key => row[key]))].map(row => row.map(quote).join(';')).join('\n') + '\n');
await writeFile(new URL('pirogorsk-retail-prices.json', directory), JSON.stringify({ pricingModel, rows }, null, 2) + '\n');
console.log(`${supplierProducts.length} products, ${rows.length} priced formats exported.`);
