import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const knownQaIds = ['bae9085e-2379-4c2b-9c32-c9f6f9c7dad8', '1d6b3ff8-e23e-44cb-bcdb-5d98cc84c578', '609e574e-b81e-4ca3-91a8-c6dddf38aba1'];
function validDay(day) { return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(`${day}T00:00:00Z`)) && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day; }
export function reportQuery(from, to) {
  if (!validDay(from) || !validDay(to) || from > to) throw Error('Use a valid inclusive --from=YYYY-MM-DD --to=YYYY-MM-DD range.');
  const start = Date.parse(`${from}T00:00:00Z`) - 7200000;
  const end = Date.parse(`${to}T00:00:00Z`) + 86400000 - 7200000;
  return `SELECT date(i.created_at / 1000, 'unixepoch', '+2 hours') AS day, i.city,
    COALESCE(p.occasion, 'undecided') AS occasion, COALESCE(p.preferred_time, 'undecided') AS preferred_time,
    COALESCE(a.channel, 'untagged') AS channel, COALESCE(a.partner_code, 'none') AS partner_code,
    COUNT(*) AS interests, SUM(i.value_total) AS selection_value
    FROM interests i LEFT JOIN interest_preferences p USING(request_id) LEFT JOIN interest_attribution a USING(request_id)
    WHERE i.created_at >= ${start} AND i.created_at < ${end}
    AND i.request_id NOT IN (${knownQaIds.map(id => `'${id}'`).join(',')})
    GROUP BY 1,2,3,4,5,6 ORDER BY 1,2,3,4,5,6;`;
}
const labels = { zelenogradsk: 'Зеленоградск', kaliningrad: 'Калининград', svetlogorsk: 'Светлогорск', undecided: 'Не указан', dinner: 'Ужин дома', apartments: 'Апартаменты', picnic: 'Пикник', company: 'На компанию', gift: 'В подарок', morning: 'Утро', day: 'День', evening: 'Вечер', qr: 'QR', telegram: 'Telegram', partner: 'Партнёрский переход', scenario: 'Сценарий на сайте', untagged: 'Без метки', none: 'Без кода' };
const esc = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export function renderReport(rows, { from, to, capturedAt = new Date().toISOString() }) {
  reportQuery(from, to);
  const fields = [['city', 'Город'], ['occasion', 'Повод'], ['preferred_time', 'Желаемое время'], ['channel', 'Источник'], ['partner_code', 'Код']];
  const label = value => labels[value] || value;
  const options = fields.map(([key, name]) => `<label>${name}<select data-filter="${key}"><option value="">Все</option>${[...new Set(rows.map(row => row[key]))].sort().map(value => `<option value="${esc(value)}">${esc(label(value))}</option>`).join('')}</select></label>`).join('');
  const table = rows.map(row => `<tr ${fields.map(([key]) => `data-${key.replaceAll('_', '-')}="${esc(row[key])}"`).join(' ')} data-count="${Number(row.interests)}" data-value="${Number(row.selection_value)}"><td>${esc(row.day)}</td>${fields.map(([key]) => `<td>${esc(label(row[key]))}</td>`).join('')}<td>${Number(row.interests)}</td><td>${Number(row.selection_value).toLocaleString('ru-RU')} ₽</td></tr>`).join('');
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Пирогорск · интерес к меню</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#17253b;font:16px/1.55 system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:40px 24px}h1{font-size:clamp(28px,5vw,42px);line-height:1.15;letter-spacing:-.035em}small,p{color:#4f5c70}header{max-width:850px}.filters{display:flex;gap:16px;flex-wrap:wrap;padding:24px 0}label{display:grid;gap:6px;font-size:14px}select{min-width:160px;max-width:100%;min-height:44px;border:1px solid #c8ced8;border-radius:12px;background:white;color:inherit;padding:8px}select:focus-visible,.table:focus-visible{outline:3px solid #256fbc;outline-offset:3px}.stats{display:flex;gap:32px;flex-wrap:wrap;background:white;padding:24px;border-radius:20px;margin-bottom:24px}.stats strong{display:block;font-size:30px}.stats span{font-size:14px}.table{overflow:auto;border:1px solid #dbe0e7;border-radius:16px;background:white}table{border-collapse:collapse;width:100%;white-space:nowrap}th,td{text-align:left;padding:14px 16px;border-bottom:1px solid #e4e8ee}th{font-size:13px;color:#4f5c70}caption{text-align:left;padding:16px;font-weight:600}tr[hidden]{display:none}@media(max-width:500px){main{padding:24px 16px}.filters label{width:calc(50% - 8px)}select{min-width:0;width:100%}.stats{gap:16px}.stats strong{font-size:26px}}
  </style><main><header><small>ПИРОГОРСК · ВНУТРЕННИЙ СРЕЗ</small><h1>Что выбирают в меню</h1><p>${esc(from)} — ${esc(to)}, календарные дни Калининграда (UTC+2). Срез: ${esc(capturedAt)}.</p><p>Сохранения анонимного интереса, а не заказы или выручка. Известные три QA-заявки исключены. Непомеченные визиты владельца и проверки могут оставаться. Старым заявкам источник и повод не приписываются.</p></header><div class="filters">${options}</div><div class="stats" role="status" aria-live="polite"><div><strong id="count">0</strong><span>сохранений интереса</span></div><div><strong id="value">0 ₽</strong><span>сумма выбранных позиций · предварительно</span></div></div><div class="table" tabindex="0" aria-label="Агрегаты, прокрутите по горизонтали"><table><caption>Сценарий × город × время × источник</caption><thead><tr><th>День сохранения</th>${fields.map(([, name]) => `<th>${name}</th>`).join('')}<th>Сохранения</th><th>Сумма позиций</th></tr></thead><tbody>${table}</tbody></table></div><p id="empty" hidden>За выбранный период и фильтры сохранений нет.</p><p>Желаемое время — пожелание посетителя, не доступный слот. Метки переходов не доказывают партнёрство. Для конверсии нужны визиты и события Метрики; этот отчёт не содержит их знаменателя. Только агрегаты; контактов и индивидуальных составов здесь нет.</p></main><script>
  const filters=[...document.querySelectorAll('[data-filter]')], rows=[...document.querySelectorAll('tbody tr')];
  function update(){let count=0,value=0;for(const row of rows){row.hidden=filters.some(filter=>filter.value&&row.dataset[filter.dataset.filter.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())]!==filter.value);if(!row.hidden){count+=Number(row.dataset.count);value+=Number(row.dataset.value)}}document.querySelector('#count').textContent=count.toLocaleString('ru-RU');document.querySelector('#value').textContent=value.toLocaleString('ru-RU')+' ₽';document.querySelector('#empty').hidden=count!==0}filters.forEach(filter=>filter.addEventListener('change',update));update();
  </script></html>`;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = Object.fromEntries(process.argv.slice(2).map(argument => argument.replace(/^--/, '').split('=')));
  const sql = reportQuery(args.from, args.to);
  if (!args.out) throw Error('Set --out=/absolute/path/report.html');
  const response = execFileSync('npx', ['wrangler@4.155.0', 'd1', 'execute', 'pirogorsk-interest', '--remote', '--config', 'worker/wrangler.jsonc', '--command', sql, '--json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const result = JSON.parse(response);
  if (!Array.isArray(result) || result.some(part => !part.success || !Array.isArray(part.results))) throw Error('D1 aggregate query failed');
  const rows = result.flatMap(part => part.results); const meta = { from: args.from, to: args.to, capturedAt: new Date().toISOString() };
  const output = resolve(args.out); await mkdir(dirname(output), { recursive: true });
  await writeFile(output.replace(/\.html$/, '') + '.json', JSON.stringify({ ...meta, excludedKnownQa: knownQaIds.length, rows }, null, 2));
  await writeFile(output, renderReport(rows, meta));
  console.log(`Aggregate report saved: ${output}; ${rows.reduce((sum, row) => sum + row.interests, 0)} interests`);
}
