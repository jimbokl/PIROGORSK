import type { Product } from '../data/catalog';
import { trackGoal } from './analytics';
import { editorialCityIntents, editorialScenarioIntents } from '../data/editorial-intents';
import { parsePlan } from '../lib/pie-planner';

type Selection = { id: string; value: number; quantity: number };
const products: Product[] = JSON.parse(document.querySelector('#catalog-data')?.textContent || '[]');
const selection: Selection[] = [];
try {
  const saved: unknown = JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]');
  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (!item || typeof item !== 'object') continue;
      const value = Number(item.value ?? item.weight);
      const product = products.find(product => product.id === item.id);
      if (!product?.variants.some(variant => variant.value === value) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) continue;
      const existing = selection.find(entry => entry.id === item.id && entry.value === value);
      if (existing) existing.quantity = Math.min(99, existing.quantity + item.quantity);
      else if (selection.length < 24) selection.push({ id: item.id, value, quantity: item.quantity });
    }
  }
} catch { /* A fresh selection is available when storage is unavailable or invalid. */ }
const money = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;
const weightLabel = (weight: number) => weight < 1000 ? `${weight} г` : `${(weight / 1000).toLocaleString('ru-RU')} кг`;
const variantLabel = (product: Product, value: number) => product.variants.find(variant => variant.value === value)?.label || '';
const productFor = (item: Selection) => products.find(product => product.id === item.id)!;
const all = <T extends HTMLElement = HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
let city = 'Зеленоградск';
let toastTimer: ReturnType<typeof setTimeout>;
const dialogTriggers = new WeakMap<HTMLDialogElement, HTMLElement>();
const itemContainer = document.querySelector<HTMLElement>('[data-selection-items]')!;

function toast(message: string) {
  const element = document.querySelector<HTMLElement>('[data-toast]')!;
  clearTimeout(toastTimer);
  element.textContent = message;
  element.classList.add('visible');
  toastTimer = setTimeout(() => element.classList.remove('visible'), 2400);
}

function openDialog(id: string) {
  const dialog = document.getElementById(id) as HTMLDialogElement | null;
  if (!dialog) return;
  const active = document.activeElement;
  const trigger = active instanceof HTMLElement && active !== document.body && !active.closest('dialog')
    ? active
    : document.querySelector<HTMLElement>(`[data-open="${id}"]`);
  if (trigger) dialogTriggers.set(dialog, trigger);
  all<HTMLDialogElement>('dialog[open]').forEach(current => current.close());
  if (id === 'selection-dialog') renderSelection();
  dialog.showModal();
}

function setCity(value: string, announce = true) {
  if (!['Зеленоградск', 'Калининград', 'Светлогорск'].includes(value)) return;
  city = value;
  all('[data-city]').forEach(element => element.textContent = city);
  all('[data-select-city]').forEach(element => {
    if (element.closest('.city-options')) element.setAttribute('aria-pressed', String(element.dataset.selectCity === city));
  });
  try { localStorage.setItem('pirogorsk-city', city); } catch { /* The city still works when storage is unavailable. */ }
  document.querySelector<HTMLDialogElement>('#city-dialog')?.close();
  if (announce) toast(`Ваш город — ${city}`);
}

function addProduct(id: string, value: number) {
  const product = products.find(product => product.id === id);
  if (!product?.variants.some(variant => variant.value === value)) return false;
  const existing = selection.find(item => item.id === id && item.value === value);
  if (existing && existing.quantity >= 99) { toast('В подборке уже 99 таких товаров'); return false; }
  if (!existing && selection.length >= 24) { toast('В подборке уже 24 разных варианта'); return false; }
  if (existing) existing.quantity += 1;
  else selection.push({ id, value, quantity: 1 });
  updateBadge();
  trackGoal('catalog_add', { city, productid: id, variant: String(value), qty: 1, value: product.prices[Number(value)] });
  return true;
}

function updateBadge() {
  try { localStorage.setItem('pirogorsk-selection', JSON.stringify(selection)); } catch { /* In-memory selection remains available. */ }
  const count = selection.reduce((sum, item) => sum + item.quantity, 0);
  all('[data-count]').forEach(element => { element.textContent = String(count); element.hidden = count === 0; });
  document.querySelector('[data-open="selection-dialog"]')?.setAttribute('aria-label', count ? `Подборка: ${count} шт.` : 'Подборка, открыть');
}

