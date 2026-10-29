import { writeFile } from 'node:fs/promises';
import { freshProducts, freshSource, freshPricingModel, freshPurchasePrice } from '../../src/data/pirogi39-catalog.ts';
import { pricingModel, estimatePrice, deliveryEstimates } from '../../src/data/pricing.ts';
const rows = freshSource.flatMap(item => item.variants.map(variant => {
  const product = freshProducts.find(p => p.id === item.id);
  const calculation = estimatePrice(freshPurchasePrice(variant), freshPricingModel.inboundPerPie);
  return { id: item.id, name: item.name, weightG: variant.weightG, supplierPublicPrice: variant.price,
    promotion: Boolean(variant.regularPrice && variant.regularPrice > variant.price),
    pickupDiscount: calculation.purchase < variant.price ? 0.10 : 0, ...calculation,
    contributionRate: calculation.contribution / calculation.price, sourceUrl: item.sourceUrl,
    path: `/catalog/${product.slug}/` };
}));
await writeFile(new URL('pricing.json', import.meta.url), JSON.stringify({ checkedOn: '2026-10-29',
  assumptions: { ...pricingModel, ...freshPricingModel, deliveryEstimates }, rows }, null, 2) + '\n');
const columns = ['id','name','weightG','supplierPublicPrice','promotion','pickupDiscount','purchase','inbound','packing','variableReserve','price','contribution','contributionRate','sourceUrl'];
const csv = [columns.join(';'), ...rows.map(row => columns.map(key => `"${String(row[key]).replaceAll('"','""')}"`).join(';'))].join('\n');
await writeFile(new URL('pricing.csv', import.meta.url), '\uFEFF' + csv + '\n');
console.log(JSON.stringify({ products: freshProducts.length, sizes: rows.length,
  promotions: rows.filter(r => r.promotion).length, min: Math.min(...rows.map(r => r.price)), max: Math.max(...rows.map(r => r.price)),
  minContributionRate: Math.min(...rows.map(r => r.contributionRate)) }));
