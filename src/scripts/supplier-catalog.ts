for (const root of document.querySelectorAll<HTMLElement>('[data-supplier-catalog]')) {
  const cards = [...root.querySelectorAll<HTMLElement>('[data-supplier-id]')];
  const search = root.querySelector<HTMLInputElement>('[data-supplier-search]')!;
  const more = root.querySelector<HTMLButtonElement>('[data-supplier-more]')!;
  const filters = [...root.querySelectorAll<HTMLButtonElement>('[data-supplier-filter]')];
  let group = 'all';
  let limit = 24;
  const normalize = (text: string) => text.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim();
  const params = new URLSearchParams(location.search);
  const initialId = params.get('interest');
  const requestedGroup = params.get('group');
  if (location.hash === `#${root.id}` && filters.some(button => button.dataset.supplierFilter === requestedGroup)) {
    group = requestedGroup!;
  }
  function render() {
    const query = normalize(search.value);
    const matches = cards.filter(card => (group === 'all' || card.dataset.supplierGroup === group) && normalize(card.dataset.supplierName || '').includes(query));
    cards.forEach(card => { card.hidden = true; });
    matches.slice(0, limit).forEach(card => { card.hidden = false; });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.supplierFilter === group)));
    root!.querySelector('[data-supplier-count]')!.textContent = `Найдено: ${matches.length} · показано: ${Math.min(limit, matches.length)}`;
    root!.querySelector<HTMLElement>('[data-supplier-empty]')!.hidden = matches.length > 0;
    more.hidden = matches.length <= limit;
    more.textContent = `Показать ещё ${Math.min(24, matches.length - limit)}`;
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
  document.addEventListener('pirogorsk:reveal-product', event => reveal((event as CustomEvent<string>).detail));
  cards.forEach(card => card.addEventListener('change', () => {
    const selected = card.querySelector<HTMLInputElement>('input:checked')!;
    card.querySelector('[data-supplier-price]')!.textContent = `${Number(selected.dataset.supplierUnitPrice).toLocaleString('ru-RU')} ₽`;
    card.querySelector<HTMLAnchorElement>('[data-supplier-link]')?.setAttribute('href', `/?interest=${card.dataset.supplierId}&variant=${selected.value}#${root.id}`);
  }));
}
