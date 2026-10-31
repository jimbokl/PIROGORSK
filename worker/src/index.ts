import { parseInterestContext, INTEREST_CONTEXT_VERSION, parseAttribution, ATTRIBUTION_VERSION, type EntryAttribution, type InterestContext } from '../../src/data/interest-context.ts';
import { catalog } from './catalog.ts';
import { INTEREST_API_VERSION, serializeCatalog } from '../../src/data/catalog-contract.ts';

type DbResult<T = Record<string, unknown>> = { success: boolean; results: T[]; meta?: { changes?: number } };
interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<DbResult<T>>;
}
export interface Env {
  DB: { prepare(sql: string): Statement; batch<T = Record<string, unknown>>(statements: Statement[]): Promise<DbResult<T>[]> };
  /** Defaults to false. Enable only in a separate local QA configuration. */
  ALLOW_LOCALHOST?: string;
}
type Item = { id: string; value: string; quantity: number };
export type Interest = { version: 1; requestId: string; city: string; items: Item[]; desiredDate: string; delivery: 'pickup' | 'delivery' | 'undecided'; priceConsent: true; context?: InterestContext; attribution?: EntryAttribution };
type Saved = { request_id: string; payload_hash: string };
const cities = ['Зеленоградск', 'Калининград', 'Светлогорск'];
const MAX_BYTES = 16384;
const WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 6;
const uuid = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const publicOrigins = new Set(['https://pirogorsk.ru', 'https://www.pirogorsk.ru']);

class InputError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, code: string, fields?: Record<string, string>) { super(code); this.status = status; this.code = code; this.fields = fields; }
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function keysAllowed(value: Record<string, unknown>, allowed: string[]): boolean { return Object.keys(value).every(key => allowed.includes(key)); }
function localDay(now: number): string { return new Date(now + 2 * 60 * 60 * 1000).toISOString().slice(0, 10); }

export function validateInterest(value: unknown, now = Date.now()): Interest {
  if (!object(value) || !keysAllowed(value, ['version', 'requestId', 'city', 'items', 'desiredDate', 'delivery', 'priceConsent', 'website', 'context', 'attribution'])) throw new InputError(422, 'invalid_payload');
  if (value.version !== 1 || typeof value.requestId !== 'string' || !uuid.test(value.requestId)) throw new InputError(422, 'invalid_request_id');
  if (typeof value.website !== 'string' || value.website.length > 200) throw new InputError(422, 'invalid_payload');
  // A trap never receives a fake success, and never creates a conversion.
  if (value.website.trim()) throw new InputError(422, 'invalid_payload');
  const fields: Record<string, string> = {};
  if (typeof value.city !== 'string' || !cities.includes(value.city)) fields.city = 'Выберите город из списка.';
  const items: Item[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 24) fields.items = 'Выберите от 1 до 24 позиций.';
  else for (const item of value.items) {
    if (!object(item) || !keysAllowed(item, ['id', 'value', 'quantity']) || typeof item.id !== 'string' || typeof item.value !== 'string' || !Object.hasOwn(catalog, item.id) || !Object.hasOwn(catalog[item.id], item.value) || typeof item.quantity !== 'number' || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) { fields.items = 'Проверьте пироги, варианты и количество в подборке.'; break; }
    const key = `${item.id}:${item.value}`;
    if (seen.has(key)) { fields.items = 'Объедините одинаковые позиции в подборке.'; break; }
    seen.add(key);
    items.push({ id: item.id, value: item.value, quantity: item.quantity });
  }
  const date = value.desiredDate;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date || date < localDay(now)) fields.desiredDate = 'Выберите сегодняшний или будущий день.';
  if (!['pickup', 'delivery', 'undecided'].includes(String(value.delivery))) fields.delivery = 'Выберите способ получения.';
  if (value.priceConsent !== true) fields.priceConsent = 'Подтвердите желание заказать по ориентировочной цене.';
  const context = parseInterestContext(value.context);
  if (context === null) fields.context = 'Выберите пожелания из списка.';
  const attribution = parseAttribution(value.attribution);
  if (attribution === null) throw new InputError(422, 'invalid_attribution');
  if (Object.keys(fields).length) throw new InputError(422, 'validation_error', fields);
  return { version: 1, requestId: value.requestId.toLowerCase(), city: value.city as string, items: items.sort((a, b) => `${a.id}:${a.value}`.localeCompare(`${b.id}:${b.value}`)), desiredDate: date as string, delivery: value.delivery as Interest['delivery'], priceConsent: true, ...(context ? { context } : {}), ...(attribution ? { attribution } : {}) };
}

function allowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return false;
  if (publicOrigins.has(origin)) return true;
  if (env.ALLOW_LOCALHOST !== 'true') return false;
  try { const url = new URL(origin); return url.origin === origin && ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); } catch { return false; }
}
function headers(origin?: string | null): Headers {
  const value = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' });
  if (origin) { value.set('Access-Control-Allow-Origin', origin); value.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); value.set('Access-Control-Allow-Headers', 'Content-Type'); value.set('Access-Control-Max-Age', '600'); }
  return value;
}
function response(body: unknown, status: number, origin?: string | null): Response { return new Response(JSON.stringify(body), { status, headers: headers(origin) }); }
async function digest(value: string): Promise<string> { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2, '0')).join(''); }

async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new InputError(415, 'json_required');
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BYTES) throw new InputError(413, 'payload_too_large');
  if (!request.body) throw new InputError(400, 'invalid_json');
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new InputError(413, 'payload_too_large'); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new InputError(400, 'invalid_json'); }
}

