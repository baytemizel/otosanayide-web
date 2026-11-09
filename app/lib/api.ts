import {demoMode, publicEnv} from './env';
import {demoApiResponse} from './api-demo';

/** Browser request headers the API allows through CORS (WebCors::REQUEST_HEADERS). */
const allowedHeaders = new Set(['authorization', 'content-type', 'accept', 'accept-language', 'x-firebase-appcheck']);

type SessionHook = (usedToken: string) => Promise<string | null>;

let locale = 'tr';
let renewSession: SessionHook | null = null;

export class ApiConfigurationError extends Error {
  constructor(code: string) {
    super('api_config:' + code);
  }
}

/** Browser only: the refresh cookie is not sent to data endpoints, so language travels as a header. */
export function setApiLocale(next: string) {
  locale = next;
}

export function setApiSessionHook(hook: SessionHook | null) {
  renewSession = hook;
}

function liveOrigin() {
  const raw = publicEnv().apiOrigin;
  if (!raw) throw new ApiConfigurationError('missing');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiConfigurationError('invalid');
  }
  if (url.origin !== raw.replace(/\/$/, '')) throw new ApiConfigurationError('invalid');
  if (url.protocol !== 'https:' && !(import.meta.dev || process.env.NODE_ENV === 'test')) throw new ApiConfigurationError('insecure');
  return url.origin;
}

/** Fails fast for a live deployment without a usable API address. */
export function assertApiConfiguration() {
  if (!demoMode()) liveOrigin();
}

/** The API origin; in demo mode there is no API, so it is this page's origin. */
export function apiOrigin() {
  if (!demoMode()) return liveOrigin();
  return typeof window === 'undefined' ? '' : window.location.origin;
}

export function apiUrl(path: string) {
  if (!path.startsWith('/api/')) throw new ApiConfigurationError('path');
  return demoMode() ? path : liveOrigin() + path;
}

function apiPath(input: RequestInfo | URL) {
  if (typeof input === 'string' && input.startsWith('/')) {
    if (!input.startsWith('/api/')) throw new ApiConfigurationError('path');
    return input;
  }
  if (typeof input !== 'string' && !(input instanceof URL)) throw new ApiConfigurationError('request_object');
  const url = new URL(input);
  if (url.origin !== apiOrigin()) throw new ApiConfigurationError('foreign_origin');
  if (!url.pathname.startsWith('/api/')) throw new ApiConfigurationError('path');
  return url.pathname + url.search;
}

export const isAuthPath = (path: string) => path.startsWith('/api/auth/');

/** Cookies exist only for /api/auth/*; the API rejects credentialed CORS everywhere else. */
export function credentialsFor(path: string): RequestCredentials {
  return isAuthPath(path) ? 'include' : 'omit';
}

function requestHeaders(init: RequestInit) {
  const headers = new Headers(init.headers);
  headers.forEach((_, name) => {
    if (!allowedHeaders.has(name.toLowerCase())) throw new ApiConfigurationError('header:' + name);
  });
  if (!headers.has('Accept-Language')) headers.set('Accept-Language', locale);
  return headers;
}

const bearerOf = (headers: Headers) => headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1] ?? null;

/**
 * Every API call goes through here: one address, the CORS credential rule, language,
 * and a single token renewal after 401. Only reads are resent; a write that
 * may have reached the server is returned to the caller as the 401 it was.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const path = apiPath(input);
  if (demoMode()) return demoApiResponse(path, init);
  const headers = requestHeaders(init);
  const url = liveOrigin() + path;
  const request = (next: Headers) => fetch(url, {...init, headers: next, credentials: credentialsFor(path)});
  const response = await request(headers);
  const used = bearerOf(headers);
  if (response.status !== 401 || !used || !renewSession || isAuthPath(path)) return response;
  let renewed: string | null = null;
  try {
    renewed = await renewSession(used);
  } catch {
    return response;
  }
  const method = (init.method ?? 'GET').toUpperCase();
  if (!renewed || (method !== 'GET' && method !== 'HEAD')) return response;
  const retry = new Headers(headers);
  retry.set('Authorization', 'Bearer ' + renewed);
  return request(retry);
}