function renderSelection() {
  itemContainer.replaceChildren();
  const summary = document.querySelector<HTMLElement>('.selection-summary')!;
  summary.hidden = selection.length === 0;
  document.querySelector<HTMLElement>('[data-copy-fallback]')!.hidden = true;
  document.querySelector<HTMLElement>('[data-copy] span:not(.icon)')!.textContent = 'Скопировать подборку';
  if (!selection.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-selection';
    empty.innerHTML = '<p>Здесь будут ваши пироги</p><p>Начните с любимой начинки.<br>А размер выберем под компанию.</p><button class="button" data-go-catalog>Выбрать пирог</button>';
    itemContainer.append(empty);
    return;
  }
  for (const item of selection) {
    const product = products.find(product => product.id === item.id)!;
    const element = document.createElement('div');
    element.className = 'selection-item';
    element.dataset.item = `${item.id}-${item.value}`;
    const template = document.querySelector<HTMLTemplateElement>('#selection-item-template')!;
    element.append(template.content.cloneNode(true));
    element.querySelector('h3')!.textContent = product.name;
    element.querySelector('small')!.textContent = `${variantLabel(product, item.value)} · ${money(product.prices[item.value])}`;
    element.querySelector('output')!.textContent = String(item.quantity);
    element.querySelector('[data-item-price]')!.textContent = money(product.prices[item.value] * item.quantity);
    element.querySelector('[data-decrease]')!.setAttribute('aria-label', `Уменьшить: ${product.name}, ${variantLabel(product, item.value)}`);
    element.querySelector('[data-increase]')!.setAttribute('aria-label', `Увеличить: ${product.name}, ${variantLabel(product, item.value)}`);
    element.querySelector('[data-remove]')!.setAttribute('aria-label', `Убрать: ${product.name}, ${variantLabel(product, item.value)}`);
    itemContainer.append(element);
  }
  const total = selection.reduce((sum, item) => sum + products.find(product => product.id === item.id)!.prices[item.value] * item.quantity, 0);
  const totalWeight = selection.reduce((sum, item) => sum + (productFor(item).kind === 'pie' ? item.value * item.quantity : 0), 0);
  const drinks = selection.reduce((sum, item) => sum + (productFor(item).kind === 'drink' ? item.value * item.quantity : 0), 0);
  const accessories = selection.reduce((sum, item) => sum + (productFor(item).kind === 'accessory' ? item.quantity : 0), 0);
  document.querySelector('[data-total]')!.textContent = money(total);
  document.querySelector('[data-total-weight]')!.textContent = [totalWeight ? `Пироги — ${weightLabel(totalWeight)}` : '', drinks ? `Напитки — ${(drinks / 1000).toLocaleString('ru-RU')} л` : '', accessories ? `Посуда — ${accessories} наб.` : ''].filter(Boolean).join(' · ');
}

all('[data-open]').forEach(button => button.addEventListener('click', () => openDialog(button.dataset.open!)));
all('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
all<HTMLDialogElement>('dialog').forEach(dialog => {
  dialog.addEventListener('close', () => {
    if (document.querySelector('dialog[open]')) return;
    const trigger = dialogTriggers.get(dialog);
    if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) dialog.close();
  });
});
all('[data-select-city]').forEach(button => button.addEventListener('click', () => setCity(button.dataset.selectCity!)));
try { setCity(localStorage.getItem('pirogorsk-city') || city, false); } catch { /* Default city remains usable. */ }

all('[data-filter]').forEach(button => button.addEventListener('click', () => {
  all('[data-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
  all('#pirogi [data-product]').forEach(card => card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter);
}));

all('[data-product]').forEach(card => {
  const product = products.find(product => product.id === card.dataset.product)!;
  card.addEventListener('change', () => {
    const value = card.querySelector<HTMLInputElement>('input:checked')!.value;
    card.querySelector('[data-price]')!.textContent = money(product.prices[Number(value)]);
  });
  card.querySelector<HTMLButtonElement>('[data-add]')!.addEventListener('click', event => {
    const button = event.currentTarget as HTMLButtonElement;
    const value = Number(card.querySelector<HTMLInputElement>('input:checked')!.value);
    if (!addProduct(product.id, value)) return;
    button.classList.add('added');
    button.querySelector('span:not(.icon)')!.textContent = 'Добавлен';
    toast(`${product.name}, ${variantLabel(product, value)} — в подборке`);
    setTimeout(() => { button.classList.remove('added'); button.querySelector('span:not(.icon)')!.textContent = 'В подборку'; }, 1500);
  });
});

all('[data-preset]').forEach(button => button.addEventListener('click', () => {
  const preset: [string, 500 | 1000][] = button.dataset.preset === 'dinner'
    ? [['meat', 500], ['cheese', 500]]
    : [['meat', 1000], ['fish', 1000], ['cabbage', 1000]];
  preset.forEach(([id, weight]) => addProduct(id, weight));
  openDialog('selection-dialog');
}));

function goToCatalog() {
  all<HTMLDialogElement>('dialog[open]').forEach(dialog => dialog.close());
  document.querySelector('#pirogi')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
document.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  if (target.closest('[data-go-catalog], [data-custom-bundle]')) goToCatalog();
  const control = target.closest<HTMLElement>('[data-decrease], [data-increase], [data-remove]');
  if (!control) return;
  const row = control.closest<HTMLElement>('[data-item]')!;
  const itemIndex = selection.findIndex(item => `${item.id}-${item.value}` === row.dataset.item);
  if (itemIndex < 0) return;
  const action = control.hasAttribute('data-increase') ? 'increase' : control.hasAttribute('data-decrease') ? 'decrease' : 'remove';
  const rowIndex = [...itemContainer.children].indexOf(row);
  if (action === 'remove' || (action === 'decrease' && selection[itemIndex].quantity === 1)) selection.splice(itemIndex, 1);
  else if (action === 'increase' && selection[itemIndex].quantity >= 99) { toast('Можно выбрать до 99 таких товаров'); return; }
  else selection[itemIndex].quantity += action === 'increase' ? 1 : -1;
  updateBadge();
  renderSelection();
  const nextRow = itemContainer.children[Math.min(rowIndex, itemContainer.children.length - 1)];
  (nextRow?.querySelector(`[data-${action}]`) as HTMLButtonElement | null)?.focus();
});

