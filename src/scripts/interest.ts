import { parseInterestContext, partnerTypes, type InterestContext } from '../data/interest-context';
import { analyticsConfig } from '../config/analytics';
import { trackGoal, type GoalParams } from './analytics';
import { estimateDelivery } from '../data/pricing';
import { occasionMemory } from './occasion';

export type InterestSelection = { id: string; value?: string | number; weight?: number; quantity: number };
type Item = { id: string; value: string; quantity: number };
type Variant = { value: string; label: string; price: number };
type Product = { id: string; name: string; variants: Variant[] };
type Payload = { version: 1; requestId: string; city: string; items: Item[]; desiredDate: string; delivery: string; priceConsent: true; website: string; context?: InterestContext };
const dialog = document.querySelector<HTMLDialogElement>('#interest-dialog');
const form = document.querySelector<HTMLFormElement>('#interest-form');
const cities = ['Зеленоградск', 'Калининград', 'Светлогорск'];
let selected: Item[] = [];
let started = false;
let pending = false;
let saved = false;
let attempt: { fingerprint: string; payload: Payload } | undefined;
let previousFocus: HTMLElement | null = null;
let partnerPrefilled = false;

function catalog(): Product[] {
  try {
    const data: unknown = JSON.parse(document.querySelector('#catalog-data')?.textContent || '[]');
    const entries = Array.isArray(data) ? data : (data as { products?: unknown[] })?.products;
    if (!Array.isArray(entries)) return [];
    return entries.flatMap((entry: Record<string, unknown>) => {
      if (typeof entry.id !== 'string' || typeof entry.name !== 'string') return [];
      const variants = Array.isArray(entry.variants) ? entry.variants.flatMap((variant: Record<string, unknown>) =>
        (typeof variant.value === 'string' || typeof variant.value === 'number') && typeof variant.label === 'string' && typeof variant.price === 'number' && Number.isFinite(variant.price)
          ? [{ value: String(variant.value), label: variant.label, price: variant.price }] : [])
        : Object.entries((entry.prices || {}) as Record<string, number>).filter(([, price]) => Number.isFinite(price)).map(([value, price]) => ({ value, label: value === '1000' ? '1 кг' : `${value} г`, price }));
      return [{ id: entry.id, name: entry.name, variants }];
    });
  } catch { return []; }
}

