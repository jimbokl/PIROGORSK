import content from './monthly-articles.json';
import { articleArtwork } from './article-artwork';
import type { BlogArticle, BlogCategory } from './blog-articles';

// Regional guides keep their city grouping; regional cuisine remains in the shared table section.
const cityCategories: Readonly<Record<string, BlogCategory>> = {
  'Калининград': 'Калининград',
  'Зеленоградск': 'Зеленоградск',
  'Светлогорск': 'Светлогорск',
};

export const monthlyArticles: readonly BlogArticle[] = content.map(article => ({
  ...article,
  category: cityCategories[article.category] ?? 'За столом',
  ...articleArtwork(article.slug),
}));
