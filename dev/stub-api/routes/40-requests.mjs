// Requests and account area (W14–W18, /yorumlarim, /basvurularim). Synthetic, in-memory.
// Fakes: GET /api/businesses/:id for three "Örnek Talep" businesses, availability (PDR: 30-minute
// slots, garage: 60-minute; Sunday closed; v=2 lists full slots with state free/full), POST/GET/PATCH
// /api/requests (+ v=2 offer lines and v2-01 fields: reference, createdAtMs, respondByMs, seen,
// contactPreference, preferredWindow, vehicleId, resolutionCode, expired/no_show, cancel reasonCode,
// kind/status filters), request messages,
// notifications (+ read-all, kind filter), preferences, data-export requests, privacy (deletion)
// requests, own reviews (list + withdraw/edit), ownership claims (list + reply).
// Not faked: the 428 "recent sign-in" rule, e-mail delivery, business-side offers (seeded instead).

const DAY = 86_400_000;
const TZ = 'Europe/Istanbul';
const istanbulDate = (ms) => new Date(ms).toLocaleDateString('sv-SE', {timeZone: TZ});
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const SEED_UID = 'stub-user-deniz';
const PRODUCT_NEWS = 'product-news-2026-11';

const business = (id, name, district, categories, services, features) => ({
  id, name, city: 'İstanbul', district, address: `${district} Örnek Sanayi Sitesi 4. Blok No 12`, categories, services, brands: [],
  coordinateStatus: 'unverified', ownership: 'verified', features, ownerReady: true, published: true,
  reviewSummary: {count: 0, average: null},
});

