// /servis/[id] (profile group): business record, public reviews, writing a review, the member's own
// review, review reports (review cases), wrong-data reports (web-04) and public business photos.
// Shapes: GET /api/businesses/{id}?v=2 = core publicBusiness + reviewSummary (+ openingHours when known);
// GET /api/reviews = core parsePublicReviews; POST /api/reviews = core reviewSchema → 201 {id, status:'pending'};
// GET /api/reviews/mine = {review: ownReviewView | null}; POST /api/review-cases = core caseInput → {ok:true};
// POST /api/businesses/{id}/reports = web-04; GET /api/businesses/photos/public = {businessId, ids, coverId}.
//
// GET /api/businesses/{id} itself is served by 10-search.mjs from api.state.businesses (an array); this file
// adds its four records there, with a `reviewSummary` getter computed from api.state.reviews.
//
// Fakes: there is no moderation, so a new review stays "pending" forever and never reaches the public list;
// reports and cases are only stored. Businesses from other route files get synthetic approved reviews on
// first read, matching their stored reviewSummary. Media endpoints answer a generated SVG, not JPEG/WebP.
// Shared state other route files may read: api.state.reviews (array of review records),
// api.state.reviewCases, api.state.businessReports.
const ID = /^[A-Za-z0-9_-]{1,120}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COVER = '3f0c7b0e-5a7d-4c1e-9b2a-6d1f0e2a7c11';
const PHOTOS = [COVER, '6b2d1c4e-8f3a-4b7c-a1d2-9e8f7a6b5c42', 'a1e2d3c4-b5a6-4978-8a1b-2c3d4e5f6a73'];

const week = (weekday, saturday) => [1, 2, 3, 4, 5].map((day) => ({day, intervals: [weekday]})).concat(saturday ? [{day: 6, intervals: [saturday]}] : []);

/** Synthetic businesses ("Örnek …"); ids match the demo catalogue so the same links work in both modes. */
const businesses = [
  {
    id: 'ornek-teknik-garaj', name: 'Örnek Teknik Garaj', city: 'İstanbul', district: 'Kadıköy',
    address: 'Örnek Sanayi Sitesi, A Blok No: 12, Kadıköy', categories: ['mechanical'],
    services: ['Periyodik bakım', 'Fren sistemi', 'Arıza tespiti', 'Triger seti değişimi'], brands: ['BMW', 'Mercedes-Benz', 'Audi'],
    phone: '+90 216 000 00 01', latitude: 40.9903, longitude: 29.0291, coordinateStatus: 'verified',
    ownership: 'verified', features: {quotes: true, appointments: true}, ownerReady: true, published: true,
    coverPhotoId: COVER, cardPayment: true, wc: true,
    openingHours: {timezone: 'Europe/Istanbul', week: week({open: '08:30', close: '19:00'}, {open: '09:00', close: '17:00'})},
  },
  {
    id: 'ornek-sanayi-motor', name: 'Örnek Sanayi Motor', city: 'İstanbul', district: 'Kartal',
    address: 'Örnek Sanayi Sitesi, E Blok No: 9, Kartal', categories: ['mechanical'],
    services: ['Motor revizyonu', 'Conta değişimi'], brands: [],
    phone: '+90 216 000 00 06', coordinateStatus: 'unverified',
    ownership: 'unclaimed', features: {quotes: false, appointments: false}, ownerReady: false, published: true,
  },
  {
    id: 'ornek-oto-elektrik', name: 'Örnek Oto Elektrik', city: 'İstanbul', district: 'Kadıköy',
    address: 'Örnek Sanayi Sitesi, D Blok No: 3, Kadıköy', categories: ['electrical'],
    services: ['Akü değişimi', 'Marş motoru', 'Alternatör onarımı'], brands: ['Volkswagen', 'Audi', 'Skoda'],
    phone: '+90 216 000 00 04', coordinateStatus: 'unverified',
    ownership: 'pending', features: {quotes: false, appointments: false}, ownerReady: false, published: true,
    hours: 'Hafta içi 08.30–18.30\nCumartesi 09.00–14.00',
  },
  {
    id: 'ornek-klima-servis', name: 'Örnek Klima Servis', city: 'İstanbul', district: 'Üsküdar',
    address: 'Örnek Sanayi Çarşısı No: 15, Üsküdar', categories: ['climate'],
    services: ['Klima gazı dolumu', 'Kompresör onarımı'], brands: [],
    phone: '0850 000 00 07', latitude: 41.0227, longitude: 29.0153, coordinateStatus: 'verified',
    ownership: 'verified', features: {quotes: true, appointments: false}, ownerReady: true, published: true,
    cardPayment: false,
    openingHours: {timezone: 'Europe/Istanbul', week: [...week({open: '09:00', close: '18:00'}), {day: 6, intervals: [{open: '10:00', close: '14:00'}]}]},
  },
];

