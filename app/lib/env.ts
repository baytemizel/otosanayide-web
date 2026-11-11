export type PublicEnv = {
  appMode: string;
  apiOrigin: string;
  googleMapsKey: string;
  businessPhotosEnabled: boolean;
  brandServingEnabled: boolean;
  brandRecaptchaSiteKey: string;
  pushEnabled: boolean;
  pushVapidKey: string;
  firebaseApiKey: string;
  firebaseProjectId: string;
  firebaseAppId: string;
  firebaseMessagingSenderId: string;
  firebaseStorageBucket: string;
  /** Business portal origin (K184). Empty keeps every business link passive. */
  portalOrigin: string;
  /** Public site origin for canonical URLs and the sitemap. Empty omits them. */
  siteOrigin: string;
  /** Search engines may index only when explicitly enabled for a released site. */
  indexingEnabled: boolean;
  /** Legal page skeletons; drafts are not lawyer-approved, so this stays off. */
  legalPagesEnabled: boolean;
};

const text = (value: unknown) => (value === undefined || value === null ? '' : String(value));
const flag = (value: unknown) => String(value) === 'true';

/** Only a bare https origin is usable (http is allowed for local development hosts). */
export function origin(value: unknown) {
  const raw = text(value).trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname) || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.test');
    if (url.origin !== raw.replace(/\/$/, '')) return '';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return '';
    return url.origin;
  } catch {
    return '';
  }
}

let current: PublicEnv = normalizeEnv({});

/** Runtime config turns "true" into a boolean; both spellings mean enabled. */
export function normalizeEnv(raw: Record<string, unknown>): PublicEnv {
  return {
    appMode: text(raw.appMode),
    apiOrigin: text(raw.apiOrigin),
    googleMapsKey: text(raw.googleMapsKey),
    businessPhotosEnabled: flag(raw.businessPhotosEnabled),
    brandServingEnabled: flag(raw.brandServingEnabled),
    brandRecaptchaSiteKey: text(raw.brandRecaptchaSiteKey),
    pushEnabled: flag(raw.pushEnabled),
    pushVapidKey: text(raw.pushVapidKey),
    firebaseApiKey: text(raw.firebaseApiKey),
    firebaseProjectId: text(raw.firebaseProjectId),
    firebaseAppId: text(raw.firebaseAppId),
    firebaseMessagingSenderId: text(raw.firebaseMessagingSenderId),
    firebaseStorageBucket: text(raw.firebaseStorageBucket),
    portalOrigin: origin(raw.portalOrigin),
    siteOrigin: origin(raw.siteOrigin),
    indexingEnabled: flag(raw.indexingEnabled),
    legalPagesEnabled: flag(raw.legalPagesEnabled),
  };
}

export function configureEnv(raw: Record<string, unknown>) {
  current = normalizeEnv(raw);
  return current;
}

export const publicEnv = () => current;
export const demoMode = () => current.appMode === 'demo';
