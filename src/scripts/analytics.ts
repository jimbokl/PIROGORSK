import { analyticsConfig } from '../config/analytics';
import { analyticsPageUrl } from '../lib/analytics-pageview';

export type Goal = 'catalog_add' | 'order_form_open' | 'order_form_start' | 'order_submit' | 'order_submit_error';
export type GoalParams = {
  city?: string;
  productid?: string | string[];
  variant?: string | string[];
  qty?: number | number[];
  value?: number;
  requestId?: string;
};
type Metrica = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
declare global { interface Window { ym?: Metrica } }
const cities = new Set(['Зеленоградск', 'Калининград', 'Светлогорск']);
const goals = new Set<Goal>(['catalog_add', 'order_form_open', 'order_form_start', 'order_submit', 'order_submit_error']);
const submitted = new Set<string>();
const idPattern = /^[a-zA-Z0-9_-]{1,48}$/;
const requestPattern = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

/** Only this allowlist can reach Metrica. Contact values and DOM form data are never read. */
export function trackGoal(goal: Goal, params: GoalParams = {}): void {
  if (!goals.has(goal) || !Number.isSafeInteger(analyticsConfig.metricaId) || analyticsConfig.metricaId <= 0) return;
  const safe: GoalParams = {};
  if (typeof params.city === 'string' && cities.has(params.city)) safe.city = params.city;
  for (const field of ['productid', 'variant'] as const) {
    const value = params[field];
    if (typeof value === 'string' && idPattern.test(value)) safe[field] = value;
    else if (Array.isArray(value) && value.length <= 24 && value.every(v => typeof v === 'string' && idPattern.test(v))) safe[field] = value;
  }
  const qty = params.qty;
  if (typeof qty === 'number' && Number.isSafeInteger(qty) && qty > 0 && qty <= 99) safe.qty = qty;
  else if (Array.isArray(qty) && qty.length <= 24 && qty.every(v => Number.isSafeInteger(v) && v > 0 && v <= 99)) safe.qty = qty;
  if (typeof params.value === 'number' && Number.isFinite(params.value) && params.value >= 0) safe.value = params.value;
  if (typeof params.requestId === 'string' && requestPattern.test(params.requestId)) safe.requestId = params.requestId;
  if (goal === 'order_submit') {
    if (!safe.requestId || submitted.has(safe.requestId)) return;
    try { if (sessionStorage.getItem(`pirogorsk-goal:${safe.requestId}`)) return; } catch { /* Memory deduplication still works. */ }
    submitted.add(safe.requestId);
    try { sessionStorage.setItem(`pirogorsk-goal:${safe.requestId}`, '1'); } catch { /* Analytics never blocks a saved application. */ }
  }
  try { window.ym?.(analyticsConfig.metricaId, 'reachGoal', goal, safe); } catch { /* Saving is independent of analytics. */ }
}

function initializeAnalytics(): void {
  if (analyticsConfig.metricaId <= 0 || !Number.isSafeInteger(analyticsConfig.metricaId)) return;
  if (document.querySelector('[data-pirogorsk-metrica]')) return;
  if (!window.ym) {
    const queue: Metrica = (...args) => { (queue.a ??= []).push(args); };
    queue.l = Date.now();
    window.ym = queue;
  }
  // No Webvisor, automatic form goals, click map, link tracking or contact matching.
  window.ym(analyticsConfig.metricaId, 'init', {
    webvisor: false, clickmap: false, trackLinks: false, accurateTrackBounce: true,
    trackHash: false, triggerEvent: false, ecommerce: false,
    // Send one explicit, sanitised pageview via the documented hit API.
    defer: true,
  });
  window.ym(analyticsConfig.metricaId, 'hit', analyticsPageUrl(location.href), {
    referer: document.referrer ? safeReferrer(document.referrer) : '',
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  script.dataset.pirogorskMetrica = 'true';
  document.head.append(script);
}

function safeReferrer(value: string): string {
  try { const url = new URL(value); return `${url.origin}${url.pathname}`; } catch { return ''; }
}

initializeAnalytics();
