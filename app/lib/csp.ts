import type {PublicEnv} from './env';

/**
 * Content-Security-Policy for rendered pages. Nuxt writes its runtime config as an inline
 * script without a nonce, so script-src keeps 'unsafe-inline'; the policy still limits
 * where scripts, connections and images may come from and forbids framing, plugins,
 * <base> changes and cross-site form posts. Google Maps origins are added only when a
 * maps key is configured.
 */
export function contentSecurityPolicy(env: Pick<PublicEnv, 'appMode' | 'apiOrigin' | 'googleMapsKey'>) {
  const api = env.appMode === 'demo' ? [] : [safeOrigin(env.apiOrigin)].filter(Boolean);
  const maps = env.googleMapsKey ? ['https://maps.googleapis.com', 'https://maps.gstatic.com'] : [];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(maps.length ? ['https://maps.googleapis.com'] : [])],
    'style-src': ["'self'", "'unsafe-inline'", ...(maps.length ? ['https://fonts.googleapis.com'] : [])],
    'img-src': ["'self'", 'data:', 'blob:', ...api, ...maps, ...(maps.length ? ['https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'] : [])],
    'font-src': ["'self'", 'data:', ...(maps.length ? ['https://fonts.gstatic.com'] : [])],
    'connect-src': ["'self'", ...api, ...(maps.length ? ['https://maps.googleapis.com'] : [])],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives).map(([name, values]) => `${name} ${[...new Set(values)].join(' ')}`).join('; ');
}

function safeOrigin(raw: string) {
  try {
    const url = new URL(raw);
    return url.origin === raw.replace(/\/$/, '') ? url.origin : '';
  } catch {
    return '';
  }
}
