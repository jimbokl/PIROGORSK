export const INTEREST_CONTEXT_VERSION = 1;
export const ATTRIBUTION_VERSION = 1;
export const entryChannels = ['qr', 'telegram', 'partner', 'scenario'] as const;
export type EntryAttribution = { channel: typeof entryChannels[number]; partnerCode?: string };

/** Anonymous allocation codes p001–p999; no names, free text, URLs or contact data. */
export function parseAttribution(value: unknown): EntryAttribution | undefined | null {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['channel', 'partnerCode'].includes(key))) return null;
  if (!entryChannels.some(channel => channel === input.channel)) return null;
  if (input.partnerCode !== undefined && (typeof input.partnerCode !== 'string' || !/^p(?!000)\d{3}$/.test(input.partnerCode) || !['qr', 'partner'].includes(String(input.channel)))) return null;
  return { channel: input.channel as EntryAttribution['channel'], ...(input.partnerCode ? { partnerCode: input.partnerCode as string } : {}) };
}
export const occasions = [
  ['undecided', 'Пока не знаю'], ['dinner', 'Ужин дома'], ['apartments', 'Ужин в апартаментах'],
  ['picnic', 'Пикник'], ['company', 'Стол на компанию'], ['gift', 'В подарок'],
] as const;
export const preferredTimes = [
  ['undecided', 'Не важно'], ['morning', 'Утром, до 12:00'], ['day', 'Днём, с 12:00 до 18:00'], ['evening', 'Вечером, после 18:00'],
] as const;
export const partnerTypes = [['none', 'Выбираю для себя'], ['apartments', 'Принимаю гостей в апартаментах'], ['bakery', 'Представляю пекарню']] as const;
export type InterestContext = {
  occasion: (typeof occasions)[number][0];
  preferredTime: (typeof preferredTimes)[number][0];
  partnerType: (typeof partnerTypes)[number][0];
};

/** Fixed choices only. undefined preserves the original v1 payload/hash; null rejects untrusted data. */
export function parseInterestContext(value: unknown): InterestContext | undefined | null {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['occasion', 'preferredTime', 'partnerType'].includes(key))) return null;
  const occasion = input.occasion === undefined ? 'undecided' : input.occasion;
  const preferredTime = input.preferredTime === undefined ? 'undecided' : input.preferredTime;
  const partnerType = input.partnerType === undefined ? 'none' : input.partnerType;
  if (!occasions.some(([key]) => key === occasion) || !preferredTimes.some(([key]) => key === preferredTime) || !partnerTypes.some(([key]) => key === partnerType)) return null;
  if (occasion === 'undecided' && preferredTime === 'undecided' && partnerType === 'none') return undefined;
  return { occasion, preferredTime, partnerType } as InterestContext;
}
