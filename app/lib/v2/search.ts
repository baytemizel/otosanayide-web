import {brands as coreBrands, categories, cities} from '@otosanayide/core';
import {areaReference, maxNearbyRadius, referenceDistricts, type AreaPoint} from '@otosanayide/core/coverage';
import {allProvinces, nearbyProvince, sameText, trLower, type SearchFilters, type SearchSort} from '~/data/mock/search';
import {toCardBusiness, type CardBusiness} from '~/lib/v2/business-card';
import type {SearchPage} from '~/lib/search-response';

/**
 * Live search for the Web v2 screens (/ara, home discovery): how the v2 filter state maps onto
 * `GET /api/search?v=2` (web-05/06/07/08) and how a decoded page becomes service cards.
 * The API takes one category + service, one brand, `card`, `verifiedOwner`, a city/district or a
 * lat/lng/radius circle, `sort` and `cursor`. Rejected (web-06/07): cash, installments, weekend,
 * open now, facet counts, bbox; those controls stay passive in live mode.
 */

export type ApiSort = 'recommended' | 'nearest' | 'rating' | 'most_reviewed';
export const apiSort: Record<SearchSort, ApiSort> = {onerilen: 'recommended', yakin: 'nearest', puan: 'rating', yorum: 'most_reviewed'};

/** Every service of the core catalogue, in catalogue order (the API checks service against category). */
export const liveServices = [...new Set(categories.flatMap((c) => c.services))];
export const livePrimaryServices = ['Periyodik bakım', 'Boyasız göçük', 'Kaporta', 'Lastik'];
export const liveBrands = [...coreBrands];
export const livePrimaryBrands = ['BMW', 'Mercedes-Benz', 'Audi'];

export const isCovered = (il: string) => cities.some((city) => sameText(city, il));
/** Province spelled as in the core coverage list ("hakkari" → "Hakkâri"), or the input when unknown. */
export const coveredName = (il: string) => cities.find((city) => sameText(city, il)) ?? allProvinces.find((p) => sameText(p, il)) ?? il;

/** The covered province offered by S02 "Yakındaki ili gör". Never an uncovered one. */
export function nearbyCovered(il: string) {
  const hint = nearbyProvince[trLower(il)];
  return hint && isCovered(hint) ? coveredName(hint) : 'İstanbul';
}

/** District options of a covered province: official reference list plus what the API returned. */
export function liveDistricts(il: string, fromApi: string[] = []) {
  return [...new Set([...referenceDistricts(coveredName(il)), ...fromApi])].sort((a, b) => a.localeCompare(b, 'tr'));
}

/** Category id for a category name or id ("Kaporta & Boya" / "body"), else undefined. */
export function categoryId(value: string) {
  return categories.find((c) => sameText(c.id, value) || sameText(c.name, value))?.id;
}

/** The first category offering this service, with the catalogue spelling. */
export function serviceCategory(service: string) {
  for (const category of categories) {
    const hit = category.services.find((s) => sameText(s, service));
    if (hit) return {category: category.id, service: hit};
  }
  return undefined;
}

const synonyms: Record<string, string> = {
  pdr: 'Boyasız göçük', göçük: 'Boyasız göçük', tampon: 'Tampon onarımı', klima: 'Klima bakımı', akü: 'Akü', lastik: 'Lastik',
  rot: 'Rot balans', ekspertiz: 'Oto ekspertiz', bakım: 'Periyodik bakım', elektrik: 'Oto elektrik', fren: 'Fren', turbo: 'Turbo',
};

/**
 * Live reading of the search box. Like the mock reader, but against the core catalogue and with the
 * API's limits: one province/district, one service (the longest match), one brand, "kart". Text that
 * matches nothing is sent to the API as `q`.
 */
