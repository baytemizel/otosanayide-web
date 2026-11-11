/**
 * Cookie preferences, kept only in this browser. Nothing non-essential is set today,
 * so the choice is recorded for when such a category is introduced; every optional
 * category defaults to off (privacy-preserving default, product-plan "Güvenlik").
 */
export type Consent = {measurement: boolean; adMeasurement: boolean; savedAtMs: number};

export const CONSENT_COOKIE = 'otosanayide-consent';
const VERSION = '1';
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

export const defaultConsent = (): Consent => ({measurement: false, adMeasurement: false, savedAtMs: 0});

/** Format: `1.<m>.<a>.<savedAtMs>`; anything else reads as "no choice made". */
export function parseConsent(raw: string | null | undefined): Consent | null {
  const match = /^1\.([01])\.([01])\.(\d{1,15})$/.exec(raw ?? '');
  if (!match) return null;
  const savedAtMs = Number(match[3]);
  if (!Number.isSafeInteger(savedAtMs) || savedAtMs <= 0) return null;
  return {measurement: match[1] === '1', adMeasurement: match[2] === '1', savedAtMs};
}

export function serializeConsent(value: Consent) {
  return [VERSION, value.measurement ? '1' : '0', value.adMeasurement ? '1' : '0', String(value.savedAtMs)].join('.');
}

export function consentCookie(value: Consent, secure: boolean) {
  return `${CONSENT_COOKIE}=${serializeConsent(value)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function readConsent(cookieHeader: string): Consent | null {
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === CONSENT_COOKIE) return parseConsent(rest.join('='));
  }
  return null;
}
