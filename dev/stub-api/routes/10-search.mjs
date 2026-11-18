// Search group: GET /api/search (v1 + v2: sort, cursor, total, verifiedOwner, reviewSummary, openingHours),
// GET /api/businesses/:id (v2), coverage waitlist (web-12) and named lists (web-13, used by "Karşılaştırmayı kaydet").
// Synthetic businesses only ("Örnek …"), kept in api.state.businesses so other route files can share them.
// Faked: full-text search is a plain substring match; the cursor is an unsigned offset + filter hash
// (the real one is HMAC-signed); `rating` uses the same Bayes formula as the API note (C=5, m=3.5).
import {readFileSync} from 'node:fs';

const coverage = JSON.parse(readFileSync(new URL('../../../packages/core/coverage-data.json', import.meta.url), 'utf8'));
const provinces = JSON.parse(readFileSync(new URL('../../../app/data/provinces.json', import.meta.url), 'utf8')).provinces;
const covered = new Set(coverage.cities);

const categories = [
  {id: 'mechanical', name: 'Teknik Servis', services: ['Periyodik bakım', 'Motor bakımı', 'Fren', 'Süspansiyon']},
  {id: 'body', name: 'Kaporta Boya', services: ['Kaporta', 'Boya', 'Boyasız göçük', 'Tampon onarımı']},
  {id: 'tyres', name: 'Lastik', services: ['Lastik', 'Rot balans', 'Jant onarımı']},
  {id: 'electrical', name: 'Oto Elektrik', services: ['Oto elektrik', 'Akü', 'Arıza tespiti']},
  {id: 'climate', name: 'Klima Servisi', services: ['Klima bakımı', 'Gaz dolumu']},
  {id: 'auto-expertise', name: 'Ekspertiz', services: ['Oto ekspertiz', 'Kaporta boya kontrolü']},
  {id: 'electric-vehicle', name: 'EV Servisi', services: ['Elektrikli araç', 'Batarya teşhisi']},
];
const brandSets = [['BMW', 'Mercedes-Benz'], ['Volkswagen', 'Audi'], ['Renault', 'Fiat'], ['Toyota', 'Honda'], ['Ford', 'Opel'], [], ['Togg', 'Tesla', 'BYD'], ['Hyundai', 'Kia']];
const week = (close) => ({timezone: 'Europe/Istanbul', week: [1, 2, 3, 4, 5].map((day) => ({day, intervals: [{open: '09:00', close}]})).concat([{day: 6, intervals: [{open: '10:00', close: '15:00'}]}]), exceptions: [], updatedAtMs: 1794312000000});

function district(city, name) {
  const d = coverage.areas[city]?.districts.find((x) => x.name === name);
  return d && typeof d.latitude === 'number' ? d : coverage.areas[city].center;
}

function build() {
  const places = [
    ['İstanbul', ['Kadıköy', 'Ataşehir', 'Üsküdar', 'Maltepe', 'Kartal', 'Ümraniye', 'Beşiktaş', 'Şişli'], 36, '216'],
    ['Ankara', ['Çankaya', 'Yenimahalle', 'Keçiören'], 5, '312'],
    ['İzmir', ['Bornova', 'Karşıyaka', 'Konak'], 4, '232'],
  ];
  const list = [];
  for (const [city, districts, count, area] of places) {
    for (let i = 0; i < count; i++) {
      const n = list.length + 1;
      const name = districts[i % districts.length];
      const category = categories[(i * 3 + n) % categories.length];
      const verifiedPin = n % 5 !== 0; // every fifth record has no verified pin (listed, not mapped)
      const ownership = n % 4 === 0 ? 'unclaimed' : n % 7 === 0 ? 'pending' : 'verified';
      const ready = ownership === 'verified' && n % 3 !== 0;
      const anchor = district(city, name);
      const reviews = n % 6 === 0 ? 0 : ((n * 7) % 60) + 1;
      const b = {
        id: `ornek-${city === 'İstanbul' ? 'ist' : city === 'Ankara' ? 'ank' : 'izm'}-${String(n).padStart(2, '0')}`,
        name: `Örnek ${name} ${category.name}${i >= districts.length ? ` ${Math.floor(i / districts.length) + 1}` : ''}`,
        city, district: name,
        address: `Örnek Sanayi Sitesi, ${String.fromCharCode(65 + (n % 8))} Blok No: ${n}, ${name}`,
        categories: [category.id],
        services: category.services.slice(0, 2 + (n % 3)),
        brands: brandSets[n % brandSets.length],
        phone: `+90 ${area} 000 ${String(10 + (n % 80)).padStart(2, '0')} ${String(n).padStart(2, '0')}`,
        coordinateStatus: verifiedPin ? 'verified' : 'unverified',
        ...(verifiedPin ? {latitude: +(anchor.latitude + ((n % 7) - 3) * 0.004).toFixed(5), longitude: +(anchor.longitude + ((n % 5) - 2) * 0.005).toFixed(5)} : {}),
        ownership,
        features: {quotes: ready, appointments: ready && n % 2 === 0},
        ownerReady: ready,
        published: true,
        ...(n % 3 === 0 ? {} : {cardPayment: n % 5 !== 1}),
        ...(n % 4 === 1 ? {hours: 'Hafta içi 09.00–18.00'} : {}),
        // v2-only extensions (stripped from v1 answers)
        _reviewSummary: {count: reviews, average: reviews ? Math.round((3.6 + ((n * 13) % 14) / 10) * 10) / 10 : null},
        ...(n % 3 === 1 ? {_openingHours: week(n % 2 ? '18:30' : '19:00')} : {}),
      };
      if (b._reviewSummary.average !== null && b._reviewSummary.average > 5) b._reviewSummary.average = 5;
      list.push(b);
    }
  }
  return list;
}

