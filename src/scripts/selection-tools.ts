import type { Product } from '../data/catalog';
import { bundles } from '../data/bundles';
import { estimateDelivery } from '../data/pricing';
import { mergeSelection, selectionPrice, type SelectionItem } from '../lib/selection-offers';
import { compositionLink, readComposition, readCompositionLink, guestAdditions, type Composition } from '../lib/selection-tools';
import { parsePlan } from '../lib/pie-planner';
import { compositionSummary } from '../lib/composition-summary';

type Source = 'bundle' | 'addon' | 'favorite' | 'share';
type Tools = {
  products: Product[];
  getSelection: () => SelectionItem[];
  getCity: () => string;
  addItems: (items: SelectionItem[], mode: 'add' | 'ensure', source: Source, city?: string) => boolean;
  replaceItems: (items: SelectionItem[], source: Source, city?: string) => boolean;
  openDialog: (id: string) => void;
};

export function initSelectionTools(api: Tools) {
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const money = (price: number) => `${price.toLocaleString('ru-RU')} ₽`;
  const productFor = (item: SelectionItem) => api.products.find(product => product.id === item.id)!;
  const status = $('[data-tools-status]');
  const favoriteKey = 'pirogorsk-favorite';
  let preview: Composition | null = null;
  let previewSource: 'favorite' | 'share' = 'share';
  let draft: SelectionItem[] = [];
  const bundleForm = $<HTMLFormElement>('[data-bundle-form]');
  const guestForm = $<HTMLFormElement>('[data-guest-form]');
  const guestField = (name: string) => guestForm.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
  const numberField = (name: string) => Number(guestField(name).value);
  const guestChoice = () => { const [id, value] = guestField('drink').value.split(':'); return { id, value: Number(value) }; };
  const snapshot = (): Composition => ({ version: 1, city: api.getCity(), items: api.getSelection() });
  const params = new URLSearchParams(location.search);
  const plannedGuests = Number(params.get('guests'));
  try {
    const savedGuests = Number(sessionStorage.getItem('pirogorsk-guests'));
    if (Number.isSafeInteger(savedGuests) && savedGuests > 0) guestField('guests').value = String(savedGuests);
  } catch { /* The default count remains available. */ }
  if (params.get('interest') === 'calculator' && parsePlan(params.get('items'), api.products) && Number.isSafeInteger(plannedGuests) && plannedGuests >= 1 && plannedGuests <= 50) {
    guestField('guests').value = String(plannedGuests);
    try { sessionStorage.setItem('pirogorsk-guests', String(plannedGuests)); } catch { /* The transferred count remains available. */ }
  }

  function favorite() {
    try { return readComposition(JSON.parse(localStorage.getItem(favoriteKey) || 'null'), api.products); } catch { return null; }
  }
  function refreshTools() {
    const items = api.getSelection();
    $('[data-favorite-save]').hidden = items.length === 0;
    $('[data-share-selection]').hidden = items.length === 0;
    const saved = favorite();
    $('[data-favorite-bar]').hidden = !saved;
    if (saved) $('[data-favorite-caption]').textContent = `${saved.composition.items.reduce((sum, item) => sum + item.quantity, 0)} шт. · ${money(selectionPrice(saved.composition.items, api.products))}${saved.unavailable ? ` · недоступно: ${saved.unavailable}` : ''}`;
    $('[data-guest-tools]').hidden = !items.some(item => ['pie', 'bakery'].includes(productFor(item).kind));
    updateGuests();
  }
  function updateGuestPrice() {
    const drink = guestChoice();
    const bottles = numberField('bottles');
    const settings = numberField('settings');
    const total = Number.isSafeInteger(bottles) && Number.isSafeInteger(settings) && bottles >= 0 && settings >= 0
      ? selectionPrice([{ ...drink, quantity: bottles }, { id: 'tableware', value: 1, quantity: settings }], api.products) : 0;
    const button = $<HTMLButtonElement>('[data-guest-add]');
    button.textContent = total > 0 ? `Добавить за ${money(total)}` : 'Всё уже в подборке';
    button.disabled = bottles === 0 && settings === 0;
  }
  function updateGuests() {
    const estimate = guestAdditions(api.getSelection(), numberField('guests'), guestChoice().value);
    guestField('bottles').value = String(estimate.bottles);
    guestField('settings').value = String(estimate.settings);
    $('[data-guest-existing]').textContent = `В подборке: морс ${(estimate.selectedMl / 1000).toLocaleString('ru-RU')} л · посуда ${estimate.selectedSettings} наб.`;
    updateGuestPrice();
  }
  guestField('guests').addEventListener('input', () => {
    const guests = numberField('guests');
    if (Number.isSafeInteger(guests) && guests > 0) {
      try { sessionStorage.setItem('pirogorsk-guests', String(guests)); } catch { /* This visit remains usable. */ }
    }
    updateGuests();
  });
  guestField('drink').addEventListener('change', updateGuests);
  for (const name of ['bottles', 'settings']) guestField(name).addEventListener('input', updateGuestPrice);
  guestForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!guestForm.reportValidity()) return;
    const items: SelectionItem[] = [{ ...guestChoice(), quantity: numberField('bottles') }, { id: 'tableware', value: 1, quantity: numberField('settings') }].filter(item => item.quantity > 0);
    if (!items.length) return;
    $('[data-guest-status]').textContent = api.addItems(items, 'add', 'addon') ? 'Дополнения добавлены. Всё можно изменить в подборке.' : 'Не удалось добавить весь состав. Уменьшите количество и повторите.';
  });

  $('[data-favorite-save]').addEventListener('click', () => {
    if (!api.getSelection().length) return;
    try {
      localStorage.setItem(favoriteKey, JSON.stringify(snapshot()));
      status.textContent = 'Любимая подборка сохранена в этом браузере. Текущий состав можно менять независимо.';
      refreshTools();
    } catch { status.textContent = 'Браузер не разрешил сохранить любимую подборку. Вы можете поделиться ссылкой на состав.'; }
  });
  $('[data-favorite-delete]').addEventListener('click', () => {
    try { localStorage.removeItem(favoriteKey); status.textContent = 'Любимая подборка удалена. Текущая осталась на месте.'; refreshTools(); $(api.getSelection().length ? '[data-favorite-save]' : '#selection-dialog [data-go-catalog]').focus(); }
    catch { status.textContent = 'Браузер не разрешил удалить сохранённую подборку.'; }
  });
  $('[data-favorite-open]').addEventListener('click', () => {
    const saved = favorite();
    if (saved) showPreview(saved, 'favorite');
  });
  $('[data-share-selection]').addEventListener('click', async () => {
    if (!api.getSelection().length) return;
    const url = compositionLink(snapshot(), location.origin);
    const fallback = $<HTMLTextAreaElement>('[data-share-fallback]');
    fallback.hidden = true;
    try { await navigator.clipboard.writeText(url); status.textContent = 'Ссылка скопирована. По ней можно посмотреть и восстановить состав.'; }
    catch { fallback.value = url; fallback.hidden = false; fallback.focus(); fallback.select(); status.textContent = 'Ссылка выделена — скопируйте её.'; }
  });

  function showPreview(result: NonNullable<ReturnType<typeof readComposition>>, source: 'favorite' | 'share') {
    preview = result.composition;
    previewSource = source;
    $('#composition-preview-heading').textContent = source === 'favorite' ? 'Любимая подборка' : 'Подборка по ссылке';
    $('[data-preview-note]').textContent = `${preview.city}. Проверьте состав перед добавлением в свою подборку.`;
    $('[data-preview-unavailable]').textContent = result.unavailable ? `Позиции, которых больше нет в меню: ${result.unavailable}. Они не будут добавлены.` : '';
    $('[data-preview-status]').textContent = '';
    const list = $('[data-preview-items]');
    list.replaceChildren();
    for (const item of preview.items) {
      const product = productFor(item);
      const row = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = `${product.name} · ${product.variants.find(variant => variant.value === item.value)!.label} × ${item.quantity}`;
      const price = document.createElement('strong');
      price.textContent = money(selectionPrice([item], api.products));
      row.append(text, price); list.append(row);
    }
    $('[data-preview-total]').textContent = money(selectionPrice(preview.items, api.products));
    $('[data-preview-summary]').textContent = compositionSummary(preview.items, api.products)!.text;
    $('[data-preview-delivery]').textContent = `Доставка в ${preview.city}: ориентир ${money(estimateDelivery(preview.city, 'delivery')!)} один раз за итоговую подборку.`;
    document.querySelectorAll<HTMLButtonElement>('[data-preview-apply]').forEach(button => { button.disabled = !preview!.items.length; });
    api.openDialog('composition-preview');
  }
  document.querySelectorAll<HTMLButtonElement>('[data-preview-apply]').forEach(button => button.addEventListener('click', () => {
    if (!preview?.items.length) return;
    const ok = button.dataset.previewApply === 'replace' ? api.replaceItems(preview.items, previewSource, preview.city) : api.addItems(preview.items, 'ensure', previewSource, preview.city);
    if (!ok) { $('[data-preview-status]').textContent = 'Не удалось применить весь состав. В подборке может быть до 24 вариантов и 99 штук каждого. Измените текущую подборку или замените её.'; return; }
    api.openDialog('selection-dialog');
    $('[data-selection-feedback]').textContent = 'Состав применён. Цены — из текущего меню.';
    if (location.hash.startsWith('#selection=')) history.replaceState(history.state, '', location.pathname + location.search);
  }));

  function updateBundleTotal() {
    const merged = mergeSelection([], draft, api.products);
    $('[data-bundle-total]').textContent = merged ? money(selectionPrice(merged, api.products)) : 'Проверьте состав';
    $('[data-bundle-summary]').textContent = merged ? compositionSummary(merged, api.products)!.text : '';
    $('[data-bundle-status]').textContent = merged ? '' : 'В одном варианте может быть до 99 штук. Уменьшите количество.';
  }
  function renderDraft(focus?: { index: number; field: string }) {
    const container = $('[data-bundle-rows]');
    container.replaceChildren();
    draft.forEach((item, index) => {
      const row = document.createElement('fieldset'); row.className = 'bundle-edit-row'; row.dataset.bundleRow = String(index);
      const legend = document.createElement('legend'); legend.textContent = `Пирог ${index + 1}`; row.append(legend);
      const productLabel = document.createElement('label'); productLabel.textContent = 'Пирог';
      const productSelect = document.createElement('select'); productSelect.dataset.bundleField = 'id';
      for (const product of api.products.filter(product => ['pie', 'bakery'].includes(product.kind))) productSelect.add(new Option(product.name, product.id));
      productSelect.value = item.id; productLabel.append(productSelect); row.append(productLabel);
      const fields = document.createElement('div'); fields.className = 'selection-fields';
      const variantLabel = document.createElement('label'); variantLabel.textContent = 'Формат';
      const variantSelect = document.createElement('select'); variantSelect.dataset.bundleField = 'value';
      for (const variant of productFor(item).variants) variantSelect.add(new Option(`${variant.label} · ${money(variant.price)}`, String(variant.value)));
      variantSelect.value = String(item.value); variantLabel.append(variantSelect);
      const quantityLabel = document.createElement('label'); quantityLabel.textContent = 'Количество';
      const quantity = document.createElement('input'); quantity.type = 'number'; quantity.min = '1'; quantity.max = '99'; quantity.step = '1'; quantity.required = true; quantity.inputMode = 'numeric'; quantity.value = String(item.quantity); quantity.dataset.bundleField = 'quantity'; quantityLabel.append(quantity);
      fields.append(variantLabel, quantityLabel); row.append(fields);
      const remove = document.createElement('button'); remove.type = 'button'; remove.dataset.bundleRowRemove = String(index); remove.className = 'composition-text-button'; remove.textContent = 'Убрать'; remove.setAttribute('aria-label', `Убрать пирог ${index + 1}`); remove.disabled = draft.length === 1; row.append(remove);
      container.append(row);
    });
    $<HTMLButtonElement>('[data-bundle-row-add]').disabled = draft.length >= 24;
    updateBundleTotal();
    if (focus) container.querySelector<HTMLElement>(`[data-bundle-row="${focus.index}"] [data-bundle-field="${focus.field}"]`)?.focus({ preventScroll: true });
  }
  function editBundle(id: string) {
    const bundle = bundles.find(bundle => bundle.id === id);
    if (!bundle) return;
    draft = bundle.items.map(item => ({ ...item }));
    $('#bundle-editor-heading').textContent = bundle.title;
    renderDraft(); api.openDialog('bundle-editor');
  }
  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-edit-bundle]') : null;
    if (!trigger || (event instanceof MouseEvent && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey))) return;
    event.preventDefault(); editBundle(trigger.dataset.editBundle!);
  });
  bundleForm.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.bundleField !== 'quantity') return;
    const index = Number(input.closest<HTMLElement>('[data-bundle-row]')!.dataset.bundleRow);
    draft[index].quantity = Number(input.value); updateBundleTotal();
  });
  bundleForm.addEventListener('change', event => {
    const input = event.target as HTMLSelectElement;
    const field = input.dataset.bundleField;
    if (field !== 'id' && field !== 'value') return;
    const index = Number(input.closest<HTMLElement>('[data-bundle-row]')!.dataset.bundleRow);
    if (field === 'id') {
      const product = api.products.find(product => product.id === input.value)!;
      draft[index] = { id: product.id, value: product.variants.some(variant => variant.value === draft[index].value) ? draft[index].value : product.variants[0].value, quantity: draft[index].quantity };
      renderDraft({ index, field: 'value' });
    } else { draft[index].value = Number(input.value); updateBundleTotal(); }
  });
  bundleForm.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-bundle-row-remove]') : null;
    if (!button || draft.length <= 1) return;
    const index = Number(button.dataset.bundleRowRemove); draft.splice(index, 1); renderDraft({ index: Math.min(index, draft.length - 1), field: 'id' });
  });
  $('[data-bundle-row-add]').addEventListener('click', () => {
    if (draft.length >= 24) return;
    draft.push({ id: 'meat', value: 500, quantity: 1 }); renderDraft({ index: draft.length - 1, field: 'id' });
  });
  bundleForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!bundleForm.reportValidity()) return;
    const items = mergeSelection([], draft, api.products);
    if (!items || !api.addItems(items, 'add', 'bundle')) { $('[data-bundle-status]').textContent = 'Весь состав не добавлен. Проверьте количество и размер текущей подборки.'; return; }
    api.openDialog('selection-dialog'); $('[data-selection-feedback]').textContent = 'Ваш состав добавлен в подборку.';
  });

  function openLink() {
    if (!location.hash.startsWith('#selection=')) return;
    const result = readCompositionLink(location.hash, api.products);
    if (result) showPreview(result, 'share');
    else { api.openDialog('selection-dialog'); status.textContent = 'Не удалось прочитать ссылку. Текущая подборка сохранена; выберите пироги в меню.'; }
  }
  window.addEventListener('pirogorsk:selection-updated', refreshTools);
  window.addEventListener('storage', event => { if (event.key === null || event.key === favoriteKey) refreshTools(); });
  window.addEventListener('hashchange', openLink);
  window.addEventListener('focus', refreshTools);
  refreshTools();
  if (params.get('interest') === 'edit-bundle') editBundle(params.get('bundle') || '');
  openLink();
}