function money(value: number): string { return `${value.toLocaleString('ru-RU')} ₽`; }
function totals(): number {
  const products = catalog();
  return selected.reduce((sum, item) => sum + (products.find(p => p.id === item.id)?.variants.find(v => v.value === item.value)?.price || 0) * item.quantity, 0);
}
function updateEstimate(): void {
  const delivery = estimateDelivery(field<HTMLSelectElement>('city')?.value || '', field<HTMLSelectElement>('delivery')?.value || '');
  const subtotal = totals();
  const receiving = dialog?.querySelector<HTMLElement>('[data-interest-delivery]');
  const total = dialog?.querySelector<HTMLElement>('[data-interest-grand-total]');
  if (receiving) receiving.textContent = delivery === null ? 'Ещё не выбран способ' : delivery === 0 ? 'Самовывоз · без доплаты' : `Доставка ≈ ${money(delivery)}`;
  if (total) total.textContent = delivery === null ? `${money(subtotal)} + получение` : money(subtotal + delivery);
}
function params(requestId?: string): GoalParams {
  return { city: field<HTMLSelectElement>('city')?.value, productid: selected.map(i => i.id), variant: selected.map(i => i.value), qty: selected.map(i => i.quantity), value: totals(), occasion: field<HTMLSelectElement>('occasion')?.value, preferred_time: field<HTMLSelectElement>('preferredTime')?.value, partner_type: field<HTMLSelectElement>('partnerType')?.value, ...(requestId ? { requestId } : {}) };
}
function field<T extends HTMLElement = HTMLInputElement>(name: string): T | null { return form?.elements.namedItem(name) as T | null; }
function status(message: string): void { const el = dialog?.querySelector<HTMLElement>('[data-interest-status]'); if (el) el.textContent = message; }
function clearErrors(): void {
  form?.querySelectorAll<HTMLElement>('[data-error]').forEach(el => { el.textContent = ''; });
  form?.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
}
function showErrors(errors: Record<string, string>): void {
  clearErrors();
  for (const [name, message] of Object.entries(errors)) {
    const target = form?.querySelector<HTMLElement>(`[data-error="${name}"]`);
    if (target) target.textContent = message;
    field(name)?.setAttribute('aria-invalid', 'true');
    if (name === 'context') {
      const preferences = form?.querySelector<HTMLDetailsElement>('[data-interest-preferences]');
      if (preferences) preferences.open = true;
      field('occasion')?.setAttribute('aria-invalid', 'true');
    }
  }
  form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
function today(): string {
  // The service's local day, independent of the visitor's timezone.
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Kaliningrad', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Called by storefront, or by dispatching pirogorsk:order-open with { items, city }. */
export function openInterestForm(selection: InterestSelection[], city = 'Зеленоградск'): void {
  if (!dialog || !form || pending) return;
  const products = catalog();
  const merged = new Map<string, Item>();
  let invalid = !Array.isArray(selection) || selection.length === 0 || selection.length > 24;
  for (const entry of Array.isArray(selection) ? selection : []) {
    if (!entry || !Number.isSafeInteger(entry.quantity) || entry.quantity <= 0 || entry.quantity > 99) { invalid = true; continue; }
    const value = String(entry.value ?? entry.weight ?? '');
    if (!products.some(p => p.id === entry.id && p.variants.some(v => v.value === value))) { invalid = true; continue; }
    const key = `${entry.id}:${value}`;
    const quantity = (merged.get(key)?.quantity || 0) + entry.quantity;
    if (quantity > 99) invalid = true;
    merged.set(key, { id: entry.id, value, quantity });
  }
  selected = invalid ? [] : [...merged.values()];
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(current => { if (current !== dialog) current.close(); });
  if (saved) { form.reset(); attempt = undefined; partnerPrefilled = false; }
  saved = false;
  started = false;
  form.hidden = false;
  const success = dialog.querySelector<HTMLElement>('[data-interest-success]');
  if (success) success.hidden = true;
  const citySelect = field<HTMLSelectElement>('city');
  if (citySelect) citySelect.value = cities.includes(city) ? city : cities[0];
  const partner = new URL(location.href).searchParams.get('partner');
  if (!partnerPrefilled && partner && partnerTypes.some(([key]) => key === partner)) {
    field<HTMLSelectElement>('partnerType')!.value = partner;
    const preferences = form.querySelector<HTMLDetailsElement>('[data-interest-preferences]');
    if (preferences) preferences.open = true;
  }
  partnerPrefilled = true;
  const occasion = occasionMemory.current();
  if (occasion) {
    field<HTMLSelectElement>('occasion')!.value = occasion.value;
    const preferences = form.querySelector<HTMLDetailsElement>('[data-interest-preferences]');
    if (preferences) preferences.open = true;
    const note = form.querySelector<HTMLElement>('[data-interest-occasion-note]');
    if (note) {
      note.textContent = occasion.source === 'entry' ? 'Повод подставлен по тематической странице. Его можно изменить.' : 'Сохранили ваш выбор повода в этой вкладке. Его можно изменить.';
      note.hidden = false;
    }
  }
  const day = field<HTMLInputElement>('desiredDate');
  if (day) day.min = today();
  const list = dialog.querySelector('[data-interest-items]');
  list?.replaceChildren();
  for (const item of selected) {
    const product = products.find(p => p.id === item.id)!;
    const variant = product.variants.find(v => v.value === item.value)!;
    const li = document.createElement('li');
    li.textContent = `${product.name} · ${variant.label} × ${item.quantity} — ${money(variant.price * item.quantity)}`;
    list?.append(li);
  }
  const total = dialog.querySelector<HTMLElement>('[data-interest-total]');
  if (total) total.textContent = money(totals());
  updateEstimate();
  clearErrors();
  if (!selected.length) showErrors({ items: 'В подборке нет доступных товаров. Вернитесь в каталог и выберите товары.' });
  status(analyticsConfig.interestEndpoint ? '' : 'Сохранение заявок пока не подключено. Вернитесь позже.');
  const button = dialog.querySelector<HTMLButtonElement>('[data-interest-submit]');
  if (button) { button.disabled = !analyticsConfig.interestEndpoint || !selected.length; button.textContent = 'Оставить заявку'; }
  if (!dialog.open) dialog.showModal();
  trackGoal('order_form_open', params());
}

function validate(): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!selected.length) errors.items = 'Выберите хотя бы один товар в каталоге.';
  if (!cities.includes(field<HTMLSelectElement>('city')?.value || '')) errors.city = 'Выберите город из списка.';
  const date = field<HTMLInputElement>('desiredDate')?.value || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today() || !Number.isFinite(Date.parse(`${date}T12:00:00Z`))) errors.desiredDate = 'Выберите сегодняшний или будущий день.';
  if (!['pickup', 'delivery', 'undecided'].includes(field<HTMLSelectElement>('delivery')?.value || '')) errors.delivery = 'Выберите, как вам удобнее получить пироги.';
  if (!field<HTMLInputElement>('priceConsent')?.checked) errors.priceConsent = 'Подтвердите, что вам подходит ориентировочная стоимость.';
  return errors;
}

