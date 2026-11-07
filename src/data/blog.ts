import { articleArtwork } from './article-artwork';
import type { ImageMetadata } from 'astro';
import { blogArticles, type BlogCategory, type BlogSection } from './blog-articles';
import { guides } from './editorial';
import { foodGuide, foodGuideImage, foodGuideImageAlt } from './food-guides';
import { expansionGuides } from './expansion-guides';
import articleUpdates from './article-updates.json';
import { planningUpdates } from './planning-updates';

export interface BlogEntry {
  slug: string; title: string; description: string; image: ImageMetadata; imageAlt: string;
  category: BlogCategory; minutes: number; date?: string; ogImage: string;
}
export const articleHref = (slug: string) => `/journal/${slug}/`;
export const readingMinutes = (text: string) => Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 180));
const updates = new Map([...articleUpdates, ...planningUpdates].map(update => [update.ownerURL, update]));
function updatedReadingMinutes(article: { slug: string; intro: string; takeaway?: string; sections: readonly BlogSection[] }, originalMinutes: number) {
  const update = updates.get(articleHref(article.slug));
  if (!update) return originalMinutes;
  const sections: readonly BlogSection[] = [...article.sections, ...update.sections];
  const text = [article.intro, article.takeaway ?? '', ...sections.flatMap(section => [
    section.title, ...(section.paragraphs ?? []), ...(section.items ?? []), ...(section.steps ?? []),
    section.table?.caption ?? '', ...(section.table?.headers ?? []), ...(section.table?.rows.flat() ?? []),
    ...(section.links?.map(link => link.title) ?? []),
  ])].join(' ');
  return Math.max(originalMinutes, readingMinutes(text));
}
export const blogEntries: readonly BlogEntry[] = [
  ...expansionGuides.map(article => ({...article, minutes:updatedReadingMinutes(article, readingMinutes([article.intro,article.takeaway,...article.sections.flatMap(s=>[...(s.paragraphs??[]),...(s.items??[]),...(s.table?.rows.flat()??[])])].join(' ')))})),
  ...blogArticles.map(article => ({ ...article, minutes: updatedReadingMinutes(article, readingMinutes([article.intro, article.takeaway, ...article.sections.flatMap(section => [section.title, ...(section.paragraphs ?? []), ...(section.items ?? []), ...(section.steps ?? []), ...(section.table?.rows.flat() ?? [])])].join(' '))) })),
  { ...foodGuide, image: foodGuideImage, imageAlt: foodGuideImageAlt, category: 'Зеленоградск' as const, minutes: 7, date: foodGuide.updatedAt },
  ...guides.map(guide => ({ ...guide, category: 'За столом' as const, minutes: updatedReadingMinutes(guide, readingMinutes([guide.intro, ...guide.sections.flatMap(section => [...(section.paragraphs ?? []), ...(section.items ?? [])])].join(' '))) })),
].map(entry => ({ ...entry, ...articleArtwork(entry.slug) }));
export const blogCategories = [
  { name: 'Начинки', id: 'nachinki', description: 'Сыр, овощи, птица, фрукты и ягоды: выбираем вкус и состав.' },
  { name: 'Тесто и выпечка', id: 'testo', description: 'Разные основы, формы и разбор частых ошибок.' },
  { name: 'Хранение и подача', id: 'hranenie', description: 'Заморозка, дорога и аккуратная нарезка.' },
  { name: 'Выбор и расчёты', id: 'vybor', description: 'Состав, цена килограмма и бюджет всей корзины.' },
  { name: 'Расчёты', id: 'raschety', description: 'Вес, порции и разные форматы пирогов.' },
  { name: 'За столом', id: 'za-stolom', description: 'Ужин, чаепитие и встречи без лишней суеты.' },
  { name: 'Зеленоградск', id: 'zelenogradsk', description: 'Местные меню, цены и ссылки на источники.' },
  { name: 'Светлогорск', id: 'svetlogorsk', description: 'Завтраки, семейный обед и проверенные адреса.' },
  { name: 'Калининград', id: 'kaliningrad', description: 'Обед в центре, еда с собой и расчёт по меню.' },
] as const;
