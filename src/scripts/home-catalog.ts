import { matchesCard, setupCatalogFilters } from './catalog-filters';
import { parseCriteria } from '../lib/catalog-fillings';
/** Progressive presentation only: the complete catalogue and links are in SSR HTML. */
const feed = document.querySelector<HTMLElement>('[data-home-catalog]');
const nav = document.querySelector<HTMLElement>('[data-home-catalog-nav]');
const more = document.querySelector<HTMLButtonElement>('[data-home-more]');
const moreWrap = document.querySelector<HTMLElement>('[data-home-more-wrap]');
if (feed && nav && more && moreWrap) {
  const cards = Array.from(feed.querySelectorAll<HTMLElement>('[data-product]'));
  const groups = Array.from(feed.querySelectorAll<HTMLElement>('[data-home-group]'));
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('[data-home-category]'));
  const status = document.querySelector<HTMLElement>('[data-home-catalog-status]')!;
  const batch = 12;
  let limit = batch;
  let criteria = parseCriteria(location.search);
  const matching = () => cards.filter(card => matchesCard(card, criteria));
  let active = '';
  let observer: IntersectionObserver | undefined;
  const behavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' as const : 'smooth' as const;

  function markActive(id: string) {
    if (active === id) return;
    active = id;
    links.forEach(link => {
      if (link.dataset.homeCategory === id) {
        link.setAttribute('aria-current', 'location');
        // Scroll only the horizontal rail, never the document or keyboard focus.
        const left = link.offsetLeft - nav!.offsetLeft;
        if (left < nav!.scrollLeft || left + link.offsetWidth > nav!.scrollLeft + nav!.clientWidth) {
          nav!.scrollTo({ left: left - 12, behavior: behavior() });
        }
      } else link.removeAttribute('aria-current');
    });
  }
  function render() {
    const matches = matching();
    cards.forEach(card => { card.hidden = true; });
    matches.slice(0, limit).forEach(card => { card.hidden = false; });
    groups.forEach(group => { group.hidden = !group.querySelector('[data-product]:not([hidden])'); });
    const remaining = Math.max(0, matches.length - limit);
    status.textContent = `Показано ${Math.min(limit, matches.length)} из ${matches.length} позиций`;
    links.forEach(link => { link.hidden = !matching().some(card => card.closest('[data-home-group]')?.id === link.dataset.homeCategory); });
    document.querySelector<HTMLElement>('[data-home-empty]')!.hidden = matches.length > 0;
    document.querySelector<HTMLElement>('[data-home-filter-status]')!.textContent = `Позиций по вашему выбору: ${matches.length}`;
    more!.hidden = remaining === 0;
    more!.textContent = `Показать ещё ${Math.min(batch, remaining)}`;
    observer?.disconnect();
    if (remaining) observer?.observe(more!);
  }
  function reveal(target: HTMLElement) {
    const group = target.closest<HTMLElement>('[data-home-group]');
    if (group) {
      const first = target.matches('[data-product]') ? target : matching().find(card => card.closest('[data-home-group]') === group);
      if (!first) return;
      limit = Math.max(limit, matching().indexOf(first) + batch);
      render();
      markActive(group.id);
    }
  }
  function goToHash(instant = false) {
    let id: string;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    // Keep lower-page anchors stable while new catalogue batches are revealed.
    if (target.closest('[data-home-group]')) reveal(target);
    else if (id !== 'top' && id !== 'pirogi') { limit = cards.length; render(); }
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: instant ? 'instant' : behavior() }));
  }
  nav.addEventListener('click', event => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    goToHash();
  });
  more.addEventListener('click', () => {
    const matches = matching();
    const first = matches[Math.min(limit, matches.length - 1)];
    limit += batch;
    render();
    first?.querySelector<HTMLAnchorElement>('a')?.focus();
  });
  document.addEventListener('pirogorsk:reveal-product', event => {
    const id = (event as CustomEvent<string>).detail;
    const card = cards.find(card => card.dataset.product === id);
    if (card) {
      if (!matchesCard(card, criteria)) filters.reset(false);
      reveal(card);
    }
  });
  window.addEventListener('hashchange', () => goToHash(true));
  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const edge = nav!.getBoundingClientRect().bottom + 64;
      let current = groups.find(group => !group.hidden);
      for (const group of groups) {
        if (!group.hidden && group.getBoundingClientRect().top <= edge) current = group;
      }
      if (current) markActive(current.id);
    });
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && limit < matching().length) {
        limit += batch;
        render();
      }
    }, { rootMargin: '0px 0px 700px 0px' });
  }
  const form = document.querySelector<HTMLFormElement>('[data-home-finder]')!;
  const filters = setupCatalogFilters(form, 'home', next => { criteria = next; limit = batch; render(); return matching().length; });
  form.addEventListener('submit', event => { event.preventDefault(); groups.find(group => !group.hidden)?.scrollIntoView({ block: 'start' }); });
  moreWrap.hidden = false;
  render();
  markActive(groups.find(group => !group.hidden)?.id || '');
  if (location.hash && location.hash !== '#pirogi') goToHash(true);
}
export {};
