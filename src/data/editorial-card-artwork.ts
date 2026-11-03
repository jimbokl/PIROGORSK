import city from '../../design/editorial-cards-20261101/city.png';
import dinner from '../../design/editorial-cards-20261101/dinner.png';
import gathering from '../../design/editorial-cards-20261101/gathering.png';
import picnic from '../../design/blog-source/reading-20261101/picnic.png';
import { blogEntries, articleHref } from './blog';

// Resolve by destination so the same link always has the same illustration.
export function editorialCardArtwork(href: string) {
  const path = href.split(/[?#]/, 1)[0];
  const article = blogEntries.find(entry => articleHref(entry.slug) === path);
  if (article) return { image: article.image, action: 'Читать статью', kind: 'article' };
  if (/^\/(zelenogradsk|svetlogorsk|kaliningrad|delivery)\//.test(path))
    return { image: city, action: 'Посмотреть направление', kind: 'city' };
  if (path.startsWith('/nabor/'))
    return { image: /piknik/.test(path) ? picnic : /uzhin/.test(path) ? dinner : gathering,
      action: 'Посмотреть набор', kind: /piknik/.test(path) ? 'picnic' : /uzhin/.test(path) ? 'dinner' : 'gathering' };
  if (path.startsWith('/povody/'))
    return { image: /semeyn|uzhin/.test(path) ? dinner : gathering, action: 'Продумать свой стол', kind: 'occasion' };
  if (path.startsWith('/menu/')) return { image: gathering, action: 'Выбрать пироги', kind: 'menu' };
  return { image: dinner, action: 'Подробнее', kind: 'guide' };
}
