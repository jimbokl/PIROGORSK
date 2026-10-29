import { matchesCatalogSearch } from '../lib/catalog-search';

const form = document.querySelector<HTMLFormElement>('[data-menu-finder]');
if (form) {
  const input = form.querySelector<HTMLInputElement>('[data-menu-search]')!;
  const reset = form.querySelector<HTMLButtonElement>('[data-menu-reset]')!;
  const status = form.querySelector<HTMLElement>('[data-menu-status]')!;
  const empty = document.querySelector<HTMLElement>('[data-menu-empty]')!;
  const sections = [...document.querySelectorAll<HTMLElement>('[data-menu-section]')];
  const initial = new URLSearchParams(location.search).get('q')?.slice(0, input.maxLength) ?? '';

  function summarize() {
    let total = 0;
    let filtered = Boolean(input.value.trim());
    for (const section of sections) {
      const count = section.hasAttribute('data-supplier-catalog')
        ? Number(section.dataset.matchCount ?? section.querySelectorAll('[data-supplier-id]').length)
        : section.querySelectorAll('[data-menu-product]:not([hidden])').length;
      total += count;
      filtered ||= section.dataset.searchActive === 'true';
      // Keep a local empty state reachable when only that section is filtered.
      section.hidden = Boolean(input.value.trim()) && count === 0;
      const link = document.querySelector<HTMLAnchorElement>(`[data-menu-jump="${section.id}"]`);
      if (link) {
        link.hidden = section.hidden;
        link.querySelector('[data-menu-section-count]')!.textContent = String(count);
      }
    }
    status.textContent = `Позиций по вашему выбору: ${total}`;
    empty.hidden = total > 0;
    reset.hidden = !filtered;
  }

  function search() {
    for (const card of document.querySelectorAll<HTMLElement>('[data-menu-product]')) {
      card.hidden = !matchesCatalogSearch(card.dataset.menuSearch ?? '', input.value);
    }
    document.dispatchEvent(new CustomEvent('pirogorsk:menu-search', { detail: input.value }));
    summarize();
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    // Search resets the section filters; an old deep link must not restore them.
    url.searchParams.delete('group');
    history.replaceState(history.state, '', url);
  }

  document.addEventListener('pirogorsk:catalog-updated', summarize);
  input.addEventListener('input', search);
  reset.addEventListener('click', () => { input.value = ''; search(); input.focus(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    sections.find(section => !section.hidden && Number(section.dataset.matchCount ?? section.querySelectorAll('[data-menu-product]:not([hidden])').length) > 0)?.scrollIntoView({ block: 'start' });
  });
  if (initial) { input.value = initial; search(); }
  else summarize();
}