export function readLiveQuery(text: string, base: SearchFilters): SearchFilters {
  const lower = trLower(text);
  const has = (term: string) => new RegExp(`(^|[^\\p{L}])${trLower(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(lower);
  const next: SearchFilters = {...base, q: text, services: [], brands: [], payments: [], symptom: '', text: ''};
  const province = allProvinces.find((p) => has(p));
  if (province) next.il = coveredName(province);
  const district = referenceDistricts(coveredName(next.il)).filter((d) => has(d)).sort((a, b) => b.length - a.length)[0];
  next.ilce = district ?? (province ? '' : base.ilce);
  const services = [...liveServices.filter((s) => has(s)), ...Object.entries(synonyms).filter(([k]) => has(k)).map(([, s]) => s)];
  const service = services.sort((a, b) => b.length - a.length)[0];
  if (service) next.services = [service];
  const brand = liveBrands.find((b) => has(b)) ?? (has('mercedes') ? 'Mercedes-Benz' : undefined);
  if (brand) next.brands = [brand];
  if (/(^|[^\p{L}])kart/u.test(lower)) next.payments = ['kart'];
  if (!district && !province && !service && !brand && !next.payments.length) next.text = text.trim();
  return next;
}

/** The circle a live search uses: area reference for "çevresi", the device point for "konum", else none. */
export function searchCenter(f: SearchFilters, device: AreaPoint | null): AreaPoint | null {
  if (f.area === 'konum') return device;
  if (f.area === 'cevre') return areaReference(coveredName(f.il), f.ilce) ?? areaReference(coveredName(f.il));
  return null;
}

/**
 * `GET /api/search` parameters for the v2 filter state. Throws nothing: values the API would reject
 * (uncatalogued service, a second service/brand, nearest without a point) are folded or dropped.
 */
export function liveSearchParams(f: SearchFilters, center: AreaPoint | null, cursor = '') {
  const q: string[] = [f.text, f.symptom];
  let category = '';
  let service = '';
  const first = f.services[0] ?? '';
  if (first) {
    const asCategory = categoryId(first);
    const asService = serviceCategory(first);
    if (asService) ({category, service} = asService);
    else if (asCategory) category = asCategory;
    else q.push(first);
  }
  const brand = f.brands[0] ? liveBrands.find((b) => sameText(b, f.brands[0]!)) ?? f.brands[0]!.slice(0, 80) : '';
  const params = new URLSearchParams({
    q: q.filter(Boolean).join(' ').trim().slice(0, 150),
    city: center ? '' : coveredName(f.il),
    district: center ? '' : f.ilce,
    category,
    service,
    brand,
    card: String(f.payments.includes('kart')),
  });
  if (center) {
    params.set('lat', String(center.latitude));
    params.set('lng', String(center.longitude));
    params.set('radius', String(Math.min(Math.max(1, f.km), maxNearbyRadius)));
  }
  params.set('v', '2');
  const sort = apiSort[f.sort];
  if (sort !== 'recommended' && !(sort === 'nearest' && !center)) params.set('sort', sort);
  if (f.verifiedOnly) params.set('verifiedOwner', 'true');
  if (cursor) params.set('cursor', cursor);
  return params;
}

/** The same search in the v1 shape, for an API that does not know v2 yet (answers 400). */
export function v1Params(params: URLSearchParams) {
  const v1 = new URLSearchParams(params);
  for (const key of ['v', 'sort', 'cursor', 'verifiedOwner']) v1.delete(key);
  return v1;
}

/** Cards of one page: unexpired sponsored entries first (labelled), then the results without repeats. */
export function pageCards(page: Pick<SearchPage, 'items' | 'extras' | 'sponsored'>, now = new Date()): CardBusiness[] {
  const sponsored = page.sponsored
    .filter((s) => s.expiresAtMs > now.getTime())
    .map((s) => ({...toCardBusiness(s.business, {}, now), sponsored: true}));
  const seen = new Set(sponsored.map((c) => c.id));
  const items = page.items.filter((b) => !seen.has(b.id)).map((b) => toCardBusiness(b, page.extras[b.id] ?? {}, now));
  return [...sponsored, ...items];
}

/** Appends the next page, keeping the first copy of a business that shows up twice. */
export function appendCards(list: CardBusiness[], next: CardBusiness[]) {
  const seen = new Set(list.map((c) => c.id));
  return [...list, ...next.filter((c) => !seen.has(c.id))];
}

/** "18 işletme" / "en az 480 işletme" / "24 işletme gösteriliyor". */
export function resultCount(total: SearchPage['total'], shown: number) {
  if (total) return total.exact ? `${total.value} işletme` : `en az ${total.value} işletme`;
  return `${shown} işletme gösteriliyor`;
}

/** Readable message for a failed search. */
export function searchErrorText(status: number, apiMessage = '') {
  if (status === 400) return 'Arama filtreleri kabul edilmedi. Filtreleri değiştirip tekrar dene.';
  if (status === 429) return 'Çok fazla arama yapıldı. Biraz bekleyip tekrar dene.';
  if (status === 503) return 'Arama şu an kapalı. Lütfen daha sonra tekrar dene.';
  if (apiMessage) return apiMessage;
  return status ? 'Arama şu an yanıt vermiyor. Lütfen daha sonra tekrar dene.' : 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.';
}

/** Cards with a verified pin and those listed without one (map view). */
export function splitPinned<T extends CardBusiness>(cards: T[]) {
  return {pinned: cards.filter((c) => c.coords), unpinned: cards.filter((c) => !c.coords)};
}

/** City of the home discovery block in live mode (İstanbul while it is covered, else the first covered city). */
export const homeLiveCity = cities.includes('İstanbul') ? 'İstanbul' : cities[0] ?? 'İstanbul';

/**
 * Open/closed wording for the map pop-ups and rows. A live card whose hours are only free text has no
 * open state (toCardBusiness reports it as known but closed), so it shows the text instead of "Kapalı".
 */
export function openLabel(b: Pick<CardBusiness, 'hoursKnown' | 'open' | 'hoursText' | 'source' | 'extras'>): {open: boolean | null; text: string} {
  if (b.hoursKnown === false) return {open: null, text: 'Saat bilgisi yok'};
  if (b.source && !b.extras?.openingHours) return {open: null, text: b.hoursText};
  return {open: b.open, text: b.open ? 'Açık' : 'Kapalı'};
}
