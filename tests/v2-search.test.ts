import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cities, type Business} from '@otosanayide/core';
import {emptyFilters, nearbyProvince, searchBusinesses, type SearchFilters} from '../app/data/mock/search';
import {decodeSearchPage, type SearchPage} from '../app/lib/search-response';
import {compareFromLive, compareFromMock, comparisonName} from '../app/lib/v2/compare';
import {
  appendCards, categoryId, coveredName, isCovered, liveDistricts, liveSearchParams, nearbyCovered, openLabel, pageCards, readLiveQuery, resultCount,
  searchCenter, searchErrorText, serviceCategory, splitPinned, v1Params,
} from '../app/lib/v2/search';

const business = (id: string, extra: Partial<Business> = {}): Business => ({
  id, name: 'Örnek ' + id, city: 'İstanbul', district: 'Kadıköy', address: 'Örnek Sokak No 1 Kadıköy', categories: ['body'],
  services: ['Kaporta'], brands: ['BMW'], coordinateStatus: 'unverified', ownership: 'unclaimed', features: {quotes: false, appointments: false},
  ownerReady: false, published: true, ...extra,
});
const filters = (patch: Partial<SearchFilters> = {}): SearchFilters => ({...emptyFilters('İstanbul'), ...patch});

test('a city search sends every v1 key plus v=2, and nothing the API rejected', () => {
  const p = liveSearchParams(filters({ilce: 'Kadıköy', openNow: true, weekend: true, payments: ['taksit', 'nakit']}), null);
  assert.deepEqual(Object.fromEntries(p), {q: '', city: 'İstanbul', district: 'Kadıköy', category: '', service: '', brand: '', card: 'false', v: '2'});
});

test('service, category, brand, card, verified owner and sort map onto the API keys', () => {
  const p = liveSearchParams(filters({services: ['boyasız göçük'], brands: ['bmw'], payments: ['kart'], verifiedOnly: true, sort: 'puan'}), null, 'abc_1');
  assert.equal(p.get('category'), 'body');
  assert.equal(p.get('service'), 'Boyasız göçük', 'catalogue spelling');
  assert.equal(p.get('brand'), 'BMW');
  assert.equal(p.get('card'), 'true');
  assert.equal(p.get('verifiedOwner'), 'true');
  assert.equal(p.get('sort'), 'rating');
  assert.equal(p.get('cursor'), 'abc_1');
  assert.equal(liveSearchParams(filters({sort: 'yorum'}), null).get('sort'), 'most_reviewed');
  assert.equal(liveSearchParams(filters({sort: 'onerilen'}), null).has('sort'), false);
});

test('a category name becomes the category id; an unknown service and the symptom travel as text', () => {
  assert.equal(liveSearchParams(filters({services: ['Kaporta & Boya']}), null).get('category'), 'body');
  assert.equal(liveSearchParams(filters({services: ['Kaporta & Boya']}), null).get('service'), '');
  const p = liveSearchParams(filters({services: ['Lokal boya'], symptom: 'fren sesi', text: 'acil'}), null);
  assert.equal(p.get('category'), '');
  assert.equal(p.get('q'), 'acil fren sesi Lokal boya');
  assert.ok(liveSearchParams(filters({text: 'x'.repeat(400)}), null).get('q')!.length <= 150);
});

test('only the first service and brand are sent (the API takes one of each)', () => {
  const p = liveSearchParams(filters({services: ['Lastik', 'Fren'], brands: ['Audi', 'BMW']}), null);
  assert.equal(p.get('service'), 'Lastik');
  assert.equal(p.get('brand'), 'Audi');
});

