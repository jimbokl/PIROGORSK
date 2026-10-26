import { planPies } from '../lib/pie-planner';
import { trackGoal } from './analytics';
type Pie = { id: string; name: string; kind: string; variants: { value: number; price: number }[] };
const money = (value: number) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)} ₽`;
for (const root of document.querySelectorAll<HTMLElement>('[data-party]')) {
  const form = root.querySelector<HTMLFormElement>('[data-party-form]')!;
  const pies: Pie[] = JSON.parse(root.querySelector('[data-party-catalog]')!.textContent!);
  const apply = root.querySelector<HTMLAnchorElement>('[data-party-apply]')!;
  const error = root.querySelector<HTMLElement>('[data-party-error]')!;
  let interacted = false;
  function update() {
    const values = new FormData(form), guests = Number(values.get('guests')), grams = Number(values.get('grams'));
    root.querySelector('[data-guests]')!.textContent = String(guests);
    try {
      const result = planPies(guests, grams, values.getAll('flavour').map(String), pies);
      root.querySelector('[data-party-person]')!.textContent = money(Math.ceil(result.total / guests));
      root.querySelector('[data-party-summary]')!.textContent = `${result.requested} г по порции → ${result.weight} г в подборке · ${money(result.total)}`;
      root.querySelector('[data-party-items]')!.replaceChildren(...result.items.map(i => {
        const li = document.createElement('li'); li.textContent = `${pies.find(p => p.id === i.id)!.name} · ${i.value === 1000 ? '1 кг' : '500 г'} × ${i.quantity}`; return li;
      }));
      apply.href = `/?${new URLSearchParams({ interest: 'calculator', city: root.dataset.citySlug!, items: result.items.map(i => `${i.id}:${i.value}:${i.quantity}`).join(',') })}#pirogi`;
      apply.removeAttribute('aria-disabled'); error.textContent = '';
    } catch { root.querySelector('[data-party-person]')!.textContent = '—'; root.querySelector('[data-party-summary]')!.textContent = 'Расчёт появится после выбора начинки.'; root.querySelector('[data-party-items]')!.replaceChildren(); error.textContent = 'Выберите хотя бы одну начинку — тогда сможем посчитать набор.'; apply.removeAttribute('href'); apply.setAttribute('aria-disabled','true'); }
  }
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', () => { update(); if (!interacted) { trackGoal('calculator_interact', {city:root.dataset.city}); interacted=true; } });
  apply.addEventListener('click', () => { if (apply.hasAttribute('href')) trackGoal('calc_apply_set', {city:root.dataset.city}); });
}
