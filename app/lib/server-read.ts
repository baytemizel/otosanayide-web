import {apiFetch} from './api';
import {demoMode} from './env';
import {sampleBusinesses, type Business} from '@otosanayide/core';
import {decodeSearchResult} from '@otosanayide/core/search-client';

export type BusinessRead = {status: 'found'; business: Business} | {status: 'missing'} | {status: 'unavailable'};

/** The endpoint returns the same public shape as a search hit, so it takes the same parser. */
const decodeBusiness = (raw: unknown) => decodeSearchResult({items: [raw], districts: [], mode: 'live'}, 'live').items[0]!;

/** Works during SSR, so the language is explicit: there is no per-request state in the API module. */
export async function readBusiness(id: string, locale: string): Promise<BusinessRead> {
  if (demoMode()) {
    const business = sampleBusinesses.find(b => b.id === id);
    return business ? {status: 'found', business} : {status: 'missing'};
  }
  try {
    const response = await apiFetch('/api/businesses/' + encodeURIComponent(id), {
      headers: {Accept: 'application/json', 'Accept-Language': locale},
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) return {status: 'missing'};
    if (!response.ok) return {status: 'unavailable'};
    return {status: 'found', business: decodeBusiness(await response.json())};
  } catch {
    return {status: 'unavailable'};
  }
}