test('a circle replaces city/district; nearest is sent only with a point; radius stays within 1–200', () => {
  const center = {latitude: 40.99, longitude: 29.03};
  const p = liveSearchParams(filters({area: 'cevre', km: 25, sort: 'yakin'}), center);
  assert.equal(p.get('city'), '');
  assert.equal(p.get('district'), '');
  assert.equal(p.get('lat'), '40.99');
  assert.equal(p.get('radius'), '25');
  assert.equal(p.get('sort'), 'nearest');
  assert.equal(liveSearchParams(filters({km: 900}), center).get('radius'), '200');
  assert.equal(liveSearchParams(filters({sort: 'yakin'}), null).has('sort'), false);
  assert.deepEqual([...v1Params(p).keys()].sort(), ['card', 'category', 'city', 'district', 'brand', 'lat', 'lng', 'q', 'radius', 'service'].sort());
});

test('search centre: area reference for "çevresi", the device point for "konum", none for the city', () => {
  const device = {latitude: 41, longitude: 29};
  assert.equal(searchCenter(filters({area: 'ilce'}), device), null);
  assert.deepEqual(searchCenter(filters({area: 'konum'}), device), device);
  assert.equal(searchCenter(filters({area: 'konum'}), null), null);
  const kadikoy = searchCenter(filters({area: 'cevre', ilce: 'Kadıköy'}), null);
  assert.ok(kadikoy && kadikoy.latitude > 40.8 && kadikoy.latitude < 41.1);
  assert.ok(searchCenter(filters({area: 'cevre', ilce: 'Yok-böyle-ilçe'}), null), 'falls back to the province centre');
});

test('the live reader picks district, the longest service, one brand and "kart" from the search box', () => {
  const f = readLiveQuery('Kadıköy’de BMW için boyasız göçük, kart geçsin', filters());
  assert.equal(f.il, 'İstanbul');
  assert.equal(f.ilce, 'Kadıköy');
  assert.deepEqual(f.services, ['Boyasız göçük']);
  assert.deepEqual(f.brands, ['BMW']);
  assert.deepEqual(f.payments, ['kart']);
  assert.equal(f.text, '');
  const g = readLiveQuery('Ankara mercedes fren', filters({ilce: 'Kadıköy'}));
  assert.equal(g.il, 'Ankara');
  assert.equal(g.ilce, '');
  assert.deepEqual(g.brands, ['Mercedes-Benz']);
  assert.deepEqual(g.services, ['Fren']);
  const h = readLiveQuery('Örnek Usta', filters({ilce: 'Kadıköy'}));
  assert.equal(h.text, 'Örnek Usta');
  assert.equal(h.ilce, 'Kadıköy', 'unread text keeps the place');
});

test('catalogue lookups', () => {
  assert.equal(categoryId('mechanical'), 'mechanical');
  assert.equal(categoryId('mekanik servis'), 'mechanical');
  assert.deepEqual(serviceCategory('akü'), {category: 'electrical', service: 'Akü'});
  assert.equal(serviceCategory('Lokal boya'), undefined);
});

test('coverage: names, S02 neighbour always covered, districts merged with the API list', () => {
  assert.equal(isCovered('istanbul'), true);
  assert.equal(isCovered('Bayburt'), false);
  assert.equal(coveredName('hakkâri'), 'Hakkâri');
  for (const target of Object.values(nearbyProvince)) assert.ok(cities.includes(target), `${target} is covered`);
  assert.equal(nearbyCovered('Bayburt'), 'Erzurum');
  assert.equal(nearbyCovered('Bilinmeyen'), 'İstanbul');
  const districts = liveDistricts('İstanbul', ['Örnekköy']);
  assert.ok(districts.includes('Kadıköy') && districts.includes('Örnekköy'));
  assert.deepEqual(districts, [...districts].sort((a, b) => a.localeCompare(b, 'tr')));
});

const page = (patch: Partial<SearchPage>): Pick<SearchPage, 'items' | 'extras' | 'sponsored'> => ({items: [], extras: {}, sponsored: [], ...patch});