async function submit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!form || !dialog || pending || saved) return;
  const errors = validate();
  if (Object.keys(errors).length) { showErrors(errors); return; }
  clearErrors();
  if (!analyticsConfig.interestEndpoint) { status('Сохранение заявок пока не подключено. Заявка не отправлена.'); return; }
  const context = parseInterestContext({ occasion: field<HTMLSelectElement>('occasion')!.value, preferredTime: field<HTMLSelectElement>('preferredTime')!.value, partnerType: field<HTMLSelectElement>('partnerType')!.value });
  if (context === null) { showErrors({ context: 'Выберите пожелания из списка.' }); return; }
  const content = {
    version: 1 as const, city: field<HTMLSelectElement>('city')!.value, items: selected,
    desiredDate: field<HTMLInputElement>('desiredDate')!.value, delivery: field<HTMLSelectElement>('delivery')!.value,
    ...(context ? { context } : {}),
    priceConsent: true as const, website: field<HTMLInputElement>('website')?.value || '',
  };
  const fingerprint = JSON.stringify(content);
  if (!attempt || attempt.fingerprint !== fingerprint) attempt = { fingerprint, payload: { ...content, requestId: crypto.randomUUID() } };
  const payload = attempt.payload;
  pending = true;
  const fields = form.querySelector<HTMLFieldSetElement>('[data-interest-fields]')!;
  const button = form.querySelector<HTMLButtonElement>('[data-interest-submit]')!;
  fields.disabled = true;
  form.setAttribute('aria-busy', 'true');
  button.textContent = 'Сохраняем…';
  status('Отправляем заявку. Дождитесь подтверждения.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const endpoint = new URL(analyticsConfig.interestEndpoint, location.origin);
    if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))) throw new Error('configuration');
    const response = await fetch(endpoint.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'omit', cache: 'no-store', signal: controller.signal });
    const result: { ok?: boolean; saved?: boolean; requestId?: string; code?: string; fields?: Record<string, string> } = await response.json();
    if (!response.ok || result.ok !== true || result.saved !== true || result.requestId !== payload.requestId) {
      if (response.status === 422 && result.fields) showErrors(Object.fromEntries(Object.entries(result.fields).filter(([key]) => ['items', 'city', 'desiredDate', 'delivery', 'priceConsent', 'context'].includes(key))));
      if (response.status === 429) throw new Error('rate_limited');
      throw new Error('unconfirmed');
    }
    saved = true;
    form.hidden = true;
    const success = dialog.querySelector<HTMLElement>('[data-interest-success]')!;
    success.hidden = false;
    dialog.querySelector<HTMLElement>('[data-interest-request]')!.textContent = payload.requestId;
    dialog.querySelector<HTMLElement>('[data-interest-success-text]')!.textContent = 'Учли ваш выбор для будущего запуска. Номер ниже подтверждает сохранение заявки.';
    success.focus();
    trackGoal('order_submit', params(payload.requestId));
    document.dispatchEvent(new CustomEvent('pirogorsk:order-saved', { detail: { requestId: payload.requestId } }));
  } catch (error) {
    const limited = error instanceof Error && error.message === 'rate_limited';
    status(limited ? 'Слишком много заявок за короткое время. Попробуйте через 10 минут.' : 'Подтверждение не получено. Проверьте связь и нажмите «Повторить отправку». Повтор не создаст вторую заявку.');
    button.textContent = 'Повторить отправку';
    trackGoal('order_submit_error', params(payload.requestId));
  } finally {
    clearTimeout(timeout);
    pending = false;
    fields.disabled = false;
    form.removeAttribute('aria-busy');
    if (saved) button.textContent = 'Оставить заявку';
    else form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }
}

form?.addEventListener('submit', submit);
function start(event: Event): void {
  updateEstimate();
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
    if (target.name === 'occasion') {
      occasionMemory.choose(target.value);
      const note = form?.querySelector<HTMLElement>('[data-interest-occasion-note]');
      if (note) { note.textContent = 'Сохранили ваш выбор повода в этой вкладке. Его можно изменить.'; note.hidden = false; }
    }
    target.removeAttribute('aria-invalid');
    form?.querySelectorAll<HTMLElement>('[data-error]').forEach(error => { if (error.dataset.error === target.name) error.textContent = ''; });
  }
  if (!started && !saved) { started = true; trackGoal('order_form_start', params()); }
}
form?.addEventListener('input', start);
form?.addEventListener('change', start);
dialog?.querySelectorAll('[data-interest-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog?.addEventListener('close', () => {
  if (document.querySelector('dialog[open]')) return;
  const target = previousFocus?.isConnected && previousFocus.getClientRects().length
    ? previousFocus
    : document.querySelector<HTMLElement>('[data-open="selection-dialog"]');
  target?.focus({ preventScroll: true });
});
dialog?.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
document.addEventListener('pirogorsk:order-open', event => {
  const detail = (event as CustomEvent<{ items: InterestSelection[]; city?: string }>).detail;
  if (detail) openInterestForm(detail.items, detail.city);
});