const fold = (s) => String(s).toLocaleLowerCase('tr').replaceAll('ı', 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const haversine = (a, b) => {
  const r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.latitude - a.latitude);
  const dLng = r(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

/** Review summary of a record (records added by other route files may carry it without the underscore). */
const summary = (b) => b._reviewSummary ?? b.reviewSummary ?? {count: 0, average: null};

/** Public shape: v1 never carries the v2 extensions. */
function publicShape(b, v2, distance) {
  const {_reviewSummary, _openingHours, reviewSummary, openingHours, ...core} = b;
  const hours = _openingHours ?? openingHours;
  return {
    ...core,
    ...(distance === undefined ? {} : {distance: Math.round(distance * 10) / 10}),
    ...(v2 ? {reviewSummary: summary(b), ...(hours ? {openingHours: hours} : {})} : {}),
  };
}

const allowed = new Set(['q', 'city', 'district', 'category', 'service', 'brand', 'card', 'lat', 'lng', 'radius', 'v', 'sort', 'cursor', 'verifiedOwner']);
const v2Only = ['sort', 'cursor', 'verifiedOwner'];
const PAGE = 24;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = (value) => {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); } catch { return null; }
};

export default (api) => {
  // api.state.businesses is an array shared with 20-profile / 40-requests (they append their records).
  if (!api.state.businesses) api.state.businesses = build();
  else if (Array.isArray(api.state.businesses)) api.state.businesses.push(...build().filter((b) => !api.state.businesses.some((x) => x.id === b.id)));
  api.state.waitlist ??= new Map(); // uid -> [{city, createdAtMs}]
  api.state.lists ??= new Map(); // uid -> [list]
  const businesses = () => (api.state.businesses instanceof Map ? [...api.state.businesses.values()] : api.state.businesses);

  api.get('/api/search', ({query}, reply) => {
    for (const key of query.keys()) if (!allowed.has(key) || query.getAll(key).length !== 1) return reply.error(400, 'Arama filtrelerini kontrol et.');
    const v2 = query.get('v') === '2';
    if (query.has('v') && !v2) return reply.error(400, 'Arama filtrelerini kontrol et.');
    if (!v2 && v2Only.some((k) => query.has(k))) return reply.error(400, 'Arama filtrelerini kontrol et.');
    const get = (k) => (query.get(k) ?? '').trim();
    const [q, city, districtName, category, service, brand] = ['q', 'city', 'district', 'category', 'service', 'brand'].map(get);
    if (q.length > 150 || (city && !covered.has(city)) || (districtName && !city)) return reply.error(400, 'Arama filtrelerini kontrol et.');
    if (service && !category) return reply.error(400, 'Arama filtrelerini kontrol et.');
    if (query.has('card') && !['true', 'false'].includes(query.get('card'))) return reply.error(400, 'Arama filtrelerini kontrol et.');
    const lat = query.has('lat') ? Number(query.get('lat')) : undefined;
    const lng = query.has('lng') ? Number(query.get('lng')) : undefined;
    const radius = query.has('radius') ? Number(query.get('radius')) : 25;
    if ((lat === undefined) !== (lng === undefined) || [lat, lng, radius].some((x) => x !== undefined && !Number.isFinite(x)) || radius < 1 || radius > 200) return reply.error(400, 'Arama filtrelerini kontrol et.');
    const center = lat !== undefined ? {latitude: lat, longitude: lng} : null;
    const sort = get('sort') || 'recommended';
    if (!['recommended', 'nearest', 'rating', 'most_reviewed'].includes(sort) || (sort === 'nearest' && !center)) return reply.error(400, 'Bu sıralama için konum gerekir.');
    const verifiedOwner = query.get('verifiedOwner') === 'true';

    let hits = businesses().filter((b) => b.published).map((b) => ({b, distance: undefined}));
    if (center) {
      hits = hits.filter(({b}) => b.coordinateStatus === 'verified').map(({b}) => ({b, distance: haversine(center, b)})).filter((h) => h.distance <= radius);
    } else if (city) {
      hits = hits.filter(({b}) => b.city === city && (!districtName || fold(b.district) === fold(districtName)));
    } else {
      hits = [];
    }
    if (category) hits = hits.filter(({b}) => b.categories.includes(category));
    if (service) hits = hits.filter(({b}) => b.services.some((s) => fold(s) === fold(service)));
    if (brand) hits = hits.filter(({b}) => b.brands.some((x) => fold(x) === fold(brand)));
    if (query.get('card') === 'true') hits = hits.filter(({b}) => b.cardPayment === true);
    if (verifiedOwner) hits = hits.filter(({b}) => b.ownership === 'verified');
    if (q) {
      const words = fold(q).split(/\s+/).filter((w) => w.length > 1);
      hits = hits.filter(({b}) => words.every((w) => fold([b.name, b.district, ...b.services, ...b.brands].join(' ')).includes(w)));
    }
    const bayes = (b) => (5 * 3.5 + (summary(b).average ?? 0) * summary(b).count) / (5 + summary(b).count);
    const byName = (a, b) => a.b.name.localeCompare(b.b.name, 'tr');
    if (sort === 'nearest' || (sort === 'recommended' && center)) hits.sort((a, b) => a.distance - b.distance);
    else if (sort === 'rating') hits.sort((a, b) => bayes(b.b) - bayes(a.b) || byName(a, b));
    else if (sort === 'most_reviewed') hits.sort((a, b) => summary(b.b).count - summary(a.b).count || byName(a, b));
    else hits.sort(byName);

    const hash = [...query.entries()].filter(([k]) => k !== 'cursor').sort().map(([k, v]) => `${k}=${v}`).join('&');
    let offset = 0;
    if (query.has('cursor')) {
      const c = decode(get('cursor'));
      if (!c || c.h !== hash || !Number.isInteger(c.o) || c.o < 0) return reply.error(400, 'Arama sayfası geçersiz. Aramayı yeniden başlat.');
      offset = c.o;
    }
    const page = hits.slice(offset, offset + PAGE);
    const districts = city ? [...new Set(businesses().filter((b) => b.city === city).map((b) => b.district))].sort((a, b) => a.localeCompare(b, 'tr')) : [];
    // One synthetic sponsored entry on the first page of an unfiltered İstanbul search (real ones come from paid campaigns).
    const sponsorBase = v2 && !offset && city === 'İstanbul' && !q && !category && !brand && !districtName ? businesses().find((b) => b.ownership === 'verified' && b.coordinateStatus === 'verified') : null;
    const body = {
      items: page.map(({b, distance}) => publicShape(b, v2, distance)),
      districts,
      sponsored: sponsorBase ? [{business: publicShape(sponsorBase, false), headline: 'Örnek kampanya: ücretsiz ön kontrol', description: 'Sentetik sponsorlu kayıt (stub).', expiresAtMs: Date.now() + 86400000}] : [],
      mode: 'live',
    };
    if (v2) Object.assign(body, {sort, nextCursor: offset + PAGE < hits.length ? encode({o: offset + PAGE, h: hash}) : null, total: q || center ? null : {value: hits.length, exact: true}});
    return reply.json(body);
  });

  api.get('/api/businesses/:id', ({params, query}, reply) => {
    if (query.has('v') && query.get('v') !== '2') return reply.error(400, 'Geçersiz istek.');
    const b = businesses().find((x) => x.id === params.id && x.published);
    if (!b) return reply.error(404, 'İşletme bulunamadı.');
    return reply.json(publicShape(b, query.get('v') === '2'));
  });

  // web-12 coverage waitlist: verified e-mail only; uncovered provinces only; at most 5.
  const member = (req, reply) => {
    const user = api.user(req);
    if (!user) { reply.error(401, 'Giriş gerekli.'); return null; }
    if (!user.emailVerified) { reply.error(403, 'E-posta adresini doğrula.'); return null; }
    return user;
  };
  const waits = (uid) => {
    if (!api.state.waitlist.has(uid)) api.state.waitlist.set(uid, []);
    return api.state.waitlist.get(uid);
  };
  api.get('/api/coverage/waitlist', ({req}, reply) => {
    const user = member(req, reply);
    if (user) reply.json({items: waits(user.uid)});
  });
  api.post('/api/coverage/waitlist', ({req, body}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const city = typeof body?.city === 'string' ? body.city.trim() : '';
    if (!provinces.includes(city) || covered.has(city)) return reply.error(400, 'Bu il için bekleme listesi yok.');
    const list = waits(user.uid);
    const found = list.find((w) => w.city === city);
    if (found) return reply.json(found, 200);
    if (list.length >= 5) return reply.error(409, 'En fazla 5 il.');
    const item = {city, createdAtMs: Date.now()};
    list.push(item);
    return reply.json(item, 201);
  });
  api.delete('/api/coverage/waitlist', ({req, query}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    api.state.waitlist.set(user.uid, waits(user.uid).filter((w) => w.city !== query.get('city')));
    return reply.empty(204);
  });

  // web-13 named lists (shared with the saved screens if another route file has not registered them first).
  const lists = (uid) => {
    if (!api.state.lists.has(uid)) api.state.lists.set(uid, []);
    return api.state.lists.get(uid);
  };
  const publishedIds = () => new Set(businesses().filter((b) => b.published).map((b) => b.id));
  api.get('/api/me/lists', ({req}, reply) => {
    const user = member(req, reply);
    if (user) reply.json({items: lists(user.uid)});
  });
  api.post('/api/me/lists', ({req, body}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const ids = Array.isArray(body?.businessIds) ? body.businessIds : null;
    const own = lists(user.uid);
    const again = own.find((l) => l.operationId === body?.operationId);
    if (again) return reply.json(again, 200);
    if (!name || name.length > 60 || !['list', 'comparison'].includes(body?.kind) || !ids || ids.length > (body.kind === 'comparison' ? 3 : 100)) return reply.error(400, 'Liste bilgilerini kontrol et.');
    if (ids.some((id) => !publishedIds().has(id))) return reply.error(400, 'Listeye yalnız yayındaki işletmeler eklenebilir.');
    if (own.length >= 20) return reply.error(409, 'En fazla 20 liste.');
    const now = Date.now();
    const list = {id: api.uuid(), name, kind: body.kind, businessIds: [...new Set(ids)], unavailableIds: [], version: 1, createdAtMs: now, updatedAtMs: now, operationId: body.operationId};
    own.push(list);
    return reply.json(list, 201);
  });
  api.patch('/api/me/lists', ({req, body}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const list = lists(user.uid).find((l) => l.id === body?.id);
    if (!list) return reply.error(404, 'Liste bulunamadı.');
    if (list.version !== body.expectedVersion) return reply.error(409, 'Liste başka bir yerde değişti.');
    if (typeof body.name === 'string') list.name = body.name.trim().slice(0, 60);
    if (Array.isArray(body.add)) list.businessIds = [...new Set([...list.businessIds, ...body.add])];
    if (Array.isArray(body.remove)) list.businessIds = list.businessIds.filter((id) => !body.remove.includes(id));
    list.version++;
    list.updatedAtMs = Date.now();
    return reply.json(list);
  });
  api.delete('/api/me/lists', ({req, query}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    api.state.lists.set(user.uid, lists(user.uid).filter((l) => l.id !== query.get('id')));
    return reply.empty(204);
  });
};
