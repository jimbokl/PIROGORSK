import type { ImageMetadata } from 'astro';
import { blogArticles } from './blog-articles';
import { guides, editorialImages } from './editorial';
import { foodGuide } from './food-guides';

export interface BlogEntry {
  slug: string; title: string; description: string; image: ImageMetadata; imageAlt: string;
  category: 'Расчёты' | 'За столом' | 'Зеленоградск'; minutes: number; date?: string;
}
export const articleHref = (slug: string) => `/journal/${slug}/`;
export const readingMinutes = (text: string) => Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 180));
export const blogEntries: readonly BlogEntry[] = [
  ...blogArticles.map(article => ({ ...article, minutes: readingMinutes([article.intro, article.takeaway, ...article.sections.flatMap(section => [section.title, ...(section.paragraphs ?? []), ...(section.items ?? [])])].join(' ')) })),
  { ...foodGuide, image: editorialImages.dinner, imageAlt: 'Иллюстрация концепта: стол для ужина в апартаментах', category: 'Зеленоградск', minutes: 4, date: foodGuide.checkedAt },
  ...guides.map(guide => ({ ...guide, category: 'За столом' as const, minutes: readingMinutes([guide.intro, ...guide.sections.flatMap(section => [...(section.paragraphs ?? []), ...(section.items ?? [])])].join(' ')) })),
];
export const blogCategories = [
  { name: 'Расчёты', id: 'raschety', description: 'Вес, порции и разные форматы пирогов.' },
  { name: 'За столом', id: 'za-stolom', description: 'Ужин, чаепитие и встречи без лишней суеты.' },
  { name: 'Зеленоградск', id: 'zelenogradsk', description: 'Местные меню, цены и ссылки на источники.' },
] as const;