document.querySelector('[data-copy]')!.addEventListener('click', async () => {
  const lines = selection.map(item => {
    const product = products.find(product => product.id === item.id)!;
    return `${product.name} · ${variantLabel(product, item.value)} × ${item.quantity} — ${money(product.prices[item.value] * item.quantity)}`;
  });
  const text = `Пирогорск · ${city}\n\n${lines.join('\n')}\n\nИтого: ${document.querySelector('[data-total]')!.textContent}\nЦены предварительные. Приём заказов пока не открыт.\nhttps://pirogorsk.ru/`;
  try {
    await navigator.clipboard.writeText(text);
    document.querySelector<HTMLElement>('[data-copy] span:not(.icon)')!.textContent = 'Подборка скопирована';
  } catch {
    const fallback = document.querySelector<HTMLTextAreaElement>('[data-copy-fallback]')!;
    fallback.value = text;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    document.querySelector<HTMLElement>('[data-copy] span:not(.icon)')!.textContent = 'Выделили текст — скопируйте';
  }
});

updateBadge();

all('[data-order]').forEach(button => button.addEventListener('click', () => {
  if (!selection.length) { goToCatalog(); return; }
  document.dispatchEvent(new CustomEvent('pirogorsk:order-open', { detail: { items: selection.map(item => ({ ...item })), city } }));
}));
const interestParams = new URLSearchParams(location.search);
const interestId = interestParams.get('interest');
if (interestId === 'calculator') {
  const planned = parsePlan(interestParams.get('items'), products);
  if (planned) {
    const cityNames: Record<string, string> = { zelenogradsk: 'Зеленоградск', kaliningrad: 'Калининград', svetlogorsk: 'Светлогорск' };
    const plannedCity = interestParams.get('city');
    if (plannedCity && Object.hasOwn(cityNames, plannedCity)) setCity(cityNames[plannedCity], false);
    // Applying a calculated set means the exact displayed composition, including on reload.
    selection.splice(0, selection.length, ...planned);
    updateBadge();
    openDialog('selection-dialog');
  } else toast('Не удалось прочитать подборку. Выберите пироги в меню.');
} else if (interestId && Object.hasOwn(editorialCityIntents, interestId)) {
  setCity(editorialCityIntents[interestId as keyof typeof editorialCityIntents], false);
  openDialog('selection-dialog');
} else if (interestId && Object.hasOwn(editorialScenarioIntents, interestId)) {
  const scenario = editorialScenarioIntents[interestId as keyof typeof editorialScenarioIntents];
  for (const item of scenario.items) {
    if (!selection.some(existing => existing.id === item.id && existing.value === item.value)) {
      addProduct(item.id, item.value);
    }
  }
  openDialog('selection-dialog');
} else if (interestId && products.some(product => product.id === interestId)) {
  const product = products.find(product => product.id === interestId)!;
  const variant = Number(interestParams.get('variant'));
  const card = all('[data-product]').find(card => card.dataset.product === interestId);
  if (product.variants.some(item => item.value === variant)) {
    // The product-page CTA explicitly adds this size. Reloading that URL keeps
    // the same selection instead of increasing its quantity again.
    const input = card?.querySelector<HTMLInputElement>(`input[value="${variant}"]`);
    if (input) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
    if (!selection.some(item => item.id === interestId && item.value === variant)) addProduct(interestId, variant);
    openDialog('selection-dialog');
  } else {
    card?.scrollIntoView({ block: 'center' });
    card?.querySelector<HTMLButtonElement>('[data-add]')?.focus({ preventScroll: true });
  }
}
