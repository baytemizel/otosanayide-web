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
// v2-03 (`?v=2` on GET /api/reviews and /api/reviews/mine): author {displayName} (short "Selin A."; null without a
// name), communication / priceTransparency, service, visitMonth, publishedAtMs. POST /api/reviews and the PATCH edit
// accept those four optional fields (visitMonth: this Europe/Istanbul month … 24 months back). POST /api/review-cases
// takes `reason` (fake|offensive|personal_data|not_customer|spam|other); text optional unless no reason / other.
// reviewSummary.aspects (per-aspect average + count of approved reviews) is part of this file's reviewSummary getter.
//
// Fakes: there is no moderation, so a new review stays "pending" forever and never reaches the public list;
// reports and cases are only stored. Businesses from other route files get synthetic approved reviews on
// first read, matching their stored reviewSummary. Media endpoints answer a generated SVG, not JPEG/WebP.
// reviewSummary.aspects also appears on search hits for this file's four records (the real API sends it only on
// GET /api/businesses/{id}?v=2). Reviewer names are synthetic. The seed member has one pending review here
// (ornek-teknik-garaj) to try editing.
// PATCH /api/reviews/mine and GET /api/reviews/mine/all are owned by 40-requests.mjs (its own seed list); this file
// wraps them: a review stored here (api.state.reviews) is edited / withdrawn here and added to the /mine/all list,
// everything else falls through to 40-requests unchanged.
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

