import content from './semantic-articles.json';
import { articleArtwork } from './article-artwork';
import type { BlogArticle, BlogCategory } from './blog-articles';

export const semanticArticles: readonly BlogArticle[] = content.map(article => ({
  ...article,
  category: article.category as BlogCategory,
  ...articleArtwork(article.slug),
  related: '/menu/',
  relatedTitle: 'Выбрать пироги в меню',
}));
