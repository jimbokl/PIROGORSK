import { readFile, writeFile } from 'node:fs/promises';
import { newPageProducts, productPage } from '../src/data/product-pages.ts';
const path = 'src/data/seo-matrix.json';
const matrix = JSON.parse(await readFile(path, 'utf8')).filter(row => row.cohort !== 'product-pages-20261029');
for (const product of newPageProducts) {
  const page = productPage(product);
  matrix.push({ path: page.href, cluster: 'catalog', pageType: 'product', cohort: 'product-pages-20261029',
    title: page.heading, query: `${page.heading.toLocaleLowerCase('ru-RU')} пирогорск`,
    intent: `Изучить ${page.heading.toLocaleLowerCase('ru-RU')}: состав, формат, предварительную цену и получение; отметить интерес к запуску.`,
    monthlySearches: null, demandSource: null, serpValidated: false, ownershipBasis: 'product_catalog_and_manufacturer_facts',
    nextStep: { path: '/menu/', label: 'Сравнить весь ассортимент' } });
}
await writeFile(path, JSON.stringify(matrix, null, 2) + '\n');
console.log(`Registered ${newPageProducts.length} new product pages; ${matrix.length} owners total.`);
