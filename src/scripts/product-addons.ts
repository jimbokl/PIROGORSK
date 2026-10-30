import { mergeSelection, readSavedSelection, type SelectionItem } from '../lib/selection-offers';
import { trackGoal } from './analytics';

type Product = { id: string; name: string; variants: { value: number; label: string; price: number }[] };
const section = document.querySelector<HTMLElement>('[data-product-addons]');
if (section) {
  const products: Product[] = JSON.parse(document.querySelector('#product-addons-catalog')?.textContent || '[]');
  const storageKey = 'pirogorsk-selection';
  const feedback = section.querySelector<HTMLElement>('[data-addon-feedback]')!;
  const selectionLink = section.querySelector<HTMLAnchorElement>('[data-addon-selection]')!;
  const money = (price: number) => `${price.toLocaleString('ru-RU')} ₽`;
  const read = (): SelectionItem[] => readSavedSelection(JSON.parse(localStorage.getItem(storageKey) || '[]'), products);
  const render = (items: SelectionItem[]) => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    selectionLink.textContent = count ? `Открыть подборку (${count})` : 'Открыть подборку';
    section.querySelectorAll<HTMLSelectElement>('[data-upsell-choice]').forEach(select => {
      const option = select.selectedOptions[0];
      const [id, value] = option.value.split(':');
      const existing = items.find(item => item.id === id && item.value === Number(value));
      const card = select.closest<HTMLElement>('[data-upsell-group]')!;
      const button = card.querySelector<HTMLButtonElement>('[data-upsell-add]')!;
      button.textContent = `Добавить за ${money(Number(option.dataset.price))}`;
      button.setAttribute('aria-label', `${button.textContent}: ${option.textContent}`);
      card.querySelector<HTMLElement>('[data-addon-saved]')!.textContent = existing ? `В подборке: ${existing.quantity} шт.` : '';
    });
  };
  const refresh = () => {
    try { render(read()); }
    catch { render([]); }
  };
  refresh();
  section.querySelectorAll<HTMLSelectElement>('[data-upsell-choice]').forEach(select => select.addEventListener('change', refresh));
  section.querySelectorAll<HTMLButtonElement>('[data-upsell-add]').forEach(button => button.addEventListener('click', () => {
    const card = button.closest<HTMLElement>('[data-upsell-group]')!;
    const select = card.querySelector<HTMLSelectElement>('[data-upsell-choice]')!;
    const [id, valueText, quantityText] = select.value.split(':');
    const value = Number(valueText), quantity = Number(quantityText);
    try {
      let current: SelectionItem[];
      try { current = read(); } catch (error) {
        if (error instanceof SyntaxError) current = []; else throw error;
      }
      const next = mergeSelection(current, [{ id, value, quantity }], products);
      if (!next) { feedback.textContent = 'В подборке до 24 разных вариантов и до 99 штук каждого. Измените количество в подборке.'; return; }
      localStorage.setItem(storageKey, JSON.stringify(next));
      render(next);
      const product = products.find(product => product.id === id)!;
      feedback.textContent = `Добавлено: ${product.name}, ${select.selectedOptions[0].textContent}, ${quantity} шт.`;
      let city: string | undefined;
      try { city = localStorage.getItem('pirogorsk-city') || undefined; } catch { /* The selection has already been saved. */ }
      trackGoal('catalog_add', { city, productid: id, variant: String(value), qty: quantity, value: product.variants.find(variant => variant.value === value)!.price * quantity });
    } catch {
      feedback.textContent = 'Браузер не сохранил добавление. Откройте подборку и выберите дополнения там.';
    }
  }));
  window.addEventListener('storage', event => { if (event.key === storageKey || event.key === null) refresh(); });
  window.addEventListener('pageshow', refresh);
}
