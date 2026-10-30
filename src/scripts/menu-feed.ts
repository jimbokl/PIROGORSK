import { mergeSelection, readSavedSelection } from '../lib/selection-offers';
import { trackGoal } from './analytics';

type Product = { id: string; name: string; variants: { value: number; label: string; price: number }[] };
const feed = document.querySelector<HTMLElement>('.menu-feed');
const feedback = document.querySelector<HTMLElement>('[data-feed-feedback]');
if (feed && feedback) {
  const products: Product[] = JSON.parse(document.querySelector('#menu-feed-catalog')?.textContent || '[]');
  const message = feedback.querySelector<HTMLElement>('[data-feed-message]')!;
  const selectionLink = feedback.querySelector<HTMLAnchorElement>('[data-feed-selection]')!;
  for (const card of feed.querySelectorAll<HTMLElement>('[data-supplier-id], [data-feed-id]')) {
    const id = card.dataset.supplierId || card.dataset.feedId!;
    const button = card.querySelector<HTMLAnchorElement>('[data-supplier-link], [data-feed-add]')!;
    card.addEventListener('change', () => {
      const selected = card.querySelector<HTMLInputElement>('input:checked')!;
      const price = Number(selected.dataset.feedPrice ?? selected.dataset.supplierUnitPrice);
      const priceLabel = card.querySelector('[data-feed-price-label]');
      if (priceLabel) priceLabel.textContent = `${price.toLocaleString('ru-RU')} ₽`;
      button.href = `/?interest=${id}&variant=${selected.value}`;
      button.removeAttribute('data-added');
      button.textContent = 'В подборку';
    });
    button.addEventListener('click', event => {
      // Preserve opening the working fallback URL in another tab.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const value = Number(card.querySelector<HTMLInputElement>('input:checked')!.value);
      try {
        let saved: unknown;
        try { saved = JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'); }
        catch (error) { if (error instanceof SyntaxError) saved = []; else throw error; }
        const next = mergeSelection(readSavedSelection(saved, products), [{ id, value, quantity: 1 }], products);
        feedback.hidden = false;
        if (!next) { message.textContent = 'Подборка заполнена. Измените количество в подборке.'; return; }
        localStorage.setItem('pirogorsk-selection', JSON.stringify(next));
        const count = next.reduce((total, item) => total + item.quantity, 0);
        const product = products.find(product => product.id === id)!;
        message.textContent = `Добавлено: ${product.name}`;
        selectionLink.textContent = `Подборка · ${count} шт. →`;
        button.textContent = 'Добавить ещё';
        button.dataset.added = 'true';
        window.dispatchEvent(new Event('pirogorsk:catalog-updated'));
        trackGoal('catalog_add', { productid: id, variant: String(value), qty: 1, value: product.variants.find(v => v.value === value)!.price });
      } catch {
        // The regular link transfers this exact variant to the selection page.
        location.assign(button.href);
      }
    });
  }
}
