import { matchesCard } from './catalog-filters';
import { portionSummary } from '../lib/product-portions';
import { parseCriteria, type Criteria } from '../lib/catalog-fillings';

for (const root of document.querySelectorAll<HTMLElement>('[data-supplier-catalog]')) {
  const cards = [...root.querySelectorAll<HTMLElement>('[data-supplier-id]')];
  const search = root.querySelector<HTMLInputElement>('[data-supplier-search]')!;
  const more = root.querySelector<HTMLButtonElement>('[data-supplier-more]')!;
  const filters = [...root.querySelectorAll<HTMLButtonElement>('[data-supplier-filter]')];
  let group = 'all';
  let limit = 24;
  let feedObserver: IntersectionObserver | null = null;
  let criteria = parseCriteria(location.search);
  const params = new URLSearchParams(location.search);
  const initialId = params.get('interest');
  const requestedGroup = params.get('group');
  if (!criteria.query && location.hash === `#${root.id}` && filters.some(button => button.dataset.supplierFilter === requestedGroup)) {
    group = requestedGroup!;
  }
  function render() {
    const matches = cards.filter(card => (group === 'all' || card.dataset.supplierGroup === group) && matchesCard(card, { ...criteria, query: `${criteria.query} ${search.value}` }));
    cards.forEach(card => { card.hidden = true; });
    matches.slice(0, limit).forEach(card => { card.hidden = false; });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.supplierFilter === group)));
    root!.querySelector('[data-supplier-count]')!.textContent = `Найдено: ${matches.length} · показано: ${Math.min(limit, matches.length)}`;
    root!.querySelector<HTMLElement>('[data-supplier-empty]')!.hidden = matches.length > 0;
    more.hidden = matches.length <= limit;
    more.textContent = `Показать ещё ${Math.max(0, Math.min(24, matches.length - limit))}`;
    root.dataset.matchCount = String(matches.length);
    root.dataset.searchActive = String(group !== 'all' || Boolean(search.value.trim()));
    // Re-arm after layout changes, including filters and a newly revealed batch.
    // Scroll anchoring can otherwise keep the button intersecting without a new entry.
    if (feedObserver) {
      feedObserver.unobserve(more);
      requestAnimationFrame(() => { if (!more.hidden) feedObserver?.observe(more); });
    }
    document.dispatchEvent(new Event('pirogorsk:catalog-updated'));
  }
  function reveal(id: string | null) {
    const index = cards.findIndex(card => card.dataset.supplierId === id);
    if (index < 0) return;
    group = 'all'; search.value = ''; limit = Math.max(24, index + 1); render();
  }
  render();
  if (initialId) reveal(initialId);
  search.addEventListener('input', () => { limit = 24; render(); });
  filters.forEach(button => button.addEventListener('click', () => { group = button.dataset.supplierFilter!; limit = 24; render(); }));
  more.addEventListener('click', () => { limit += 24; render(); });
  // HTML contains every product; the button remains a keyboard/fallback control.
  // In the menu feed the next batch appears as its end approaches the viewport.
  if (root.hasAttribute('data-menu-feed') && 'IntersectionObserver' in window) {
    feedObserver = new IntersectionObserver(entries => {
      // An entry can arrive after a jump to a later producer. Keep that
      // section in place if it is already visible when the batch arrives.
      const box = more.getBoundingClientRect();
      if (entries.some(entry => entry.isIntersecting) && !more.hidden && box.bottom >= 0 && box.top <= innerHeight + 500) {
        const anchor = [...document.querySelectorAll<HTMLElement>('[data-menu-section]')].find(section => {
          const top = section.getBoundingClientRect().top;
          return Boolean(root.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING) && top >= 0 && top < innerHeight;
        });
        const top = anchor?.getBoundingClientRect().top;
        limit += 24; render();
        if (anchor && top !== undefined) window.scrollBy({ top: anchor.getBoundingClientRect().top - top, behavior: 'instant' });
      }
    }, { rootMargin: '0px 0px 500px 0px' });
    feedObserver.observe(more);
  }
  document.addEventListener('pirogorsk:menu-search', event => {
    const next = (event as CustomEvent<Criteria & { restoreGroup: boolean }>).detail;
    criteria = next;
    const restored = next.restoreGroup && !criteria.query && criteria.filling === 'all' && location.hash === `#${root.id}` ? new URLSearchParams(location.search).get('group') : null;
    group = filters.some(button => button.dataset.supplierFilter === restored) ? restored! : 'all';
    search.value = ''; limit = 24; render();
  });
  document.addEventListener('pirogorsk:reveal-product', event => reveal((event as CustomEvent<string>).detail));
  cards.forEach(card => card.addEventListener('change', () => {
    if (root.hasAttribute('data-menu-feed')) return; // The feed owns quantity, total and its fallback URL.
    const selected = card.querySelector<HTMLInputElement>('input:checked')!;
    card.querySelector('[data-supplier-price]')!.textContent = `${Number(selected.dataset.supplierUnitPrice).toLocaleString('ru-RU')} ₽`;
    const portions = card.querySelector<HTMLElement>('[data-pie-portions]');
    if (portions) portions.textContent = portionSummary(Number(selected.value));
    card.querySelector<HTMLAnchorElement>('[data-supplier-link]')?.setAttribute('href', `/?interest=${card.dataset.supplierId}&variant=${selected.value}#${root.id}`);
  }));
}
