import { planPies } from '../lib/pie-planner';
import type { Product } from '../data/catalog';

const form = document.querySelector<HTMLFormElement>('[data-planner-form]')!;
const catalog: Product[] = JSON.parse(document.getElementById('planner-catalog')!.textContent!);
const error = document.querySelector<HTMLElement>('[data-planner-error]')!;
const link = document.querySelector<HTMLAnchorElement>('[data-planner-continue]')!;
const weight = (grams: number) => (grams / 1000).toLocaleString('ru-RU');
const money = (price: number) => `${price.toLocaleString('ru-RU')} ₽`;
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
    const params = new URLSearchParams({ interest: 'calculator', items: plan.items.map(item => `${item.id}:${item.value}:${item.quantity}`).join(','), city: String(fields.get('city')) });
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
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', event => event.preventDefault());
update();
