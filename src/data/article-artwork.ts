import type { ImageMetadata } from 'astro';
import manifest from './article-artwork.json';
import artwork0 from '../../design/blog-source/company-table.png';
import artwork1 from '../../design/blog-source/two-sizes.png';
import artwork2 from '../../design/blog-source/drinks-table.png';
import artwork3 from '../../design/blog-source/svetlogorsk-breakfast.png';
import artwork4 from '../../design/blog-source/kaliningrad-lunch.png';
import artwork5 from '../../design/blog-source/zelenogradsk-seaside-lunch.png';
import artwork6 from '../../design/blog-source/zelenogradsk-delivery-supper.png';
import artwork7 from '../../design/blog-source/zelenogradsk-breakfast.png';
import artwork8 from '../../design/blog-source/unique-20261026/pekarni-i-pirogi-v-zelenogradske.png';
import artwork9 from '../../design/blog-source/unique-20261026/gde-poest-s-detmi-v-zelenogradske.png';
import artwork10 from '../../design/blog-source/unique-20261026/eda-s-soboy-v-svetlogorske.png';
import artwork11 from '../../design/blog-source/unique-20261026/nedorogo-poest-semey-v-svetlogorske.png';
import artwork12 from '../../design/blog-source/unique-20261026/rybnye-pirogi-v-kaliningrade.png';
import artwork13 from '../../design/blog-source/unique-20261026/dostavka-pirogov-v-kaliningrade-sravnenie.png';
import artwork14 from '../../design/blog-source/unique-20261026/obed-v-ofis-v-kaliningrade.png';
import artwork15 from '../../design/blog-source/unique-20261026/pekarni-kaliningrada-pirogi-na-vynos.png';
import artwork16 from '../../design/blog-source/unique-20261026/rybnaya-nachinka-dlya-piroga.png';
import artwork17 from '../../design/blog-source/unique-20261026/myasnoy-pirog-nachinka-i-testo.png';
import artwork18 from '../../design/blog-source/unique-20261026/osetinskiy-ili-zakrytyy-pirog-kaliningrad.png';
import artwork19 from '../../design/blog-source/unique-20261026/kak-razogret-pirog-v-apartamentah.png';
import artwork20 from '../../design/blog-source/unique-20261026/uzhin-v-semnyh-apartamentah.png';
import artwork21 from '../../design/blog-source/unique-20261026/kak-vybrat-pirogi-na-kompaniyu.png';
import artwork22 from '../../design/blog-source/unique-20261026/piknik-s-pirogom-chto-vzyat.png';

const semanticArtwork = import.meta.glob<ImageMetadata>('../../design/blog-source/semantic-20261031/*.png', { eager: true, import: 'default' });
const images: Readonly<Record<string, ImageMetadata>> = {
  ...Object.fromEntries(Object.entries(semanticArtwork).map(([path, image]) => [path.replace('../../', ''), image])),
  'design/blog-source/company-table.png': artwork0,
  'design/blog-source/two-sizes.png': artwork1,
  'design/blog-source/drinks-table.png': artwork2,
  'design/blog-source/svetlogorsk-breakfast.png': artwork3,
  'design/blog-source/kaliningrad-lunch.png': artwork4,
  'design/blog-source/zelenogradsk-seaside-lunch.png': artwork5,
  'design/blog-source/zelenogradsk-delivery-supper.png': artwork6,
  'design/blog-source/zelenogradsk-breakfast.png': artwork7,
  'design/blog-source/unique-20261026/pekarni-i-pirogi-v-zelenogradske.png': artwork8,
  'design/blog-source/unique-20261026/gde-poest-s-detmi-v-zelenogradske.png': artwork9,
  'design/blog-source/unique-20261026/eda-s-soboy-v-svetlogorske.png': artwork10,
  'design/blog-source/unique-20261026/nedorogo-poest-semey-v-svetlogorske.png': artwork11,
  'design/blog-source/unique-20261026/rybnye-pirogi-v-kaliningrade.png': artwork12,
  'design/blog-source/unique-20261026/dostavka-pirogov-v-kaliningrade-sravnenie.png': artwork13,
  'design/blog-source/unique-20261026/obed-v-ofis-v-kaliningrade.png': artwork14,
  'design/blog-source/unique-20261026/pekarni-kaliningrada-pirogi-na-vynos.png': artwork15,
  'design/blog-source/unique-20261026/rybnaya-nachinka-dlya-piroga.png': artwork16,
  'design/blog-source/unique-20261026/myasnoy-pirog-nachinka-i-testo.png': artwork17,
  'design/blog-source/unique-20261026/osetinskiy-ili-zakrytyy-pirog-kaliningrad.png': artwork18,
  'design/blog-source/unique-20261026/kak-razogret-pirog-v-apartamentah.png': artwork19,
  'design/blog-source/unique-20261026/uzhin-v-semnyh-apartamentah.png': artwork20,
  'design/blog-source/unique-20261026/kak-vybrat-pirogi-na-kompaniyu.png': artwork21,
  'design/blog-source/unique-20261026/piknik-s-pirogom-chto-vzyat.png': artwork22,
};

// Missing artwork fails the build instead of silently reusing another article's cover.
export function articleArtwork(slug: string) {
  const entry = manifest.find(item => item.slug === slug);
  if (!entry || !images[entry.source]) throw new Error(`Missing original article artwork: ${slug}`);
  return { image: images[entry.source], imageAlt: entry.alt, ogImage: `/seo/blog/${slug}.jpg` };
}
