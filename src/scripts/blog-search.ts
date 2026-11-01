import { matchesCatalogSearch } from '../lib/catalog-search';

const form = document.querySelector<HTMLFormElement>('[data-blog-search-form]');
if (form) {
  const input = form.querySelector<HTMLInputElement>('input')!;
  const reset = form.querySelector<HTMLButtonElement>('[data-blog-search-reset]')!;
  const status = form.querySelector<HTMLElement>('[data-blog-search-status]')!;
  const empty = document.querySelector<HTMLElement>('[data-blog-empty]')!;
  const entries = [...document.querySelectorAll<HTMLElement>('[data-blog-entry]')];
  const categories = [...document.querySelectorAll<HTMLElement>('[data-blog-category]')];
  const topics = document.querySelector<HTMLElement>('[data-blog-topics]')!;

  function apply(query: string, updateUrl = false) {
    const value = query.slice(0, 100);
    if (input.value !== value) input.value = value;
    let total = 0;
    entries.forEach(entry => {
      entry.hidden = !matchesCatalogSearch(entry.dataset.blogSearch || '', input.value);
      if (!entry.hidden) total++;
    });
    let visibleCategories = 0;
    categories.forEach(category => {
      const count = category.querySelectorAll('[data-blog-entry]:not([hidden])').length;
      category.hidden = count === 0;
      const link = topics.querySelector<HTMLElement>(`[data-blog-category-link="${category.id}"]`)!;
      link.hidden = category.hidden;
      link.querySelector('small')!.textContent = String(count);
      if (count) visibleCategories++;
    });
    topics.hidden = visibleCategories === 0;
    empty.hidden = total > 0;
    reset.hidden = !input.value.trim();
    status.textContent = input.value.trim() ? `Найдено материалов: ${total}` : `Материалов в журнале: ${total}`;
    if (updateUrl) {
      const url = new URL(location.href);
      if (input.value.trim()) url.searchParams.set('q', input.value.trim());
      else url.searchParams.delete('q');
      history.replaceState(history.state, '', url);
    }
  }

  const readUrl = () => apply(new URLSearchParams(location.search).get('q') || '');
  const clear = () => { apply('', true); input.focus({ preventScroll: true }); };
  input.addEventListener('input', () => apply(input.value, true));
  reset.addEventListener('click', clear);
  empty.querySelector('button')!.addEventListener('click', clear);
  form.addEventListener('submit', event => {
    event.preventDefault();
    apply(input.value, true);
    // Dismiss the touch keyboard before moving to the first result.
    if (document.activeElement === input) input.blur();
    (entries.find(entry => !entry.hidden) || empty).scrollIntoView({ block: 'start' });
  });
  window.addEventListener('popstate', readUrl);
  readUrl();
}
