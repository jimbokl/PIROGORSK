import matrix from '../data/seo-matrix.json' with { type: 'json' };

const origin = 'https://pirogorsk.ru';
const pages = new Map(matrix.map(page => [page.path, page]));

/** Only published, explicitly registered paths can become analytics dimensions. */
export function canonicalSeoPath(value: string, base = origin): string | undefined {
  try {
    const baseUrl = new URL(base, origin);
    const url = new URL(value, baseUrl);
    if (!['https://pirogorsk.ru', 'https://www.pirogorsk.ru'].includes(url.origin) || url.origin !== baseUrl.origin) return;
    return pages.has(url.pathname) ? url.pathname : undefined;
  } catch { return; }
}

export function isConversionHref(value: string, base = origin): boolean {
  const path = canonicalSeoPath(value, base);
  if (!path) return false;
  return ['/', '/menu/', '/podbor/'].includes(path) || ['product', 'category', 'set', 'scenario', 'city', 'delivery'].includes(pages.get(path)!.pageType);
}

export function guideTransition(source: string, destination: string): { source_page: string; destination_page: string } | undefined {
  try {
    const base = new URL(source, origin).href;
    const sourcePage = canonicalSeoPath(source, base);
    const destinationPage = canonicalSeoPath(destination, base);
    if (!sourcePage || !destinationPage || !isConversionHref(destination, base) || sourcePage === destinationPage) return;
    return { source_page: sourcePage, destination_page: destinationPage };
  } catch { return; }
}

export function articleRoute(path: string) {
  const page = pages.get(path);
  if (!page?.nextStep || !page.relatedArticles?.length) throw new Error(`Missing editorial route: ${path}`);
  return { nextStep: page.nextStep, relatedArticles: page.relatedArticles };
}
