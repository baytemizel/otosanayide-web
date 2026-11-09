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
};

const text = (value: unknown) => (value === undefined || value === null ? '' : String(value));
const flag = (value: unknown) => String(value) === 'true';

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
  };
}

export function configureEnv(raw: Record<string, unknown>) {
  current = normalizeEnv(raw);
  return current;
}

export const publicEnv = () => current;
export const demoMode = () => current.appMode === 'demo';