test('page cards: live sponsored entries first and labelled, expired ones dropped, no repeats', () => {
  const now = new Date('2026-11-18T10:00:00+03:00');
  const pinned = business('a', {coordinateStatus: 'verified', latitude: 41, longitude: 29, ownership: 'verified'});
  const cards = pageCards(page({
    items: [pinned, business('b')],
    extras: {a: {reviewSummary: {count: 4, average: 4.5}}},
    sponsored: [
      {business: business('b'), headline: 'x', description: 'y', expiresAtMs: now.getTime() + 1000},
      {business: business('c'), headline: 'x', description: 'y', expiresAtMs: now.getTime() - 1},
    ],
  }), now);
  assert.deepEqual(cards.map((c) => [c.id, c.sponsored]), [['b', true], ['a', false]]);
  assert.equal(cards[1]!.rating, 4.5);
  assert.equal(cards[1]!.verified, true);
  const {pinned: onMap, unpinned} = splitPinned(cards);
  assert.deepEqual(onMap.map((c) => c.id), ['a']);
  assert.deepEqual(unpinned.map((c) => c.id), ['b']);
  assert.deepEqual(appendCards(cards, pageCards(page({items: [business('a'), business('d')]}), now)).map((c) => c.id), ['b', 'a', 'd']);
});

test('free-text hours never read as "Kapalı" on the map', () => {
  const now = new Date('2026-11-18T10:00:00+03:00');
  const [free] = pageCards(page({items: [business('f', {hours: 'Hafta içi 09.00–18.00'})]}), now);
  assert.deepEqual(openLabel(free!), {open: null, text: 'Hafta içi 09.00–18.00'});
  const [none] = pageCards(page({items: [business('n')]}), now);
  assert.deepEqual(openLabel(none!), {open: null, text: 'Saat bilgisi yok'});
  const [timed] = pageCards(page({items: [business('t')], extras: {t: {openingHours: {timezone: 'Europe/Istanbul', week: [{day: 3, intervals: [{open: '09:00', close: '18:00'}]}]}}}}), now);
  assert.deepEqual(openLabel(timed!), {open: true, text: 'Açık'});
  assert.deepEqual(openLabel(searchBusinesses[0]!), {open: true, text: 'Açık'}, 'demo cards keep their state');
});

test('result counts and error texts are readable Turkish', () => {
  assert.equal(resultCount({value: 39, exact: true}, 24), '39 işletme');
  assert.equal(resultCount({value: 480, exact: false}, 24), 'en az 480 işletme');
  assert.equal(resultCount(null, 24), '24 işletme gösteriliyor');
  assert.match(searchErrorText(400), /filtre/i);
  assert.match(searchErrorText(503), /kapalı/);
  assert.equal(searchErrorText(500, 'Sunucu mesajı'), 'Sunucu mesajı');
  assert.match(searchErrorText(0), /ulaşılamadı/);
});

test('compare columns: live rows without data are null, demo keeps today\'s answers', () => {
  const now = new Date('2026-11-18T10:00:00+03:00');
  const bare = compareFromLive(business('a', {hours: 'Hafta içi 09.00–18.00'}), {}, null, now);
  assert.equal(bare.reviews, null);
  assert.equal(bare.card, null);
  assert.equal(bare.distanceKm, null);
  assert.deepEqual(bare.hours, {known: true, open: null, text: 'Hafta içi 09.00–18.00'});
  assert.equal(bare.ownership, 'unclaimed');
  assert.equal(bare.category, 'Kaporta & Boya');
  assert.ok(bare.services.includes('Kaporta & Boya'));
  const full = compareFromLive(business('b', {cardPayment: false, ownership: 'verified', ownerReady: true, features: {quotes: true, appointments: false}, distance: 3.2}),
    {reviewSummary: {count: 0, average: null}, openingHours: {timezone: 'Europe/Istanbul', week: [{day: 3, intervals: [{open: '09:00', close: '18:00'}]}]}}, 9, now);
  assert.deepEqual(full.reviews, {count: 0, average: 0});
  assert.equal(full.card, false);
  assert.equal(full.distanceKm, 3.2, 'the record\'s own distance wins');
  assert.equal(full.hours.open, true);
  assert.equal(full.quote, true);
  assert.equal(compareFromLive(business('c'), {}, 4.1, now).distanceKm, 4.1);
  const mock = compareFromMock(searchBusinesses[0]!);
  assert.equal(mock.card, true);
  assert.equal(mock.reviews?.count, searchBusinesses[0]!.reviewCount);
  assert.equal(compareFromMock(searchBusinesses.find((b) => !b.payments.includes('kart'))!).card, null);
  const name = comparisonName([{name: 'Örnek Kadıköy Kaporta Boya Merkezi'}, {name: 'Örnek Ataşehir Lastik ve Rot Balans'}, {name: 'Örnek Üsküdar Teknik'}]);
  assert.ok(name.length <= 60 && name.startsWith('Karşılaştırma: Kadıköy'));
});

