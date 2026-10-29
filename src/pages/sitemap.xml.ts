import type { APIRoute } from 'astro';
import { editorialPaths, siteOrigin } from '../data/editorial';
import { newPageProducts } from '../data/product-pages';
import { catalogProductHref } from '../lib/product-paths';

export const prerender = true;
const escapeXml = (text: string) => text.replace(/[<>&'\"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!);

export const GET: APIRoute = () => {
  const paths = ['/', ...editorialPaths, ...newPageProducts.map(catalogProductHref)];
  const urls = paths.map(path => `<url><loc>${escapeXml(new URL(path, siteOrigin).href)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
