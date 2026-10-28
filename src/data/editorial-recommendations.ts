import { blogEntries, articleHref } from './blog';
import { articleRoute } from '../lib/seo-navigation';
import type { EditorialLink } from './editorial';

export function articleRecommendations(path: string): EditorialLink[] {
  return articleRoute(path).relatedArticles.map(href => {
    const entry = blogEntries.find(entry => articleHref(entry.slug) === href);
    if (!entry) throw new Error(`Unknown related article: ${href}`);
    return { href, title: entry.title, text: entry.description, label: entry.category };
  });
}
