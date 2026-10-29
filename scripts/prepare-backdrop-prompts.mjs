import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { catalog } from '../src/data/catalog.ts';

const directory = 'research/product-backdrops-20261029';
const previous = JSON.parse(await readFile('design/layered-assets-v2/manifest.json', 'utf8'));
const retained = new Set(Object.keys(previous.pairs));
// The prompt file is asset provenance. Keep the exact prompts used for already
// commissioned images when extending or rerunning this inventory.
const frozenPrompts = new Map();
try {
  for (const item of JSON.parse(await readFile(`${directory}/prompts.json`, 'utf8'))) frozenPrompts.set(item.id, item.prompt);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const subjects = {
  cranberry: 'cranberries, delicate cranberry leaves and a few tiny berry-coloured ink accents',
  seabuckthorn: 'sea buckthorn berries and slender sea buckthorn leaves, warm orange accents',
  tea: 'tea leaves and delicate tea branches, muted sage ink accents',
  coffee: 'coffee beans and delicate coffee branches, warm sepia accents',
  water: 'fine Baltic sea wave engravings, a few clear water drops, marine-blue accents; no fruit or flavouring',
  tableware: 'delicate engravings of a simple plate, fork and folded napkin, marine-blue accents',
};
await mkdir(directory, { recursive: true });
await mkdir('design/product-backdrops-source', { recursive: true });
const prompts = catalog.filter(p => !retained.has(p.id)).map((product, index) => {
  const subject = subjects[product.id] ?? `the main ingredients or baking motifs directly implied by the product name «${product.name}». For an ambiguous assortment, use understated wheat and baking utensil details rather than inventing a specific filling`;
  const prompt = `Use case: stylized-concept.
Asset type: square illustrated background layer for a Pirogorsk bakery product card.
Input image: reference ONLY for the established hand-engraved ingredient border style, warm paper and empty centre; generate an original new composition.
Primary request: a beautiful original backdrop for «${product.name}», matching the first Pirogorsk pie cards.
Scene: warm ivory paper #FBF9F4. Delicate copperplate/woodcut illustration of ${subject}, confined to the outer perimeter. Fine expressive hatching, muted marine-blue or natural ingredient-coloured ink, restrained golden and sage accents.
Composition: square; airy asymmetric border, variation ${index + 1}; keep the central 65 percent completely empty ivory paper to hold a separately layered product. Motifs near the edges, generous negative space, subtle paper grain.
Constraints: BACKGROUND ONLY, no finished pie, bread, pastry, drink container or main product in the centre; no packaging, typography, letters, numbers, logos or watermark. Opaque background. Match reference art direction but do not copy its arrangement. The decorative motifs are illustrative, not a factual composition label.`;
  return { id: product.id, name: product.name, category: product.category, prompt: frozenPrompts.get(product.id) ?? prompt, styleReference: 'design/layered-assets-v2/meat/background.png', source: `design/product-backdrops-source/${product.id}.png`, generator: 'builtin-imagegen' };
});
await writeFile(`${directory}/prompts.json`, JSON.stringify(prompts, null, 2) + '\n');
await writeFile(`${directory}/retained-backgrounds.json`, JSON.stringify([...retained].map(id => ({ id, source: `design/layered-assets-v2/${previous.pairs[id].files.background.path}` })), null, 2) + '\n');
console.log(JSON.stringify({ generate: prompts.length, retain: retained.size, total: catalog.length }));
