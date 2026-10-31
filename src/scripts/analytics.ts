import { occasions, preferredTimes, partnerTypes } from '../data/interest-context';
import { analyticsConfig } from '../config/analytics';
import { analyticsPageUrl } from '../lib/analytics-pageview';
import { analyticsSessionEnabled } from '../lib/analytics-session';
import { guideTransition } from '../lib/seo-navigation';
import { occasionMemory, attributionMemory } from './occasion';

export type Goal = 'product_view' | 'catalog_remove' | 'city_select' | 'selection_open' | 'catalog_filter_apply' | 'catalog_add' | 'order_form_open' | 'order_form_start' | 'order_submit' | 'order_submit_error' | 'calculator_interact' | 'calc_apply_set' | 'guide_to_catalog_click';
export type GoalParams = {
  city?: string;
  occasion?: string;
  preferred_time?: string;
  partner_type?: string;
  entry_channel?: string;
  partner_code?: string;
  source?: 'card' | 'bundle' | 'addon' | 'planner' | 'favorite' | 'share' | 'selection';
  surface?: 'home' | 'menu' | 'product' | 'other';
  filling?: string;
  search_used?: boolean;
  results?: number;
  productid?: string | string[];
  variant?: string | string[];
  qty?: number | number[];
  value?: number;
  requestId?: string;
  source_page?: string;
  destination_page?: string;
};
type Metrica = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
declare global { interface Window { ym?: Metrica } }
const cities = new Set(['Зеленоградск', 'Калининград', 'Светлогорск']);
const goals = new Set<Goal>(['product_view', 'catalog_remove', 'city_select', 'selection_open', 'catalog_filter_apply', 'catalog_add', 'order_form_open', 'order_form_start', 'order_submit', 'order_submit_error', 'calculator_interact', 'calc_apply_set', 'guide_to_catalog_click']);
const submitted = new Set<string>();
const idPattern = /^[a-zA-Z0-9_-]{1,48}$/;
const requestPattern = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const analyticsEnabled = analyticsSessionEnabled(location.href, {
  getItem: key => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
});

/** Only this allowlist can reach Metrica. Contact values and DOM form data are never read. */
export function trackGoal(goal: Goal, params: GoalParams = {}): void {
  if (!analyticsEnabled || !goals.has(goal) || !Number.isSafeInteger(analyticsConfig.metricaId) || analyticsConfig.metricaId <= 0) return;
  const safe: GoalParams = {};
  const attribution = attributionMemory?.current();
  if (attribution) {
    safe.entry_channel = attribution.channel;
    if (attribution.partnerCode) safe.partner_code = attribution.partnerCode;
  }
  const occasion = params.occasion ?? occasionMemory.current()?.value;
  if (occasions.some(([key]) => key === occasion)) safe.occasion = occasion;
  if (preferredTimes.some(([key]) => key === params.preferred_time)) safe.preferred_time = params.preferred_time;
  if (partnerTypes.some(([key]) => key === params.partner_type)) safe.partner_type = params.partner_type;
  if (params.source && ['card', 'bundle', 'addon', 'planner', 'favorite', 'share', 'selection'].includes(params.source)) safe.source = params.source;
  if (params.surface && ['home', 'menu', 'product', 'other'].includes(params.surface)) safe.surface = params.surface;
  if (typeof params.filling === 'string' && ['all', 'meat', 'poultry', 'fish', 'cheese', 'vegetables', 'fruit'].includes(params.filling)) safe.filling = params.filling;
  if (typeof params.search_used === 'boolean') safe.search_used = params.search_used;
  if (Number.isSafeInteger(params.results) && params.results! >= 0 && params.results! <= 153) safe.results = params.results;
  if (goal === 'guide_to_catalog_click') {
    if (typeof params.source_page !== 'string' || typeof params.destination_page !== 'string') return;
    const transition = guideTransition(params.source_page, params.destination_page);
    if (!transition) return;
    Object.assign(safe, transition);
  }
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
  if (!analyticsEnabled) return;
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

// Only marked links between registered pages are measured; query strings and hashes are discarded.
document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-guide-catalog]') : null;
  if (!target) return;
  const transition = guideTransition(location.href, target.href);
  if (transition) trackGoal('guide_to_catalog_click', transition);
});