async function save(interest: Interest, request: Request, env: Env, now: number): Promise<void> {
  const payloadHash = await digest(JSON.stringify(interest));
  const existing = await env.DB.prepare('SELECT request_id, payload_hash FROM interests WHERE request_id = ?').bind(interest.requestId).first<Saved>();
  if (existing) {
    if (existing.payload_hash !== payloadHash) throw new InputError(409, 'idempotency_conflict');
    return;
  }
  // Raw IP is never persisted or logged. Only a short-lived per-window digest is stored.
  const window = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const rateKey = await digest(`pirogorsk:${window}:${request.headers.get('CF-Connecting-IP') || 'local-unknown'}`);
  const expires = window + WINDOW_MS;
  const pricedItems = interest.items.map(item => ({ ...item, unitPrice: catalog[item.id][item.value] }));
  const valueTotal = pricedItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  // A D1 batch is a transaction. Admission and saving succeed together, including under concurrent retries.
  const result = await env.DB.batch<Saved>([
    env.DB.prepare('DELETE FROM submission_tokens WHERE expires_at <= ?').bind(now),
    env.DB.prepare(`INSERT OR IGNORE INTO submission_tokens (request_id, rate_key, window_start, slot, expires_at)
      SELECT ?, ?, ?, COALESCE(MAX(slot), 0) + 1, ? FROM submission_tokens
      WHERE rate_key = ? AND window_start = ? HAVING COALESCE(MAX(slot), 0) < ?`).bind(interest.requestId, rateKey, window, expires, rateKey, window, RATE_LIMIT),
    env.DB.prepare(`INSERT INTO interests (request_id, payload_hash, city, items_json, desired_date, delivery, price_consent, value_total, created_at)
      SELECT ?, ?, ?, ?, ?, ?, 1, ?, ? WHERE EXISTS (SELECT 1 FROM submission_tokens WHERE request_id = ?)
      ON CONFLICT(request_id) DO NOTHING`).bind(interest.requestId, payloadHash, interest.city, JSON.stringify(pricedItems), interest.desiredDate, interest.delivery, valueTotal, now, interest.requestId),
    ...(interest.context ? [env.DB.prepare(`INSERT INTO interest_preferences (request_id, occasion, preferred_time, partner_type)
      SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM interests WHERE request_id = ? AND payload_hash = ?)
      ON CONFLICT(request_id) DO NOTHING`).bind(interest.requestId, interest.context.occasion, interest.context.preferredTime, interest.context.partnerType, interest.requestId, payloadHash)] : []),
    ...(interest.attribution ? [env.DB.prepare(`INSERT INTO interest_attribution (request_id, channel, partner_code)
      SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM interests WHERE request_id = ? AND payload_hash = ?)
      ON CONFLICT(request_id) DO NOTHING`).bind(interest.requestId, interest.attribution.channel, interest.attribution.partnerCode ?? null, interest.requestId, payloadHash)] : []),
    env.DB.prepare('SELECT request_id, payload_hash FROM interests WHERE request_id = ?').bind(interest.requestId),
  ]);
  if (result.some(item => item.success !== true)) throw new Error('storage_failed');
  const saved = result.at(-1)?.results[0];
  if (!saved) throw new InputError(429, 'rate_limited');
  if (saved.payload_hash !== payloadHash) throw new InputError(409, 'idempotency_conflict');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const corsOrigin = allowedOrigin(origin, env) ? origin : null;
    if (request.method === 'GET' && url.pathname === '/health') {
      try {
        const result = await env.DB.prepare('SELECT request_id FROM interests LIMIT 1').all();
        if (result.success !== true) throw new Error('storage_failed');
        const preferences = await env.DB.prepare('SELECT request_id FROM interest_preferences LIMIT 1').all();
        if (preferences.success !== true) throw new Error('storage_failed');
        const attribution = await env.DB.prepare('SELECT request_id FROM interest_attribution LIMIT 1').all();
        if (attribution.success !== true) throw new Error('storage_failed');
        return response({ ok: true, storage: 'd1', mode: 'intent', attributionVersion: ATTRIBUTION_VERSION, interestContextVersion: INTEREST_CONTEXT_VERSION, apiVersion: INTEREST_API_VERSION, catalogSha256: await digest(serializeCatalog()) }, 200);
      }
      catch { return response({ ok: false, code: 'storage_unavailable' }, 503); }
    }
    if (url.pathname !== '/api/interest') return response({ ok: false, code: 'not_found' }, 404);
    if (!corsOrigin) return response({ ok: false, code: 'origin_not_allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(corsOrigin) });
    if (request.method !== 'POST') return response({ ok: false, code: 'method_not_allowed' }, 405, corsOrigin);
    try {
      const now = Date.now();
      const interest = validateInterest(await readJson(request), now);
      await save(interest, request, env, now);
      return response({ ok: true, saved: true, requestId: interest.requestId }, 200, corsOrigin);
    } catch (error) {
      if (error instanceof InputError) {
        const res = response({ ok: false, code: error.code, ...(error.fields ? { fields: error.fields } : {}) }, error.status, corsOrigin);
        if (error.status === 429) res.headers.set('Retry-After', '600');
        return res;
      }
      // Do not log payloads, IP addresses or exception objects.
      return response({ ok: false, code: 'storage_unavailable' }, 503, corsOrigin);
    }
  },
  async scheduled(_event: unknown, env: Env): Promise<void> {
    await env.DB.prepare('DELETE FROM submission_tokens WHERE expires_at <= ?').bind(Date.now()).all();
  },
};
