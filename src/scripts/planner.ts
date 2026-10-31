import { planPies } from '../lib/pie-planner';
import type { Product } from '../data/catalog';
import { occasionPresets } from '../data/occasion-presets';
import {trackGoal} from './analytics';

const form = document.querySelector<HTMLFormElement>('[data-planner-form]')!;
const catalog: Product[] = JSON.parse(document.getElementById('planner-catalog')!.textContent!);
const error = document.querySelector<HTMLElement>('[data-planner-error]')!;
const link = document.querySelector<HTMLAnchorElement>('[data-planner-continue]')!;
const weight = (grams: number) => (grams / 1000).toLocaleString('ru-RU');
const money = (price: number) => `${price.toLocaleString('ru-RU')} ₽`;
const preset = occasionPresets.find(item => item.slug === new URLSearchParams(location.search).get('occasion'));
if (preset) {
  form.querySelector<HTMLInputElement>('[name="guests"]')!.value = String(preset.guests);
  form.querySelector<HTMLSelectElement>('[name="grams"]')!.value = String(preset.grams);
  form.querySelectorAll<HTMLInputElement>('[name="flavour"]').forEach(input => { input.checked = (preset.ids as readonly string[]).includes(input.value); });
  const label = document.querySelector<HTMLElement>('[data-planner-occasion]')!;
  label.textContent = `Открыт пример: ${preset.label}. Все параметры можно изменить.`;
  label.hidden = false;
}
function update() {
  const fields = new FormData(form);
  try {
    const guests = Number(fields.get('guests'));
    const grams = Number(fields.get('grams'));
    const plan = planPies(guests, grams, fields.getAll('flavour').map(String), catalog);
    document.querySelector('[data-planner-weight]')!.textContent = weight(plan.weight);
    document.querySelector('[data-planner-formula]')!.textContent = `${guests} чел. × ${grams} г = ${weight(plan.requested)} кг.${plan.requested !== plan.weight ? ` Округляем вверх до ${weight(plan.weight)} кг.` : ' Округление не требуется.'}`;
    document.querySelector('[data-planner-total]')!.textContent = money(plan.total);
    const list = document.querySelector('[data-planner-items]')!;
    list.replaceChildren(...plan.items.map(item => {
      const product = catalog.find(product => product.id === item.id)!;
      const row = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = `${product.name} · ${item.value === 1000 ? '1 кг' : '500 г'} × ${item.quantity}`;
      const price = document.createElement('span');
      price.textContent = money(product.prices[item.value] * item.quantity);
      row.append(name, price);
      return row;
    }));
    const params = new URLSearchParams({ interest: 'calculator', items: plan.items.map(item => `${item.id}:${item.value}:${item.quantity}`).join(','), city: String(fields.get('city')), guests: String(guests) });
    link.href = `/?${params}#pirogi`;
    link.removeAttribute('aria-disabled');
    error.hidden = true;
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : 'Проверьте параметры.';
    error.hidden = false;
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
  }
}
let interacted=false;
form.addEventListener('input', () => {update();if(!interacted){trackGoal('calculator_interact');interacted=true;}});
form.addEventListener('change', update);
form.addEventListener('submit', event => event.preventDefault());
link.addEventListener('click',()=>{if(link.hasAttribute('href'))trackGoal('calc_apply_set');});
update();
