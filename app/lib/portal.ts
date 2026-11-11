import {publicEnv} from './env';

/** Business area screens live in the separate portal project (K184). */
/** Only these two portal routes are agreed (W3): `/giris` and `/basvuru?business=<id>`; the rest go to the root. */
export type PortalTarget = 'login' | 'claim' | 'newBusiness' | 'home';

const paths: Record<PortalTarget, string> = {
  home: '/',
  login: '/giris',
  claim: '/basvuru',
  newBusiness: '/basvuru',
};

const businessId = /^[A-Za-z0-9_-]{1,120}$/;

/**
 * Absolute portal URL, or null while NUXT_PUBLIC_PORTAL_ORIGIN is empty or invalid:
 * callers then render the link passive. Only a well-formed business id is forwarded.
 */
export function portalUrl(target: PortalTarget, options: {business?: string} = {}): string | null {
  const base = publicEnv().portalOrigin;
  if (!base) return null;
  const url = new URL(paths[target], base);
  if (target === 'claim' && options.business) {
    if (!businessId.test(options.business)) return null;
    url.searchParams.set('business', options.business);
  }
  return url.toString();
}
