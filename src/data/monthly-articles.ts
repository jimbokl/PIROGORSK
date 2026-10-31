import content from './monthly-articles.json';
import { articleArtwork } from './article-artwork';
import type { BlogArticle } from './blog-articles';

export const monthlyArticles: readonly BlogArticle[] = content.map(article => ({
  ...article,
  category: 'За столом',
  ...articleArtwork(article.slug),
}));
