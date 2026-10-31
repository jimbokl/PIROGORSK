import type { ImageMetadata } from 'astro';
import metadata from './monthly-article-meta.json';
import figures from './monthly-article-figures.json';
const images = import.meta.glob<ImageMetadata>('../../design/blog-source/month-202611/diagrams/*.png', { eager: true, import: 'default' });
export function monthlyPresentation(slug: string) {
  const meta = metadata[slug as keyof typeof metadata];
  if (!meta) return undefined;
  return { ...meta, figures: figures[slug as keyof typeof figures].map(figure => ({ ...figure, image: images[`../../design/blog-source/month-202611/diagrams/${figure.source}`] })) };
}
