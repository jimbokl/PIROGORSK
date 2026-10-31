import { parseCriteria, type Criteria, type Filling } from '../lib/catalog-fillings';
import { matchesCatalogSearch } from '../lib/catalog-search';
import { trackGoal } from './analytics';

export function matchesCard(card: HTMLElement, criteria: Criteria): boolean {
  return (criteria.filling === 'all' || (card.dataset.fillings || '').split(' ').includes(criteria.filling)) &&
    matchesCatalogSearch(card.dataset.catalogSearch || card.dataset.menuSearch || card.dataset.supplierSearch || '', criteria.query);
}

/** One URL/state contract for home and menu; controllers retain progressive rendering. */
export function setupCatalogFilters(form: HTMLFormElement, surface: 'home' | 'menu', render: (criteria: Criteria, mode: 'push' | 'replace' | 'read') => number) {
  const input = form.querySelector<HTMLInputElement>('[data-catalog-query]')!;
  const reset = form.querySelector<HTMLButtonElement>('[data-catalog-reset]')!;
  const buttons = [...form.querySelectorAll<HTMLButtonElement>('[data-filling]')];
  let criteria = parseCriteria(location.search);
  let timer: ReturnType<typeof setTimeout>;
  function apply(mode: 'push' | 'replace' | 'read') {
    input.value = criteria.query;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filling === criteria.filling)));
    const count = render(criteria, mode);
    reset.hidden = !criteria.query.trim() && criteria.filling === 'all';
    if (mode !== 'read') {
      const url = new URL(location.href);
      if (criteria.query.trim()) url.searchParams.set('q', criteria.query.trim()); else url.searchParams.delete('q');
      if (criteria.filling !== 'all') url.searchParams.set('filling', criteria.filling); else url.searchParams.delete('filling');
      url.searchParams.delete('group');
      if (url.href !== location.href) history[mode === 'push' ? 'pushState' : 'replaceState'](history.state, '', url);
      clearTimeout(timer);
      timer = setTimeout(() => trackGoal('catalog_filter_apply', { surface, filling: criteria.filling, search_used: Boolean(criteria.query.trim()), results: count }), 400);
    }
  }
  form.querySelector<HTMLElement>('[data-catalog-fillings]')!.hidden = false;
  input.addEventListener('input', () => { criteria = { ...criteria, query: input.value.slice(0, 100) }; apply('replace'); });
  buttons.forEach(button => button.addEventListener('click', () => { criteria = { ...criteria, filling: button.dataset.filling as Filling }; apply('push'); }));
  const clear = (focus = true) => { criteria = { query: '', filling: 'all' }; apply('push'); if (focus) input.focus({ preventScroll: true }); };
  reset.addEventListener('click', () => clear());
  document.querySelector('[data-catalog-empty-reset]')?.addEventListener('click', () => clear());
  window.addEventListener('popstate', () => { clearTimeout(timer); criteria = parseCriteria(location.search); apply('read'); });
  apply('read');
  return { get: () => criteria, reset: clear };
}
