import type { ImageMetadata } from 'astro';
import { blogArticles } from './blog-articles';
import { guides } from './editorial';
import { foodGuide, foodGuideImage, foodGuideImageAlt } from './food-guides';
import { expansionGuides } from './expansion-guides';

export interface BlogEntry {
  slug: string; title: string; description: string; image: ImageMetadata; imageAlt: string;
  category: 'Расчёты' | 'За столом' | 'Зеленоградск' | 'Светлогорск' | 'Калининград'; minutes: number; date?: string;
}
export const articleHref = (slug: string) => `/journal/${slug}/`;
export const readingMinutes = (text: string) => Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 180));
export const blogEntries: readonly BlogEntry[] = [
  ...expansionGuides.map(article => ({...article, minutes:readingMinutes([article.intro,article.takeaway,...article.sections.flatMap(s=>[...(s.paragraphs??[]),...(s.items??[]),...(s.table?.rows.flat()??[])])].join(' '))})),
  ...blogArticles.map(article => ({ ...article, minutes: readingMinutes([article.intro, article.takeaway, ...article.sections.flatMap(section => [section.title, ...(section.paragraphs ?? []), ...(section.items ?? [])])].join(' ')) })),
  { ...foodGuide, image: foodGuideImage, imageAlt: foodGuideImageAlt, category: 'Зеленоградск', minutes: 5, date: foodGuide.updatedAt },
  ...guides.map(guide => ({ ...guide, category: 'За столом' as const, minutes: readingMinutes([guide.intro, ...guide.sections.flatMap(section => [...(section.paragraphs ?? []), ...(section.items ?? [])])].join(' ')) })),
];
export const blogCategories = [
  { name: 'Расчёты', id: 'raschety', description: 'Вес, порции и разные форматы пирогов.' },
  { name: 'За столом', id: 'za-stolom', description: 'Ужин, чаепитие и встречи без лишней суеты.' },
  { name: 'Зеленоградск', id: 'zelenogradsk', description: 'Местные меню, цены и ссылки на источники.' },
  { name: 'Светлогорск', id: 'svetlogorsk', description: 'Завтраки, семейный обед и проверенные адреса.' },
  { name: 'Калининград', id: 'kaliningrad', description: 'Обед в центре, еда с собой и расчёт по меню.' },
] as const;