test('the stub search answers what the live decoder accepts (shapes, paging, total)', async () => {
  type Handler = (ctx: {query: URLSearchParams; params: Record<string, string>; req?: unknown; body?: unknown}, reply: Reply) => void;
  type Reply = {status: number; body: unknown; json(b: unknown, s?: number): Reply; error(s: number, m: string): Reply; empty(s?: number): Reply};
  const routes: {method: string; path: string; handler: Handler}[] = [];
  const api: Record<string, unknown> = {state: {}, uuid: () => crypto.randomUUID(), user: () => null};
  for (const method of ['get', 'post', 'patch', 'put', 'delete']) api[method] = (path: string, handler: Handler) => routes.push({method, path, handler});
  // @ts-expect-error plain .mjs route module without types
  const mod = await import('../dev/stub-api/routes/10-search.mjs');
  mod.default(api);
  const call = (path: string, query: string, params: Record<string, string> = {}) => {
    const reply: Reply = {status: 200, body: undefined, json(b, s = 200) { this.body = b; this.status = s; return this; }, error(s, m) { return this.json({error: m}, s); }, empty(s = 204) { this.status = s; return this; }};
    routes.find((r) => r.method === 'get' && r.path === path)!.handler({query: new URLSearchParams(query), params}, reply);
    return reply;
  };
  const first = call('/api/search', liveSearchParams(filters(), null).toString());
  assert.equal(first.status, 200);
  const decoded = decodeSearchPage(first.body, 'live');
  assert.equal(decoded.dropped, 0);
  assert.equal(decoded.items.length, 24);
  assert.ok(decoded.total && decoded.total.value > 24);
  assert.ok(decoded.nextCursor);
  assert.equal(decoded.sponsored.length, 1);
  const second = decodeSearchPage(call('/api/search', liveSearchParams(filters(), null, decoded.nextCursor!).toString()).body, 'live');
  assert.equal(second.items.length, decoded.total!.value - 24);
  assert.equal(second.nextCursor, null);
  assert.equal(call('/api/search', liveSearchParams(filters({verifiedOnly: true}), null, decoded.nextCursor!).toString()).status, 400, 'cursor bound to filters');
  const near = decodeSearchPage(call('/api/search', liveSearchParams(filters({area: 'cevre', sort: 'yakin'}), {latitude: 40.99, longitude: 29.03}).toString()).body, 'live');
  assert.equal(near.total, null);
  assert.ok(near.items.every((b) => b.coordinateStatus === 'verified' && b.distance !== undefined));
  assert.equal(call('/api/search', 'q=&city=İstanbul&v=2&sort=nearest').status, 400);
  const profile = call('/api/businesses/:id', 'v=2', {id: decoded.items[0]!.id});
  assert.equal(profile.status, 200);
  assert.ok((profile.body as {reviewSummary?: unknown}).reviewSummary);
  assert.equal(call('/api/businesses/:id', '', {id: 'yok'}).status, 404);
});
