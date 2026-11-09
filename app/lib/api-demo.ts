import {sampleBusinesses, searchBusinesses} from '@otosanayide/core';
import {parseSearchRequest} from '@otosanayide/core/search-request';

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});

/**
 * Demo mode never leaves the browser. Only search had a synthetic branch in the
 * former same-origin route; every other path answers like a closed feature.
 */
export async function demoApiResponse(path: string, init: RequestInit): Promise<Response> {
  const url = new URL(path, 'https://demo.invalid');
  if (url.pathname === '/api/search' && (init.method ?? 'GET').toUpperCase() === 'GET') {
    let filter;
    try {
      filter = parseSearchRequest(url.searchParams);
    } catch {
      return json({error: 'Arama filtrelerini kontrol et.'}, 400);
    }
    const districts = [...new Set(sampleBusinesses.filter(b => b.published && b.city === filter.city).map(b => b.district))].sort((a, b) => a.localeCompare(b, 'tr'));
    return json({items: searchBusinesses(sampleBusinesses, filter).slice(0, 24), districts, mode: 'demo'});
  }
  return json({error: 'Önizlemede kullanılamıyor.'}, 503);
}
