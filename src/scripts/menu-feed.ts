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
    const quantityInput = card.querySelector<HTMLInputElement>('[data-feed-quantity]')!;
    const decrease = card.querySelector<HTMLButtonElement>('[data-feed-decrease]')!;
    const increase = card.querySelector<HTMLButtonElement>('[data-feed-increase]')!;
    const money = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;
    function update() {
      const requested = Number(quantityInput.value);
      const quantity = Number.isFinite(requested) ? Math.max(1, Math.min(99, Math.trunc(requested))) : 1;
      quantityInput.value = String(quantity);
      decrease.disabled = quantity === 1;
      increase.disabled = quantity === 99;
      const selected = card.querySelector<HTMLInputElement>('input:checked')!;
      const price = Number(selected.dataset.feedPrice ?? selected.dataset.supplierUnitPrice);
      card.querySelector('[data-feed-price-label], [data-supplier-price]')!.textContent = money(price * quantity);
      card.querySelector('[data-feed-price-note]')!.textContent = quantity > 1 ? `${money(price)} / шт. · предварительно` : 'Предварительно';
      const url = new URL(button.href);
      url.searchParams.set('variant', selected.value);
      url.searchParams.set('quantity', String(quantity));
      button.href = url.href;
      button.removeAttribute('data-added');
      button.textContent = 'В подборку';
    }
    card.querySelector<HTMLElement>('[data-feed-quantity-control]')!.hidden = false;
    decrease.addEventListener('click', () => {
      quantityInput.stepDown();
      update();
    });
    increase.addEventListener('click', () => {
      quantityInput.stepUp();
      update();
    });
    card.addEventListener('change', update);
    update();
    button.addEventListener('click', event => {
      // Preserve opening the working fallback URL in another tab.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      update();
      const value = Number(card.querySelector<HTMLInputElement>('input:checked')!.value);
      const quantity = Number(quantityInput.value);
      try {
        let saved: unknown;
        try { saved = JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]'); }
        catch (error) { if (error instanceof SyntaxError) saved = []; else throw error; }
        const next = mergeSelection(readSavedSelection(saved, products), [{ id, value, quantity }], products);
        feedback.hidden = false;
        if (!next) { message.textContent = 'Подборка заполнена. Измените количество в подборке.'; return; }
        localStorage.setItem('pirogorsk-selection', JSON.stringify(next));
        const count = next.reduce((total, item) => total + item.quantity, 0);
        const product = products.find(product => product.id === id)!;
        message.textContent = `Добавлено: ${product.name} · ${quantity} шт.`;
        selectionLink.textContent = `Подборка · ${count} шт. →`;
        button.textContent = 'Добавить ещё';
        button.dataset.added = 'true';
        window.dispatchEvent(new Event('pirogorsk:catalog-updated'));
        trackGoal('catalog_add', { productid: id, variant: String(value), qty: quantity, value: product.variants.find(v => v.value === value)!.price * quantity });
      } catch {
        // The regular link transfers this exact variant to the selection page.
        location.assign(button.href);
      }
    });
  }
}
