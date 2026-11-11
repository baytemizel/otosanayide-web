import {apiFetch} from './api';
import {demoMode} from './env';
import {sampleBusinesses, type Business} from '@otosanayide/core';
import {decodeBusiness, type BusinessExtras} from './search-response';

export type BusinessRead = {status: 'found'; business: Business; extras: BusinessExtras} | {status: 'missing'} | {status: 'unavailable'};

/** Works during SSR, so the language is explicit: there is no per-request state in the API module. */
export async function readBusiness(id: string, locale: string): Promise<BusinessRead> {
  if (demoMode()) {
    const business = sampleBusinesses.find(b => b.id === id);
    return business ? {status: 'found', business, extras: {}} : {status: 'missing'};
  }
  try {
    // v=2 (web-07/08) adds reviewSummary and, when known, openingHours; search-response reads them apart.
    // An API without v2 answers 400: the profile is read again in the v1 shape instead of failing.
    const read = (query: string) => apiFetch('/api/businesses/' + encodeURIComponent(id) + query, {
      headers: {Accept: 'application/json', 'Accept-Language': locale},
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    let response = await read('?v=2');
    if (response.status === 400) response = await read('');
    if (response.status === 404) return {status: 'missing'};
    if (!response.ok) return {status: 'unavailable'};
    // The endpoint returns the same public shape as a search hit, so it takes the same parser.
    return {status: 'found', ...decodeBusiness(await response.json(), 'live')};
  } catch {
    return {status: 'unavailable'};
  }
}