const texts = [
  'Fren balatalarını aynı gün değiştirdiler, fiyatı işe başlamadan söylediler.',
  'Periyodik bakım zamanında bitti, değişen parçaları gösterdiler.',
  'Arıza tespiti hızlıydı ama parça beklemek gerekti, haber verdiler.',
  'Bekleme alanı temizdi, kartla ödeme sorunsuz geçti.',
  'İşçilik iyi, fatura kesildi. Randevu saatine uydular.',
];

export default (api) => {
  const state = api.state;
  state.businesses ??= [];
  state.reviews ??= [];
  state.reviewCases ??= [];
  state.businessReports ??= [];

  // Seed: 22 approved reviews for the verified garage (two pages), three for the electrician, none elsewhere.
  if (!state.reviews.some((r) => r.seed === 'profile')) {
    const now = Date.UTC(2026, 10, 10);
    for (let i = 0; i < 22; i++) {
      state.reviews.push({
        seed: 'profile', id: `rv-garaj-${String(i + 1).padStart(2, '0')}`, businessId: 'ornek-teknik-garaj', businessName: 'Örnek Teknik Garaj',
        uid: `stub-reviewer-${i}`, status: 'approved', version: 1, reason: '',
        rating: [5, 4, 5, 3, 5][i % 5], text: texts[i % texts.length], resolved: ['yes', 'yes', 'partial', 'unknown', 'yes'][i % 5], wc: i % 3 === 0 ? 'yes' : 'unknown',
        ...(i % 2 === 0 ? {quality: 5, payment: 4} : {}), ...(i % 3 === 0 ? {cleanliness: 4, wcCleanliness: 4} : {}),
        ...(i === 0 ? {reply: {text: 'Teşekkürler, tekrar bekleriz. Örnek Teknik Garaj ekibi.'}, photoIds: [PHOTOS[1], PHOTOS[2]]} : {}),
        createdAtMs: now - i * 86_400_000, updatedAtMs: now - i * 86_400_000,
      });
    }
    ['Akü değişimi yarım saatte bitti.', 'Marş motoru onarımı için iki gün beklettiler ama sonuç iyi.', 'Arıza tespiti ücretsizdi, açıkça anlattılar.'].forEach((text, i) => {
      state.reviews.push({seed: 'profile', id: `rv-elektrik-${i + 1}`, businessId: 'ornek-oto-elektrik', businessName: 'Örnek Oto Elektrik', uid: `stub-reviewer-e${i}`, status: 'approved', version: 1, reason: '', rating: [5, 3, 4][i], text, resolved: 'yes', wc: 'no', createdAtMs: Date.UTC(2026, 9, 20 - i), updatedAtMs: Date.UTC(2026, 9, 20 - i)});
    });
  }

  const all = () => (state.businesses instanceof Map ? [...state.businesses.values()] : state.businesses);
  const lookup = (id) => (ID.test(id) ? all().find((b) => b.id === id && b.published === true) : undefined);
  // Synthetic approved reviews for records of other route files, so the list matches their stored summary.
  const seeded = new Set();
  const ensureReviews = (business) => {
    if (seeded.has(business.id)) return;
    seeded.add(business.id);
    const stored = business._reviewSummary;
    if (!stored?.count || state.reviews.some((r) => r.businessId === business.id)) return;
    const total = Math.round((stored.average ?? 0) * stored.count);
    const base = Math.floor(total / stored.count);
    for (let i = 0; i < stored.count; i++) {
      const rating = Math.min(5, Math.max(1, base + (i < total - base * stored.count ? 1 : 0)));
      const at = Date.UTC(2026, 10, 1) - i * 86_400_000;
      state.reviews.push({seed: 'profile', id: `rv-${business.id}-${i + 1}`.slice(0, 120), businessId: business.id, businessName: business.name, uid: `stub-reviewer-x${i}`, status: 'approved', version: 1, reason: '', rating, text: texts[i % texts.length], resolved: i % 4 === 3 ? 'unknown' : 'yes', wc: 'unknown', createdAtMs: at, updatedAtMs: at});
    }
  };
  const approved = (businessId) => state.reviews.filter((r) => r.businessId === businessId && r.status === 'approved').sort((a, b) => b.createdAtMs - a.createdAtMs || a.id.localeCompare(b.id));
  const summary = (businessId) => {
    const list = approved(businessId);
    return {count: list.length, average: list.length ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10 : null};
  };
  // This file's records: added to the shared list with a live summary (10-search reads `reviewSummary`).
  for (const record of businesses) {
    if (all().some((b) => b.id === record.id)) continue;
    const b = {...record};
    Object.defineProperty(b, 'reviewSummary', {enumerable: true, get: () => summary(b.id)});
    if (state.businesses instanceof Map) state.businesses.set(b.id, b);
    else state.businesses.push(b);
  }
  const scores = (r) => Object.fromEntries(['quality', 'payment', 'cleanliness', 'wcCleanliness'].filter((k) => r[k] !== undefined).map((k) => [k, r[k]]));
  const member = (req, reply) => {
    const user = api.user(req);
    if (!user) {
      reply.error(401, 'Giriş gerekli.');
      return null;
    }
    if (!user.emailVerified) {
      reply.error(403, 'E-posta doğrulaması gerekli.');
      return null;
    }
    return user;
  };

  api.get('/api/reviews', ({query}, reply) => {
    const keys = [...query.keys()];
    if (keys.some((k) => !['businessId', 'after'].includes(k) || query.getAll(k).length !== 1)) return reply.error(400, 'Geçersiz istek.');
    const businessId = query.get('businessId') ?? '';
    const after = query.get('after');
    if (!ID.test(businessId) || (after !== null && !ID.test(after))) return reply.error(400, 'Geçersiz istek.');
    const business = lookup(businessId);
    if (business) ensureReviews(business);
    const list = approved(businessId);
    const start = after ? list.findIndex((r) => r.id === after) + 1 : 0;
    const page = list.slice(start, start + 20);
    const more = start + 20 < list.length;
    const {count, average} = summary(businessId);
    return reply.json({
      reviews: page.map((r) => ({id: r.id, rating: r.rating, text: r.text, resolved: r.resolved, wc: r.wc, ...scores(r), ...(r.reply ? {reply: r.reply} : {}), ...(r.photoIds?.length ? {photoIds: r.photoIds} : {})})),
      nextCursor: more && page.length === 20 ? page.at(-1).id : null,
      count,
      average,
    });
  });

  api.post('/api/reviews', ({req, body}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const allowed = ['businessId', 'rating', 'quality', 'payment', 'cleanliness', 'resolved', 'wc', 'wcCleanliness', 'text'];
    const score = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const valid = body && typeof body === 'object' && !body.__invalid && Object.keys(body).every((k) => allowed.includes(k))
      && ID.test(String(body.businessId ?? '')) && score(body.rating)
      && ['quality', 'payment', 'cleanliness', 'wcCleanliness'].every((k) => body[k] === undefined || score(body[k]))
      && ['yes', 'partial', 'no', 'unknown'].includes(body.resolved) && ['yes', 'no', 'unknown'].includes(body.wc)
      && (body.wc === 'yes' || body.wcCleanliness === undefined) && text.length >= 10 && text.length <= 3000;
    if (!valid) return reply.error(400, 'Puanını ve yorumunu kontrol et.');
    const business = lookup(body.businessId);
    if (!business) return reply.error(404, 'İşletme bulunamadı.');
    if (state.reviews.some((r) => r.businessId === business.id && r.uid === user.uid)) return reply.error(409, 'Bu işletme için yorumun zaten var.');
    const id = 'rv-' + api.uuid().slice(0, 18);
    const now = Date.now();
    state.reviews.push({id, businessId: business.id, businessName: business.name, uid: user.uid, status: 'pending', version: 1, reason: '', rating: body.rating, text, resolved: body.resolved, wc: body.wc, ...scores(body), createdAtMs: now, updatedAtMs: now});
    return reply.json({id, status: 'pending'}, 201);
  });

  api.get('/api/reviews/mine', ({req, query}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const businessId = query.get('businessId') ?? '';
    if ([...query.keys()].length !== 1 || !ID.test(businessId)) return reply.error(400, 'Geçersiz istek.');
    const r = state.reviews.find((x) => x.businessId === businessId && x.uid === user.uid);
    if (!r) return reply.json({review: null});
    return reply.json({review: {
      id: r.id, text: r.text, rating: r.rating, status: r.status, version: r.version, reason: r.reason ?? '', resolved: r.resolved, wc: r.wc, ...scores(r),
      canEdit: ['pending', 'approved', 'rejected'].includes(r.status), canWithdraw: r.status !== 'withdrawn',
    }});
  });

  api.post('/api/review-cases', ({req, body}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!body || Object.keys(body).some((k) => !['reviewId', 'kind', 'text'].includes(k)) || !ID.test(String(body.reviewId ?? '')) || !['report', 'appeal'].includes(body.kind) || text.length < 10 || text.length > 2000) {
      return reply.error(400, 'Başvuruyu kontrol et. En az 10 karakter açıklama yaz.');
    }
    const review = state.reviews.find((r) => r.id === body.reviewId && r.status === 'approved');
    if (!review) return reply.error(404, 'Yorum bulunamadı.');
    if (body.kind === 'report' && review.uid === user.uid) return reply.error(403, 'Kendi yorumunu bildiremezsin.');
    if (state.reviewCases.some((c) => c.uid === user.uid && c.reviewId === review.id && c.kind === body.kind && c.status === 'open')) return reply.error(409, 'Bu yorum için açık bir başvurun var.');
    state.reviewCases.push({id: api.uuid(), uid: user.uid, reviewId: review.id, businessId: review.businessId, kind: body.kind, text, status: 'open', decision: '', reason: '', createdAtMs: Date.now()});
    return reply.json({ok: true}, 201);
  });

  api.post('/api/businesses/:id/reports', ({req, params, body}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const reasons = ['closed', 'moved', 'phone', 'address', 'location', 'hours', 'services', 'other'];
    const note = typeof body?.note === 'string' ? body.note.trim() : '';
    if (!body || Object.keys(body).some((k) => !['reason', 'note', 'operationId'].includes(k)) || !reasons.includes(body.reason) || !UUID.test(String(body.operationId ?? '')) || note.length > 1000 || (body.note !== undefined && typeof body.note !== 'string')) {
      return reply.error(400, 'Geçersiz istek.');
    }
    if (body.reason === 'other' && note.length < 10) return reply.error(400, '“Diğer” için en az 10 karakter açıklama yaz.');
    if (/https?:\/\/|www\.|@|\d{10,}/i.test(note.replace(/\s/g, ''))) return reply.error(400, 'Notta bağlantı, iletişim bilgisi veya uygunsuz ifade olmamalı.');
    const business = lookup(params.id);
    if (!business) return reply.error(404, 'İşletme bulunamadı.');
    const same = state.businessReports.find((r) => r.uid === user.uid && r.operationId === body.operationId);
    if (same) {
      if (same.reason !== body.reason || same.note !== note) return reply.error(409, 'Bu bildirim farklı içerikle zaten gönderildi.');
      return reply.json(view(same), 200);
    }
    if (state.businessReports.some((r) => r.uid === user.uid && r.businessId === business.id && r.status === 'submitted')) return reply.error(409, 'Bu işletme için açık bir bildirimin zaten var.');
    const report = {id: api.uuid(), uid: user.uid, operationId: body.operationId, businessId: business.id, businessName: business.name, reason: body.reason, note, status: 'submitted', createdAtMs: Date.now()};
    state.businessReports.push(report);
    return reply.json(view(report), 201);
  });
  const view = (r) => ({id: r.id, businessId: r.businessId, reason: r.reason, status: r.status, createdAtMs: r.createdAtMs});

  api.get('/api/businesses/photos/public', ({query}, reply) => {
    const businessId = query.get('businessId') ?? '';
    if ([...query.keys()].length !== 1 || !ID.test(businessId)) return reply.error(400, 'Geçersiz istek.');
    const business = lookup(businessId);
    if (!business) return reply.error(404, 'İşletme bulunamadı.');
    const ids = business.coverPhotoId ? PHOTOS : [];
    return reply.json({businessId, ids, coverId: business.coverPhotoId ?? null});
  });

  const svg = (label, hue) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="hsl(${hue} 35% 82%)"/><rect x="60" y="300" width="680" height="120" rx="24" fill="hsl(${hue} 30% 62%)"/><circle cx="220" cy="300" r="56" fill="hsl(${hue} 20% 30%)"/><circle cx="580" cy="300" r="56" fill="hsl(${hue} 20% 30%)"/><text x="400" y="120" font-family="sans-serif" font-size="36" text-anchor="middle" fill="hsl(${hue} 25% 25%)">${label}</text></svg>`;
  api.get('/api/businesses/photos/media', ({query}, reply) => {
    const index = PHOTOS.indexOf(query.get('id') ?? '');
    if (!lookup(query.get('businessId') ?? '') || index < 0) return reply.error(404, 'Bulunamadı.');
    return reply.header('Cache-Control', 'public, max-age=300').raw(svg(`Örnek atölye fotoğrafı ${index + 1}`, 30 + index * 70), 'image/svg+xml');
  });
  api.get('/api/review-photos/media', ({query}, reply) => {
    const index = PHOTOS.indexOf(query.get('id') ?? '');
    if (index < 0) return reply.error(404, 'Bulunamadı.');
    return reply.header('Cache-Control', 'public, max-age=300').raw(svg(`Örnek yorum fotoğrafı ${index}`, 200 + index * 40), 'image/svg+xml');
  });
};