const SEED_UID = 'stub-user-deniz';
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const REPORT_REASONS = ['fake', 'offensive', 'personal_data', 'not_customer', 'spam', 'other'];
const REASON_TEXT = {fake: 'Sahte veya yanıltıcı yorum.', offensive: 'Hakaret veya saldırgan içerik.', personal_data: 'Kişisel veri paylaşımı içeriyor.', not_customer: 'Yorumcu işletmenin müşterisi değil.', spam: 'Spam veya reklam içeriği.'};
const ASPECTS = ['quality', 'payment', 'cleanliness', 'communication', 'priceTransparency'];
/** Synthetic reviewer names (some reviewers have none and stay anonymous). */
const NAMES = ['Selin Aydın', 'Mert Yılmaz', null, 'Deniz Kaya', 'Ece Tan', 'Can Öztürk', null, 'Zeynep Arslan'];
/** Same rule as the API's DisplayName::short: first word + initial of the last word. */
const shortName = (full) => {
  const parts = String(full ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0].slice(0, 40) : `${parts[0].slice(0, 40)} ${parts.at(-1)[0].toLocaleUpperCase('tr-TR')}.`;
};
/** v2-03: this Europe/Istanbul calendar month or up to 24 months back. */
const monthAllowed = (month) => {
  const now = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit'}).format(new Date()).split('-').map(Number);
  const [y, m] = month.split('-').map(Number);
  const diff = now[0] * 12 + now[1] - (y * 12 + m);
  return diff >= 0 && diff <= 24;
};
/** Shared reviewSchema check (POST body and PATCH `review`); returns an error message or null. */
const reviewProblem = (body) => {
  const allowed = ['businessId', 'rating', 'quality', 'payment', 'cleanliness', 'resolved', 'wc', 'wcCleanliness', 'text', 'communication', 'priceTransparency', 'service', 'visitMonth'];
  const score = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const valid = body && typeof body === 'object' && !body.__invalid && Object.keys(body).every((k) => allowed.includes(k))
    && ID.test(String(body.businessId ?? '')) && score(body.rating)
    && ['quality', 'payment', 'cleanliness', 'wcCleanliness', 'communication', 'priceTransparency'].every((k) => body[k] === undefined || score(body[k]))
    && ['yes', 'partial', 'no', 'unknown'].includes(body.resolved) && ['yes', 'no', 'unknown'].includes(body.wc)
    && (body.wc === 'yes' || body.wcCleanliness === undefined) && text.length >= 10 && text.length <= 3000
    && (body.service === undefined || (typeof body.service === 'string' && body.service.trim().length <= 120))
    && (body.visitMonth === undefined || (typeof body.visitMonth === 'string' && MONTH.test(body.visitMonth)));
  if (!valid) return 'Puanını ve yorumunu kontrol et.';
  if (body.visitMonth !== undefined && !monthAllowed(body.visitMonth)) return 'Ziyaret ayı gelecekte veya 24 aydan eski olamaz.';
  return null;
};
/** The stored fields of a valid review body; a field that is not sent is cleared (the API rewrites the review). */
const reviewFields = (body) => ({
  rating: body.rating, text: body.text.trim(), resolved: body.resolved, wc: body.wc,
  quality: body.quality, payment: body.payment, cleanliness: body.cleanliness, wcCleanliness: body.wcCleanliness,
  communication: body.communication, priceTransparency: body.priceTransparency,
  service: typeof body.service === 'string' && body.service.trim() ? body.service.trim() : null, visitMonth: body.visitMonth ?? null,
});

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
        // v2-03 fields on most seeds; some reviews predate them.
        ...(i % 2 === 0 ? {communication: [5, 4, 5][i % 3]} : {}), ...(i % 4 === 0 ? {priceTransparency: 4} : {}),
        authorName: NAMES[i % NAMES.length], service: i % 3 === 2 ? null : ['Periyodik bakım', 'Fren sistemi', 'Arıza tespiti'][i % 3],
        visitMonth: i % 5 === 4 ? null : `2026-${String(10 - (i % 4)).padStart(2, '0')}`,
        createdAtMs: now - i * 86_400_000, updatedAtMs: now - i * 86_400_000,
      });
    }
    // The seed member's own review (pending, so not public) to try "Düzenle" and Yorumlarım.
    state.reviews.push({
      seed: 'profile', id: 'rv-ornek-uye-garaj', businessId: 'ornek-teknik-garaj', businessName: 'Örnek Teknik Garaj', uid: SEED_UID, status: 'pending', version: 1, reason: '',
      rating: 4, text: 'Periyodik bakımı zamanında bitirdiler, değişen parçaları gösterdiler.', resolved: 'yes', wc: 'unknown', quality: 5, communication: 4,
      service: 'Periyodik bakım', visitMonth: '2026-10', createdAtMs: now - 3 * 86_400_000, updatedAtMs: now - 3 * 86_400_000,
    });
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
  const aspects = (businessId) => {
    const list = approved(businessId);
    return Object.fromEntries(ASPECTS.map((key) => {
      const scored = list.filter((r) => r[key] !== undefined && r[key] !== null);
      return [key, {average: scored.length ? Math.round((scored.reduce((s, r) => s + r[key], 0) / scored.length) * 10) / 10 : null, count: scored.length}];
    }));
  };
  // This file's records: added to the shared list with a live summary (10-search reads `reviewSummary`).
  for (const record of businesses) {
    if (all().some((b) => b.id === record.id)) continue;
    const b = {...record};
    Object.defineProperty(b, 'reviewSummary', {enumerable: true, get: () => ({...summary(b.id), aspects: aspects(b.id)})});
    if (state.businesses instanceof Map) state.businesses.set(b.id, b);
    else state.businesses.push(b);
  }
  const scores = (r) => Object.fromEntries(['quality', 'payment', 'cleanliness', 'wcCleanliness'].filter((k) => r[k] !== undefined && r[k] !== null).map((k) => [k, r[k]]));
  const v2Fields = (r) => ({
    ...Object.fromEntries(['communication', 'priceTransparency'].filter((k) => r[k] !== undefined && r[k] !== null).map((k) => [k, r[k]])),
    service: r.service ?? null, visitMonth: r.visitMonth ?? null,
  });
  const authorOf = (r) => {
    const name = r.authorName !== undefined ? r.authorName : [...state.users.values()].find((u) => u.uid === r.uid)?.name;
    const short = shortName(name);
    return short ? {displayName: short} : null;
  };
  /** `v` may only be "2"; returns null for a bad value. */
  const v2Of = (query) => (query.has('v') ? (query.get('v') === '2' && query.getAll('v').length === 1 ? true : null) : false);
  const ownView = (r, v2) => ({
    id: r.id, text: r.text, rating: r.rating, status: r.status, version: r.version, reason: r.reason ?? '', resolved: r.resolved, wc: r.wc, ...scores(r),
    canEdit: ['pending', 'approved', 'rejected', 'withdrawn'].includes(r.status), canWithdraw: r.status !== 'withdrawn',
    ...(v2 ? v2Fields(r) : {}),
  });
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
    const v2 = v2Of(query);
    if (v2 === null || keys.some((k) => !['businessId', 'after', 'v'].includes(k) || query.getAll(k).length !== 1)) return reply.error(400, 'Geçersiz istek.');
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
      reviews: page.map((r) => ({
        id: r.id, rating: r.rating, text: r.text, resolved: r.resolved, wc: r.wc, ...scores(r), ...(r.reply ? {reply: r.reply} : {}), ...(r.photoIds?.length ? {photoIds: r.photoIds} : {}),
        ...(v2 ? {author: authorOf(r), ...v2Fields(r), publishedAtMs: r.publishedAtMs ?? r.createdAtMs ?? null} : {}),
      })),
      nextCursor: more && page.length === 20 ? page.at(-1).id : null,
      count,
      average,
    });
  });

  api.post('/api/reviews', ({req, body}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const problem = reviewProblem(body);
    if (problem) return reply.error(400, problem);
    const business = lookup(body.businessId);
    if (!business) return reply.error(404, 'İşletme bulunamadı.');
    if (state.reviews.some((r) => r.businessId === business.id && r.uid === user.uid)) return reply.error(409, 'Bu işletme için yorumun zaten var.');
    const id = 'rv-' + api.uuid().slice(0, 18);
    const now = Date.now();
    state.reviews.push({id, businessId: business.id, businessName: business.name, uid: user.uid, status: 'pending', version: 1, reason: '', ...reviewFields(body), createdAtMs: now, updatedAtMs: now});
    return reply.json({id, status: 'pending'}, 201);
  });

  api.get('/api/reviews/mine', ({req, query}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const businessId = query.get('businessId') ?? '';
    const v2 = v2Of(query);
    if (v2 === null || [...query.keys()].some((k) => !['businessId', 'v'].includes(k) || query.getAll(k).length !== 1) || !ID.test(businessId)) return reply.error(400, 'Geçersiz istek.');
    const r = state.reviews.find((x) => x.businessId === businessId && x.uid === user.uid);
    if (!r) return reply.json({review: null});
    return reply.json({review: ownView(r, v2)});
  });

  // Wraps 40-requests' PATCH /api/reviews/mine and GET /api/reviews/mine/all (registered after this file).
  const own = (uid, businessId) => state.reviews.find((x) => x.uid === uid && x.businessId === businessId);
  const patchMine = ({req, body}, reply) => {
    const user = api.user(req);
    const r = user && body && typeof body === 'object' ? own(user.uid, body.businessId) : undefined;
    if (!r) return false;
    if (!user.emailVerified) return reply.error(403, 'E-posta doğrulaması gerekli.'), true;
    if (r.version !== body.expectedVersion) return reply.error(409, 'Yorum değişti. Güncel sürümü yükleyip yeniden dene.'), true;
    const view = ownView(r, false);
    if (body.action === 'withdraw' && body.confirmed === true && Object.keys(body).length === 4 && view.canWithdraw) {
      Object.assign(r, {status: 'withdrawn', version: r.version + 1, updatedAtMs: Date.now()});
      return reply.json({ok: true, status: 'withdrawn'}), true;
    }
    if (body.action === 'edit' && Object.keys(body).length === 4) {
      const problem = reviewProblem(body.review);
      if (problem) return reply.error(400, problem), true;
      if (body.review.businessId !== r.businessId) return reply.error(400, 'Yorum işletmesi değiştirilemez.'), true;
      if (!view.canEdit) return reply.error(409, 'Bu yorum için işlem kullanılamıyor.'), true;
      Object.assign(r, reviewFields(body.review), {status: 'pending', version: r.version + 1, updatedAtMs: Date.now(), reply: undefined});
      return reply.json({ok: true, status: 'pending'}), true;
    }
    return reply.error(400, 'Geçersiz istek.'), true;
  };
  const listMine = (ctx, reply, next) => {
    const v2 = v2Of(ctx.query);
    if (v2 === null) return reply.error(400, 'Geçersiz istek.');
    // Let 40-requests answer into a scratch reply, then add the reviews stored here.
    const scratch = {status: 200, body: undefined, json(b, s = 200) { this.status = s; this.body = b; return this; }, error(s, m) { return this.json({error: m}, s); }, header() { return this; }};
    next(ctx, scratch);
    if (scratch.status !== 200 || !scratch.body || !Array.isArray(scratch.body.items)) return reply.json(scratch.body, scratch.status);
    const user = api.user(ctx.req);
    const mine = state.reviews.filter((r) => r.uid === user.uid && !scratch.body.items.some((i) => i.businessId === r.businessId)).map((r) => ({
      businessId: r.businessId, businessName: r.businessName ?? '', businessAvailable: !!lookup(r.businessId), updatedAtMs: r.updatedAtMs, review: ownView(r, v2),
    }));
    const items = [...scratch.body.items.map((i) => (v2 ? {...i, review: {service: null, visitMonth: null, ...i.review}} : i)), ...mine].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    return reply.json({...scratch.body, items});
  };
  const register = {get: api.get, patch: api.patch};
  api.patch = (pattern, handler) => register.patch(pattern, pattern === '/api/reviews/mine' ? (ctx, reply) => (patchMine(ctx, reply) ? undefined : handler(ctx, reply)) : handler);
  api.get = (pattern, handler) => register.get(pattern, pattern === '/api/reviews/mine/all' ? (ctx, reply) => listMine(ctx, reply, handler) : handler);

  api.post('/api/review-cases', ({req, body}, reply) => {
    const user = member(req, reply);
    if (!user) return;
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const reason = body?.reason;
    const optionalText = reason !== undefined && reason !== 'other';
    if (!body || Object.keys(body).some((k) => !['reviewId', 'kind', 'text', 'reason'].includes(k)) || !ID.test(String(body.reviewId ?? '')) || !['report', 'appeal'].includes(body.kind)
      || (body.text !== undefined && typeof body.text !== 'string') || (reason !== undefined && (!REPORT_REASONS.includes(reason) || body.kind !== 'report'))
      || text.length > 2000 || !(text.length >= 10 || (optionalText && text.length === 0))) {
      return reply.error(400, 'Başvuruyu kontrol et. En az 10 karakter açıklama yaz.');
    }
    const review = state.reviews.find((r) => r.id === body.reviewId && r.status === 'approved');
    if (!review) return reply.error(404, 'Yorum bulunamadı.');
    if (body.kind === 'report' && review.uid === user.uid) return reply.error(403, 'Kendi yorumunu bildiremezsin.');
    if (state.reviewCases.some((c) => c.uid === user.uid && c.reviewId === review.id && c.kind === body.kind && c.status === 'open')) return reply.error(409, 'Bu yorum için açık bir başvurun var.');
    state.reviewCases.push({id: api.uuid(), uid: user.uid, reviewId: review.id, businessId: review.businessId, kind: body.kind, text: text || REASON_TEXT[reason], reportReason: reason ?? null, status: 'open', decision: '', reason: '', createdAtMs: Date.now()});
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