export default (api) => {
  const {state} = api;
  const now = () => Date.now();

  /* ---------------------------------------------------------------- businesses */
  const mine = [
    business('ornek-talep-pdr', 'Örnek Talep PDR Noktası', 'Kadıköy', ['body'], ['Boyasız göçük', 'Kaporta', 'Dolu hasarı'], {quotes: true, appointments: true}),
    business('ornek-talep-garaj', 'Örnek Talep Teknik Garaj', 'Ümraniye', ['mechanical'], ['Periyodik bakım', 'Arıza tespiti', 'Fren'], {quotes: true, appointments: true}),
    business('ornek-talep-kapali', 'Örnek Talep Kapalı Servis', 'Kartal', ['mechanical'], ['Periyodik bakım'], {quotes: false, appointments: false}),
  ];
  // Share them with other stub areas that keep a business list; otherwise serve them here.
  if (state.businesses instanceof Map) for (const b of mine) state.businesses.set(b.id, b);
  else if (Array.isArray(state.businesses)) state.businesses.push(...mine.filter((b) => !state.businesses.some((x) => x.id === b.id)));
  const findBusiness = (id) => mine.find((b) => b.id === id)
    ?? (state.businesses instanceof Map ? state.businesses.get(id) : Array.isArray(state.businesses) ? state.businesses.find((b) => b.id === id) : undefined);
  api.get('/api/businesses/:id', ({params}, reply) => {
    const found = mine.find((b) => b.id === params.id);
    return found ? reply.json(found) : reply.error(404, 'İşletme bulunamadı.');
  });

  /* ---------------------------------------------------------------- availability */
  const booked = new Set(); // `${businessId}|${date}|${slot}`
  const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  const HALF_HOURS = HOURS.flatMap((h) => [h, h.replace(':00', ':30')]);
  const slotMinutesOf = (businessId) => (businessId === 'ornek-talep-pdr' ? 30 : 60);
  /** Every slot of the day with its state (a synthetic pattern of full slots, plus booked ones). */
  function slotStates(businessId, date) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (weekday === 0) return [];
    const seed = Number(date.slice(8, 10));
    const all = slotMinutesOf(businessId) === 30 ? HALF_HOURS : HOURS;
    const times = weekday === 6 ? all.slice(0, all.length / 2) : all;
    return times.map((h, i) => ({time: h, state: (i * 3 + seed) % 7 === 0 || booked.has(`${businessId}|${date}|${h}`) ? 'full' : 'free'}));
  }
  const slotsFor = (businessId, date) => slotStates(businessId, date).filter((s) => s.state === 'free').map((s) => s.time);
  api.get('/api/businesses/:id/availability', ({params, query}, reply) => {
    const b = findBusiness(params.id);
    if (!b) return reply.error(404, 'İşletme bulunamadı.');
    const from = query.get('from') ?? '';
    const days = Number(query.get('days') ?? '7');
    const today = istanbulDate(now());
    const v = query.get('v');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || from < today || from > addDays(today, 90) || !Number.isInteger(days) || days < 1 || days > 14 || (v !== null && v !== '2')) return reply.error(400, 'Geçersiz istek.');
    const v2 = v === '2';
    if (!b.features?.appointments) return reply.json({timezone: TZ, slotMinutes: null, days: [], ...(v2 ? {capacity: null} : {})});
    const clock = new Date(now()).toLocaleTimeString('en-GB', {timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
    return reply.json({timezone: TZ, slotMinutes: slotMinutesOf(b.id), days: Array.from({length: days}, (_, i) => {
      const date = addDays(from, i);
      const states = slotStates(b.id, date).filter((s) => date !== today || s.time > clock); // past times are not listed
      return {date, slots: v2 ? states : states.filter((s) => s.state === 'free').map((s) => s.time)};
    }), ...(v2 ? {capacity: 1} : {})});
  });

  /* ---------------------------------------------------------------- requests */
  const requests = new Map(); // uid -> [{...item, createdAtMs, ownerUid, requestKey}]
  const messages = new Map(); // requestId -> [{id, author, text, createdAtMs, operationId}]
  const reqId = () => 'tl' + api.uuid().replace(/-/g, '').slice(0, 14);
  let referenceCounter = 0;
  const nextReference = (ms) => `R-${istanbulDate(ms).slice(0, 4)}-${String(++referenceCounter).padStart(6, '0')}`;
  const RESPOND_WITHIN_MS = 48 * 3_600_000;
  function seedRequests() {
    const t = now();
    const offered = {
      id: 'tl-ornek-0418', businessId: 'ornek-talep-pdr', businessName: 'Örnek Talep PDR Noktası', kind: 'quotes', service: 'Boyasız göçük', vehicle: 'BMW 320i 2019',
      message: 'Sol arka kapıda yaklaşık 5 cm göçük var, boya çatlamamış.', status: 'offered', version: 2, createdAtMs: t - 2 * DAY,
      offer: {text: 'Fotoğrafa göre boyasız düzeltilebilir. Ön incelemeden sonra kesinleşir.', price: 2880, expiresAtMs: t + 5 * DAY,
        lines: [{kind: 'labour', label: 'Boyasız göçük düzeltme (1 panel)', amountMinor: 240000}, {kind: 'tax', label: '%20', amountMinor: 48000}],
        totalMinor: 288000, currency: 'TRY', excluded: 'Boya gerekirse ayrıca fiyat verilir.', mayChangeAfterInspection: true},
    };
    const confirmedStart = new Date(Date.parse(`${addDays(istanbulDate(t), 4)}T10:00:00+03:00`)).toISOString();
    const confirmed = {
      id: 'tl-ornek-0402', businessId: 'ornek-talep-garaj', businessName: 'Örnek Talep Teknik Garaj', kind: 'appointments', service: 'Periyodik bakım', vehicle: 'Togg T10X 2024',
      message: 'Yıllık bakım için uygun bir saat istiyorum.', preferredDate: addDays(istanbulDate(t), 4), status: 'confirmed', version: 3, createdAtMs: t - 6 * DAY,
      preferredStartsAt: confirmedStart, offer: {text: 'Belirttiğin saat uygun, seni bekliyoruz.', startsAt: confirmedStart, expiresAtMs: Date.parse(confirmedStart)},
    };
    const waiting = {
      id: 'tl-ornek-0425', businessId: 'ornek-talep-garaj', businessName: 'Örnek Talep Teknik Garaj', kind: 'quotes', service: 'Arıza tespiti', vehicle: 'BMW 320i 2019',
      message: 'Klima soğutmuyor, arada bir tıkırtı geliyor.', status: 'requested', version: 1, createdAtMs: t - 3 * 3_600_000,
      seenByBusinessAtMs: t - 40 * 60_000, contactPreference: 'phone', preferredWindow: 'this_week', vehicleId: '11111111-1111-4111-8111-111111111111',
    };
    const expired = {
      id: 'tl-ornek-0396', businessId: 'ornek-talep-garaj', businessName: 'Örnek Talep Teknik Garaj', kind: 'quotes', service: 'Fren', vehicle: 'Togg T10X 2024',
      message: 'Frende hafif titreme var, balata kontrolü istiyorum.', status: 'expired', version: 2, createdAtMs: t - 9 * DAY, resolution: 'Yanıt süresi doldu.',
    };
    const noShowStart = new Date(Date.parse(`${addDays(istanbulDate(t), -12)}T14:30:00+03:00`)).toISOString();
    const noShow = {
      id: 'tl-ornek-0371', businessId: 'ornek-talep-pdr', businessName: 'Örnek Talep PDR Noktası', kind: 'appointments', service: 'Dolu hasarı', vehicle: 'BMW 320i 2019',
      message: 'Tavanda dolu izleri var, bakılması için saat istiyorum.', preferredDate: addDays(istanbulDate(t), -12), status: 'no_show', version: 4, createdAtMs: t - 16 * DAY,
      preferredStartsAt: noShowStart, offer: {text: 'İşletme seçtiğin saati onayladı.', startsAt: noShowStart, expiresAtMs: Date.parse(noShowStart)}, resolution: 'Müşteri randevuya gelmedi.',
    };
    const cancelled = {
      id: 'tl-ornek-0390', businessId: 'ornek-talep-pdr', businessName: 'Örnek Talep PDR Noktası', kind: 'quotes', service: 'Kaporta', vehicle: 'BMW 320i 2019',
      message: 'Ön tamponda çizik var, boya gerekiyor mu?', status: 'cancelled', version: 2, createdAtMs: t - 20 * DAY, resolution: 'Başka bir servisle anlaştım, teşekkürler.',
      resolutionCode: 'found_other',
    };
    const seeds = [cancelled, noShow, expired, confirmed, offered, waiting].sort((a, b) => a.createdAtMs - b.createdAtMs);
    requests.set(SEED_UID, seeds.map((r) => ({contactPreference: 'app_message', seenByBusinessAtMs: r.status === 'requested' ? null : r.createdAtMs + 3_600_000, ...r, reference: nextReference(r.createdAtMs), ownerUid: SEED_UID})));
    messages.set(offered.id, [
      {id: api.uuid(), author: 'business', text: 'Fotoğrafa göre boyasız düzeltilebilir. Cuma 10.00 uygun mu?', createdAtMs: t - DAY - 3_600_000},
      {id: api.uuid(), author: 'customer', text: 'Cuma olur. Kartla ödeyebilir miyim?', createdAtMs: t - DAY - 3_000_000},
      {id: api.uuid(), author: 'business', text: 'Evet, kart geçerli.', createdAtMs: t - DAY - 2_800_000},
    ]);
  }
  seedRequests();

  const guard = (req, reply) => {
    const user = api.user(req);
    if (!user) reply.error(401, 'Giriş gerekli.');
    return user;
  };
  const listOf = (map, uid, init = () => []) => {
    if (!map.has(uid)) map.set(uid, init());
    return map.get(uid);
  };
  const V2_OFFER_KEYS = ['lines', 'totalMinor', 'currency', 'excluded', 'mayChangeAfterInspection'];
  function view(r, v2) {
    const out = {id: r.id, businessId: r.businessId, businessName: r.businessName, kind: r.kind, service: r.service, vehicle: r.vehicle, message: r.message,
      ...(r.preferredDate ? {preferredDate: r.preferredDate} : {}), status: r.status, version: r.version,
      ...(r.offer ? {offer: v2 ? r.offer : Object.fromEntries(Object.entries(r.offer).filter(([k]) => !V2_OFFER_KEYS.includes(k)))} : {}),
      ...(r.resolution ? {resolution: r.resolution} : {})};
    if (v2 && r.preferredStartsAt) out.preferredStartsAt = r.preferredStartsAt;
    if (!v2) {
      // v1 clients know six statuses: the new ones map like the real API.
      if (r.status === 'expired') Object.assign(out, {status: 'declined', resolution: r.resolution ?? 'Yanıt süresi doldu.'});
      if (r.status === 'no_show') Object.assign(out, {status: 'cancelled', resolution: r.resolution ?? 'Müşteri randevuya gelmedi.'});
      return out;
    }
    Object.assign(out, {createdAtMs: r.createdAtMs, reference: r.reference ?? null});
    if (r.status === 'requested') out.respondByMs = r.createdAtMs + RESPOND_WITHIN_MS;
    out.seenByBusinessAtMs = r.seenByBusinessAtMs ?? null;
    out.contactPreference = r.contactPreference ?? 'app_message';
    if (r.preferredWindow) out.preferredWindow = r.preferredWindow;
    if (r.vehicleId) out.vehicleId = r.vehicleId;
    if (r.resolutionCode) out.resolutionCode = r.resolutionCode;
    return out;
  }
  const STATUSES = ['requested', 'offered', 'confirmed', 'declined', 'cancelled', 'completed', 'expired', 'no_show'];
  const findRequest = (uid, id) => (requests.get(uid) ?? []).find((r) => r.id === id);

  api.get('/api/requests', ({req, query}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    if (query.get('businessId')) return reply.error(403, 'Bu işletmenin taleplerini göremezsin.');
    const v2 = query.get('v') === '2';
    const kind = query.get('kind');
    const statuses = query.get('status')?.split(',');
    if ((kind !== null || statuses) && !v2) return reply.error(400, 'Geçersiz istek.');
    if ((kind !== null && !['quotes', 'appointments'].includes(kind)) || (statuses && (statuses.length > 8 || statuses.some((x) => !STATUSES.includes(x))))) return reply.error(400, 'Geçersiz istek.');
    const all = [...listOf(requests, user.uid)].filter((r) => (!kind || r.kind === kind) && (!statuses || statuses.includes(r.status))).sort((a, b) => b.createdAtMs - a.createdAtMs);
    const after = query.get('after');
    const start = after ? all.findIndex((r) => r.id === after) + 1 : 0;
    const page = all.slice(start, start + 20);
    return reply.json({items: page.map((r) => view(r, v2)), next: page.length === 20 && all.length > start + 20 ? page.at(-1).id : null});
  });

  const text = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
  api.post('/api/requests', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    if (!user.emailVerified) return reply.error(403, 'E-posta doğrulaması gerekli.');
    const b = body ?? {};
    const allowed = ['businessId', 'kind', 'service', 'vehicle', 'message', 'preferredDate', 'preferredSlot', 'requestKey', 'contactPreference', 'preferredWindow', 'vehicleId'];
    if (Object.keys(b).some((k) => !allowed.includes(k)) || !['quotes', 'appointments'].includes(b.kind) || !text(b.service, 2, 120) || !text(b.vehicle, 2, 120) || !text(b.message, 10, 2000)
      || typeof b.requestKey !== 'string' || (b.preferredDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(b.preferredDate))
      || (b.contactPreference !== undefined && !['app_message', 'phone', 'email'].includes(b.contactPreference))
      || (b.preferredWindow !== undefined && (!['today', 'this_week', 'next_week', 'any'].includes(b.preferredWindow) || b.kind !== 'quotes'))
      || (b.vehicleId !== undefined && (typeof b.vehicleId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(b.vehicleId)))) return reply.error(400, 'Bilgileri kontrol edin.');
    const list = listOf(requests, user.uid);
    const fields = {contactPreference: b.contactPreference ?? 'app_message', preferredWindow: b.preferredWindow ?? null, vehicleId: b.vehicleId ?? null};
    const same = list.find((r) => r.requestKey === b.requestKey);
    if (same) {
      if ((same.contactPreference ?? 'app_message') !== fields.contactPreference || (same.preferredWindow ?? null) !== fields.preferredWindow || (same.vehicleId ?? null) !== fields.vehicleId) return reply.error(409, 'Talep anahtarı farklı içerikte kullanılmış.');
      return reply.json({id: same.id, status: same.status});
    }
    if (fields.vehicleId !== null && !api.account(user.uid).vehicles.some((v) => v.id === fields.vehicleId && !v.archived)) return reply.error(400, 'Seçilen araç garajında bulunamadı.');
    const target = findBusiness(b.businessId);
    if (!target || !target.features?.[b.kind] || target.ownership !== 'verified') return reply.error(409, 'Bu işletme şu anda bu talep türünü kabul etmiyor.');
    let preferredStartsAt;
    if (b.preferredSlot !== undefined) {
      if (b.kind !== 'appointments' || !b.preferredDate || !/^([01]\d|2[0-3]):(00|30)$/.test(b.preferredSlot)) return reply.error(400, 'Bilgileri kontrol edin.');
      if (!slotsFor(target.id, b.preferredDate).includes(b.preferredSlot)) return reply.error(409, 'Seçtiğin saat artık uygun değil.');
      booked.add(`${target.id}|${b.preferredDate}|${b.preferredSlot}`);
      preferredStartsAt = new Date(Date.parse(`${b.preferredDate}T${b.preferredSlot}:00+03:00`)).toISOString();
    }
    const item = {
      id: reqId(), businessId: target.id, businessName: target.name, kind: b.kind, service: b.service.trim(), vehicle: b.vehicle.trim(), message: b.message.trim(),
      ...(b.preferredDate ? {preferredDate: b.preferredDate} : {}), ...(preferredStartsAt ? {preferredStartsAt} : {}),
      status: 'requested', version: 1, createdAtMs: now(), ownerUid: user.uid, requestKey: b.requestKey,
      reference: nextReference(now()), seenByBusinessAtMs: null, contactPreference: fields.contactPreference,
      ...(fields.preferredWindow ? {preferredWindow: fields.preferredWindow} : {}), ...(fields.vehicleId ? {vehicleId: fields.vehicleId} : {}),
    };
    list.push(item);
    return reply.json({id: item.id, status: item.status}, 201);
  });

  api.patch('/api/requests', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const r = findRequest(user.uid, body?.id);
    if (!r) return reply.error(404, 'Talep bulunamadı.');
    if (r.version !== body.version) return reply.error(409, 'Talep değişti. Listeyi yenile.');
    if (body.action === 'accept' && r.status === 'offered') {
      if (r.offer.expiresAtMs <= now()) return reply.error(409, 'Önerinin süresi doldu; işletmeden yeni yanıt bekle.');
      Object.assign(r, {status: 'confirmed', version: r.version + 1});
      addNotice(user.uid, {requestId: r.id, status: 'confirmed'});
      return reply.json({ok: true});
    }
    if (body.action === 'cancel' && ['requested', 'offered', 'confirmed'].includes(r.status)) {
      const reasons = {found_other: 'Müşteri başka bir işletmeyle anlaştı.', price: 'Müşteri fiyat nedeniyle vazgeçti.', timing: 'Müşteri için zamanlama uygun değil.', other: null};
      const allCodes = [...Object.keys(reasons), 'no_capacity', 'service_not_offered', 'parts_unavailable', 'outside_area'];
      if (body.reasonCode !== undefined && !allCodes.includes(body.reasonCode)) return reply.error(400, 'Bilgileri kontrol edin.');
      if (body.reasonCode !== undefined && !(body.reasonCode in reasons)) return reply.error(400, 'Bu gerekçe kodu bu işlemde kullanılamaz.');
      if (body.text !== undefined && !text(body.text, 10, 1000)) return reply.error(400, 'Bilgileri kontrol edin.');
      const resolution = body.text ? body.text.trim() : body.reasonCode ? reasons[body.reasonCode] : null;
      if (!resolution) return reply.error(409, 'İptal veya ret gerekçesi gerekli.');
      Object.assign(r, {status: 'cancelled', version: r.version + 1, resolution, ...(body.reasonCode ? {resolutionCode: body.reasonCode} : {})});
      return reply.json({ok: true});
    }
    return reply.error(409, 'Bu talep için işlem kullanılamıyor.');
  });

  api.get('/api/requests/messages', ({req, query}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const r = findRequest(user.uid, query.get('id'));
    if (!r) return reply.error(403, 'Bu yazışmayı göremezsin.');
    const all = messages.get(r.id) ?? [];
    const after = query.get('after');
    const start = after ? all.findIndex((m) => m.id === after) + 1 : 0;
    const page = all.slice(start, start + 50);
    return reply.json({items: page.map(({operationId: _, ...m}) => m), next: all.length > start + 50 ? page.at(-1).id : null});
  });
  api.post('/api/requests/messages', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const r = findRequest(user.uid, body?.id);
    if (!r) return reply.error(403, 'Bu yazışmaya yazamazsın.');
    const list = messages.get(r.id) ?? [];
    const same = list.find((m) => m.operationId === body.operationId);
    if (same) return reply.json({id: same.id, author: same.author, text: same.text, createdAtMs: same.createdAtMs});
    if (!['requested', 'offered', 'confirmed'].includes(r.status)) return reply.error(409, 'Kapanmış talepte mesaj gönderilemez.');
    if (!text(body.text, 1, 1000)) return reply.error(400, 'Mesaj 1–1000 karakter olmalı.');
    if (/https?:\/\/|www\.|@|\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/i.test(body.text)) return reply.error(400, 'Mesajda iletişim bilgisi veya bağlantı paylaşılamaz.');
    if (list.length >= 100) return reply.error(409, 'Bu talepte mesaj sınırına ulaşıldı.');
    const message = {id: api.uuid(), author: 'customer', text: body.text.trim(), createdAtMs: now(), operationId: body.operationId};
    messages.set(r.id, [...list, message]);
    return reply.json({id: message.id, author: message.author, text: message.text, createdAtMs: message.createdAtMs}, 201);
  });

  /* ---------------------------------------------------------------- notifications */
  const notices = new Map(); // uid -> [{id, ..., createdAtMs, read}]
  function addNotice(uid, value) {
    listOf(notices, uid).push({id: api.uuid(), ...value, createdAtMs: now(), read: false});
  }
  (() => {
    const t = now();
    notices.set(SEED_UID, [
      {id: api.uuid(), requestId: 'tl-ornek-0418', status: 'offered', createdAtMs: t - 12 * 60_000, read: false},
      {id: api.uuid(), requestId: 'tl-ornek-0402', status: 'confirmed', createdAtMs: t - 70 * 60_000, read: false},
      {id: api.uuid(), kind: 'reminder', title: 'Muayene', vehicleLabel: 'BMW 320i', phase: 'advance', dueDate: addDays(istanbulDate(t), 13), dueKm: null, createdAtMs: t - 26 * 3_600_000, read: true},
      {id: api.uuid(), requestId: 'tl-ornek-0390', status: 'cancelled', createdAtMs: t - 4 * DAY, read: true},
    ]);
  })();
  api.get('/api/notifications', ({req, query}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const kind = query.get('kind');
    if (kind && !['request', 'reminder'].includes(kind)) return reply.error(400, 'Geçersiz istek.');
    const all = [...listOf(notices, user.uid)].filter((n) => !kind || (kind === 'reminder') === (n.kind === 'reminder')).sort((a, b) => b.createdAtMs - a.createdAtMs);
    const after = query.get('after');
    const start = after ? all.findIndex((n) => n.id === after) + 1 : 0;
    const page = all.slice(start, start + 20);
    return reply.json({items: page, next: all.length > start + 20 ? page.at(-1).id : null});
  });
  api.patch('/api/notifications', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const n = listOf(notices, user.uid).find((x) => x.id === body?.id);
    if (!n || typeof body.read !== 'boolean') return reply.error(400, 'Bilgileri kontrol edin.');
    n.read = body.read;
    return reply.json({ok: true});
  });
  api.post('/api/notifications/read-all', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    if (!Number.isInteger(body?.before) || body.before < 0) return reply.error(400, 'Bilgileri kontrol edin.');
    let updated = 0;
    for (const n of listOf(notices, user.uid)) if (!n.read && n.createdAtMs < Math.min(body.before, now())) { n.read = true; updated++; }
    return reply.json({updated, more: false});
  });

  /* ---------------------------------------------------------------- preferences */
  const prefs = new Map();
  const defaults = () => ({version: 0, requestUpdates: {inApp: true, push: false, email: false}, reminderEmail: true,
    productNews: {enabled: false, consentAtMs: null, source: null, textVersion: null},
    delivery: {requestUpdatesPush: 'not_enabled', requestUpdatesEmail: 'not_enabled', productNews: 'not_enabled'}, updatedAtMs: null});
  api.get('/api/me/preferences', ({req}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    return reply.json(prefs.get(user.uid) ?? defaults());
  });
  api.patch('/api/me/preferences', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const current = structuredClone(prefs.get(user.uid) ?? defaults());
    const changes = body?.changes;
    const keys = ['requestUpdatesPush', 'requestUpdatesEmail', 'reminderEmail', 'productNews', 'productNewsTextVersion'];
    if (!changes || typeof changes !== 'object' || !Object.keys(changes).length || Object.keys(changes).some((k) => !keys.includes(k))) return reply.error(400, 'Bilgileri kontrol edin.');
    if (body.expectedVersion !== current.version) return reply.error(409, 'Tercihler değişti.');
    if ((changes.requestUpdatesEmail === true || changes.reminderEmail === true) && !user.emailVerified) return reply.error(403, 'E-posta doğrulaması gerekli.');
    if (changes.productNews === true && changes.productNewsTextVersion !== PRODUCT_NEWS) return reply.error(400, 'Bilgileri kontrol edin.');
    if ('requestUpdatesPush' in changes) current.requestUpdates.push = !!changes.requestUpdatesPush;
    if ('requestUpdatesEmail' in changes) current.requestUpdates.email = !!changes.requestUpdatesEmail;
    if ('reminderEmail' in changes) current.reminderEmail = !!changes.reminderEmail;
    if ('productNews' in changes) current.productNews = changes.productNews
      ? {enabled: true, consentAtMs: now(), source: 'web', textVersion: PRODUCT_NEWS}
      : {enabled: false, consentAtMs: null, source: null, textVersion: null};
    current.version += 1;
    current.updatedAtMs = now();
    prefs.set(user.uid, current);
    return reply.json(current);
  });

  /* ---------------------------------------------------------------- data exports */
  const exportsByUid = new Map();
  (() => {
    const t = now() - 21 * DAY;
    exportsByUid.set(SEED_UID, [{id: api.uuid(), status: 'delivered', version: 3, reason: null, createdAtMs: t, updatedAtMs: t + 2 * DAY}]);
  })();
  api.get('/api/me/privacy/exports', ({req}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    if (!user.emailVerified) return reply.error(403, 'E-posta doğrulaması gerekli.');
    return reply.json({items: [...listOf(exportsByUid, user.uid)].sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, 5), preparation: 'manual'});
  });
  api.post('/api/me/privacy/exports', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    if (!user.emailVerified) return reply.error(403, 'E-posta doğrulaması gerekli.');
    const list = listOf(exportsByUid, user.uid);
    const same = list.find((x) => x.id === body?.operationId);
    if (same) return reply.json({request: same, preparation: 'manual'});
    if (typeof body?.operationId !== 'string') return reply.error(400, 'Bilgileri kontrol edin.');
    if (list.some((x) => ['submitted', 'in_progress'].includes(x.status))) return reply.error(409, 'Açık bir veri kopyası talebin var.');
    const item = {id: body.operationId, status: 'submitted', version: 1, reason: null, createdAtMs: now(), updatedAtMs: now()};
    list.push(item);
    return reply.json({request: item, preparation: 'manual'}, 202);
  });
  api.patch('/api/me/privacy/exports', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const item = listOf(exportsByUid, user.uid).find((x) => x.id === body?.id);
    if (!item || body.action !== 'cancel') return reply.error(400, 'Bilgileri kontrol edin.');
    if (item.version !== body.expectedVersion || item.status !== 'submitted') return reply.error(409, 'Talep değişti.');
    Object.assign(item, {status: 'cancelled', version: item.version + 1, updatedAtMs: now()});
    return reply.json({request: item});
  });

  /* ---------------------------------------------------------------- privacy (deletion) */
  const privacy = new Map(); // uid -> own view
  api.get('/api/me/privacy', ({req}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    if (!user.emailVerified) return reply.error(403, 'E-posta doğrulaması gerekli.');
    return reply.json({request: privacy.get(user.uid) ?? null, execution: 'not_enabled'});
  });
  api.post('/api/me/privacy', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    if (!user.emailVerified) return reply.error(403, 'E-posta doğrulaması gerekli.');
    const current = privacy.get(user.uid) ?? null;
    const t = now();
    if (body?.action === 'submit') {
      if (!['garage', 'account'].includes(body.scope) || body.acknowledged !== true || body.confirmedScope !== true) return reply.error(400, 'Bilgileri kontrol edin.');
      if (current && current.status !== 'cancelled') return reply.error(409, 'Açık bir talebin var.');
      privacy.set(user.uid, {id: body.operationId, scope: body.scope, status: 'submitted', version: 1, createdAtMs: t, updatedAtMs: t, reason: null});
    } else if (body?.action === 'cancel' || body?.action === 'confirm') {
      if (!current || current.id !== body.requestId || current.version !== body.expectedVersion) return reply.error(409, 'Talep değişti.');
      if (body.action === 'cancel' && current.status !== 'cancelled') Object.assign(current, {status: 'cancelled', reason: null});
      else if (body.action === 'confirm' && current.status === 'needs_confirmation') Object.assign(current, {status: 'submitted', reason: null});
      else return reply.error(409, 'Talep değişti.');
      Object.assign(current, {version: current.version + 1, updatedAtMs: t});
    } else return reply.error(400, 'Bilgileri kontrol edin.');
    return reply.json({request: privacy.get(user.uid), execution: 'not_enabled'});
  });

  /* ---------------------------------------------------------------- own reviews */
  const ownReviews = new Map(); // uid -> [{businessId, businessName, businessAvailable, updatedAtMs, review}]
  (() => {
    const t = now();
    const review = (id, status, rating, text, extra = {}) => ({id, text, rating, version: 1, status, reason: '', resolved: 'yes', wc: 'unknown',
      canEdit: status !== 'hidden', canWithdraw: status !== 'withdrawn', ...extra});
    ownReviews.set(SEED_UID, [
      {businessId: 'ornek-talep-garaj', businessName: 'Örnek Talep Teknik Garaj', businessAvailable: true, updatedAtMs: t - 6 * DAY,
        review: review('rv-ornek-1', 'approved', 5, 'Periyodik bakımı söz verdikleri saatte bitirdiler, değişen parçaları tek tek gösterdiler.')},
      {businessId: 'ornek-talep-pdr', businessName: 'Örnek Talep PDR Noktası', businessAvailable: true, updatedAtMs: t - 15 * DAY,
        review: review('rv-ornek-2', 'pending', 4, 'Göçük düzeltme hızlıydı; fiyat tekliftekiyle aynı çıktı.')},
      {businessId: 'ornek-talep-kapali', businessName: 'Örnek Talep Kapalı Servis', businessAvailable: false, updatedAtMs: t - 28 * DAY,
        review: review('rv-ornek-3', 'rejected', 2, 'Bekleme süresi uzundu, ödeme sırasında sorun yaşadım.', {reason: 'Yorum kişisel bilgi içerdiği için yayımlanmadı.'})},
    ]);
  })();
  api.get('/api/reviews/mine/all', ({req}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    if (!user.emailVerified) return reply.error(403, 'E-posta doğrulaması gerekli.');
    return reply.json({items: [...listOf(ownReviews, user.uid)].sort((a, b) => b.updatedAtMs - a.updatedAtMs), next: null});
  });
  api.patch('/api/reviews/mine', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const item = listOf(ownReviews, user.uid).find((x) => x.businessId === body?.businessId);
    if (!item) return reply.error(404, 'Yorum bulunamadı.');
    if (item.review.version !== body.expectedVersion) return reply.error(409, 'Yorum değişti. Güncel sürümü yükleyip yeniden dene.');
    if (body.action === 'withdraw' && body.confirmed === true && item.review.canWithdraw) {
      Object.assign(item.review, {status: 'withdrawn', version: item.review.version + 1, canWithdraw: false, canEdit: true});
      item.updatedAtMs = now();
      return reply.json({ok: true, status: 'withdrawn'});
    }
    if (body.action === 'edit' && item.review.canEdit && body.review) {
      Object.assign(item.review, {status: 'pending', version: item.review.version + 1, text: String(body.review.text ?? item.review.text), rating: body.review.rating ?? item.review.rating, canWithdraw: true});
      item.updatedAtMs = now();
      return reply.json({ok: true, status: 'pending'});
    }
    return reply.error(409, 'Bu yorum için işlem kullanılamıyor.');
  });

  /* ---------------------------------------------------------------- ownership claims */
  const claims = new Map();
  claims.set(SEED_UID, [
    {id: 'clm-ornek-0112', name: 'Örnek Talep Sanayi Motor', city: 'İstanbul', address: 'Ümraniye Örnek Sanayi Sitesi 2. Blok No 4', status: 'needs_information',
      reviewReason: 'Vergi levhası veya oda kaydı belgesi bekleniyor.', businessId: null, reply: ''},
    {id: 'clm-ornek-0098', name: 'Örnek Talep Oto Elektrik', city: 'İstanbul', address: 'Kartal Örnek Sanayi Sitesi 7. Blok No 1', status: 'submitted',
      reviewReason: '', businessId: null, reply: ''},
  ]);
  api.get('/api/claims', ({req}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    return reply.json({claims: listOf(claims, user.uid)});
  });
  api.patch('/api/claims', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const claim = listOf(claims, user.uid).find((c) => c.id === body?.claimId);
    if (!claim) return reply.error(404, 'Başvuru bulunamadı.');
    if (claim.status !== 'needs_information') return reply.error(409, 'Bu başvuruya şu anda yanıt verilemez.');
    if (!text(body.message, 10, 2000)) return reply.error(400, 'Yanıt en az 10 karakter olmalı.');
    Object.assign(claim, {status: 'submitted', reply: body.message.trim()});
    return reply.json({ok: true});
  });
};
