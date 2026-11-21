import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ApiError} from '../app/lib/api-read';
import {
  calendarDays, cancelBody, cancelProblem, claimRow, contactParam, decodeAvailability, decodeClaims, decodeNotices, decodeRequestPage, dayLongText,
  exportErrorMessage, exportSummary, liveErrorMessage, windowParam,
  noticeKindParam, notificationView, otherVehicleText, ownReviewRow, relativeTime, requestBody, requestDraftProblem, requestView, slotLabel,
  threadMessage, vehicleOption,
} from '../app/lib/v2/requests';

const NOW = Date.parse('2026-11-18T12:00:00+03:00');
const DAY = 86_400_000;

const offered = {
  id: 'tl-1', businessId: 'ornek-pdr', businessName: 'Örnek PDR', kind: 'quotes', service: 'Boyasız göçük', vehicle: 'BMW 320i 2019',
  message: 'Sol arka kapıda göçük var.', status: 'offered', version: 2,
  offer: {
    text: 'Boyasız düzeltilebilir, ön incelemeden sonra kesinleşir.', price: 2880, expiresAtMs: NOW + 5 * DAY,
    lines: [{kind: 'labour', label: 'Göçük düzeltme', amountMinor: 240000}, {kind: 'tax', label: '%20', amountMinor: 48050}],
    totalMinor: 288050, currency: 'TRY', excluded: 'Boya ayrıca fiyatlanır.', mayChangeAfterInspection: true,
  },
};
const confirmedAppointment = {
  id: 'tl-2', businessId: 'ornek-garaj', businessName: 'Örnek Garaj', kind: 'appointments', service: 'Periyodik bakım', vehicle: 'Togg T10X 2024',
  message: 'Yıllık bakım için saat istiyorum.', preferredDate: '2026-11-22', status: 'confirmed', version: 3,
  preferredStartsAt: '2026-11-22T07:00:00.000Z', offer: {text: 'Belirttiğin saat uygun, bekliyoruz.', startsAt: '2026-11-22T07:00:00.000Z', expiresAtMs: Date.parse('2026-11-22T07:00:00.000Z')},
};

test('the v2 request page keeps the strict core item and reads offer lines and preferredStartsAt apart', () => {
  const page = decodeRequestPage({items: [offered, confirmedAppointment, {id: 'bad', status: 'offered'}], next: null});
  assert.equal(page.items.length, 2);
  assert.equal(page.dropped, 1);
  assert.equal(page.next, null);
  assert.equal(page.items[0]!.extras?.lines?.length, 2);
  assert.equal('lines' in page.items[0]!.offer!, false, 'offer lines are not left on the core offer');
  assert.equal(page.items[1]!.preferredStartsAt, '2026-11-22T07:00:00.000Z');
  assert.throws(() => decodeRequestPage({rows: []}));
});

test('an offer whose lines do not add up loses its lines but keeps the core price', () => {
  const broken = {...offered, offer: {...offered.offer, totalMinor: 1}};
  const [item] = decodeRequestPage({items: [broken], next: null}).items;
  assert.equal(item!.extras, null);
  const view = requestView(item!, NOW);
  assert.deepEqual(view.offer!.lines, [{item: 'Ön teklif', description: 'Boyasız göçük', amount: 2880}]);
});

test('a live quote becomes the W15 view: line items in lira, notes, decision state', () => {
  const [item] = decodeRequestPage({items: [offered], next: null}).items;
  const view = requestView(item!, NOW);
  assert.equal(view.offerStatus, 'pending');
  assert.equal(view.statusLabel, 'Karar bekleniyor');
  assert.equal(view.tone, 'orange');
  assert.deepEqual(view.offer!.lines.map(l => [l.item, l.amount]), [['İşçilik', 2400], ['KDV', 480.5]]);
  assert.equal(view.amount, 2880.5);
  assert.ok(view.offer!.notes!.includes('Dahil olmayan: Boya ayrıca fiyatlanır.'));
  assert.ok(view.offer!.notes!.includes('Ön inceleme sonrası değişebilir.'));
  assert.equal(view.canAccept, true);
  assert.equal(view.messagesOpen, true);

  const expired = requestView(item!, NOW + 6 * DAY);
  assert.equal(expired.canAccept, false);
  assert.equal(expired.offer!.expired, true);
});

test('appointment and closed requests map to accepted / rejected offers', () => {
  const [appointment] = decodeRequestPage({items: [confirmedAppointment], next: null}).items;
  const view = requestView(appointment!, NOW);
  assert.equal(view.offerStatus, 'accepted');
  assert.equal(view.offer!.kind, 'appointment');
  assert.deepEqual(view.offer!.lines, []);
  assert.match(view.offer!.startsAtText!, /22 Kasım.*10\.00/);
  assert.match(view.preferredText, /onay değildir/);

  const cancelled = {...offered, status: 'cancelled', version: 3, resolution: 'Başka bir servisle anlaştım.'};
  const closed = requestView(decodeRequestPage({items: [cancelled], next: null}).items[0]!, NOW);
  assert.equal(closed.offerStatus, 'rejected');
  assert.equal(closed.canCancel, false);
  assert.equal(closed.messagesOpen, false);

  const waiting = {...offered, status: 'requested', version: 1, offer: undefined};
  const open = requestView(decodeRequestPage({items: [waiting], next: null}).items[0]!, NOW);
  assert.equal(open.offer, null);
  assert.equal(open.statusLabel, 'Yanıt bekleniyor');
  assert.equal(open.canCancel, true);
});

test('the request body follows the core schema; preferredSlot only for appointments with a date', () => {
  const base = {businessId: 'ornek-pdr', service: 'Boyasız göçük', vehicle: 'BMW 320i 2019', message: 'Kapıda göçük var, boya sağlam.'};
  const quote = requestBody({...base, kind: 'quotes', preferredDate: '2026-11-20', preferredSlot: '10:00'}, 'key');
  assert.deepEqual(quote, {...base, kind: 'quotes', preferredDate: '2026-11-20', requestKey: 'key'});
  const appointment = requestBody({...base, kind: 'appointments', preferredDate: '2026-11-20', preferredSlot: '10:00'}, 'key');
  assert.equal(appointment.preferredSlot, '10:00');
  assert.equal('preferredSlot' in requestBody({...base, kind: 'appointments', preferredSlot: '10:00'}, 'key'), false);
  assert.equal('preferredSlot' in requestBody({...base, kind: 'appointments', preferredDate: '2026-11-20', preferredSlot: '10:45'}, 'key'), false);
  assert.throws(() => requestBody({...base, kind: 'quotes', message: 'kısa'}, 'key'));
  assert.equal(requestDraftProblem({service: '', vehicle: 'x', message: ''}), 'Bir hizmet seç.');
  assert.equal(requestDraftProblem({service: 'Kaporta', vehicle: 'BMW 320i', message: 'kısa'}), 'Açıklama en az 10 karakter olmalı.');
  assert.equal(requestDraftProblem(base), '');
});

test('garage vehicles become wizard options', () => {
  const option = vehicleOption({id: 'v1', brand: 'BMW', model: '320i', year: 2019, fuel: 'Benzin', mileage: 86400});
  assert.equal(option.label, 'BMW 320i · 2019');
  assert.equal(option.detail, 'Benzin · 86.400 km');
  assert.equal(option.text, 'BMW 320i 2019');
  assert.equal(otherVehicleText(' Toyota ', 'Corolla', ''), 'Toyota Corolla');
});

test('availability days become the week strip; a day without slots is closed', () => {
  const free = (time: string) => ({time, state: 'free' as const});
  const days = calendarDays('2026-11-21', [{date: '2026-11-21', slots: [free('11:00'), free('09:00')]}, {date: '2026-11-23', slots: [free('10:00')]}], 3);
  assert.deepEqual(days.map(d => [d.date, d.closed, d.free]), [['2026-11-21', false, 2], ['2026-11-22', true, 0], ['2026-11-23', false, 1]]);
  assert.deepEqual(days[0]!.slots, ['09:00', '11:00']);
  assert.deepEqual(days[0]!.taken, []);
  assert.equal(days[0]!.short, 'CMT');
  assert.equal(slotLabel('09:00'), '09.00');
  assert.equal(dayLongText('2026-11-25'), 'Çarşamba 25 Kasım');
});

test('notifications: page decoding, request and reminder rows, kind filter', () => {
  const page = decodeNotices({items: [
    {id: 'n1', requestId: 'tl-1', status: 'offered', createdAtMs: NOW - 12 * 60_000, read: false},
    {id: 'n2', kind: 'reminder', title: 'Muayene', vehicleLabel: 'BMW 320i', phase: 'advance', dueDate: '2026-12-01', dueKm: null, createdAtMs: NOW - 26 * 3_600_000, read: true},
    {id: 'bad'},
  ], next: 'n2'});
  assert.equal(page.items.length, 2);
  assert.equal(page.next, 'n2');
  const request = notificationView(page.items[0]!, NOW);
  assert.deepEqual([request.kind, request.title, request.time, request.unread, request.to], ['talep', 'Yanıt geldi', '12 dk', true, '/taleplerim?talep=tl-1']);
  const reminder = notificationView(page.items[1]!, NOW);
  assert.deepEqual([reminder.kind, reminder.title, reminder.time, reminder.unread, reminder.to], ['garaj', 'Muayene', 'Dün', false, '/hatirlatmalar']);
  assert.match(reminder.text, /BMW 320i · Hatırlatma tarihin yaklaşıyor · 1 Aralık 2026/);
  assert.equal(noticeKindParam('talep'), 'request');
  assert.equal(noticeKindParam('garaj'), 'reminder');
  assert.equal(noticeKindParam('tumu'), '');
  assert.equal(relativeTime(NOW - 3 * DAY, NOW), '3 gün');
});

test('thread messages show the member as "member"', () => {
  assert.equal(threadMessage({id: 'm1', author: 'customer', text: 'Merhaba', createdAtMs: NOW}).from, 'member');
  assert.equal(threadMessage({id: 'm2', author: 'business', text: 'Merhaba', createdAtMs: NOW}).from, 'business');
});

test('data export summary and the status-specific messages', () => {
  const items = [
    {id: 'a', status: 'delivered' as const, version: 3, reason: null, createdAtMs: NOW - 20 * DAY, updatedAtMs: NOW - 18 * DAY},
    {id: 'b', status: 'submitted' as const, version: 1, reason: null, createdAtMs: NOW, updatedAtMs: NOW},
  ];
  const summary = exportSummary(items);
  assert.equal(summary.latest?.id, 'b');
  assert.equal(summary.open, true);
  assert.match(summary.label, /^Talep alındı · 18 Kasım 2026$/);
  assert.equal(exportSummary([]).latest, null);
  assert.match(exportErrorMessage(new ApiError(428, '')), /son 10 dakika/);
  assert.equal(exportErrorMessage(new ApiError(409, 'x')), 'Açık bir veri kopyası talebin var.');
  assert.equal(liveErrorMessage(new ApiError(400, 'Bilgileri kontrol edin.')), 'Bilgileri kontrol edin.');
  assert.equal(liveErrorMessage(new Error('request_page'), 'Yüklenemedi.'), 'Yüklenemedi.');
});

test('own reviews and claims become their rows with readable status labels', () => {
  const row = ownReviewRow({businessId: 'b1', businessName: 'Örnek Garaj', businessAvailable: false, updatedAtMs: NOW, review: {id: 'r1', text: 'İyi', rating: 4, status: 'rejected', reason: 'Kişisel bilgi', version: 2, canEdit: true, canWithdraw: true}});
  assert.deepEqual([row.label, row.tone, row.available, row.reason], ['Yayımlanmadı', 'cream', false, 'Kişisel bilgi']);
  assert.equal(ownReviewRow({businessId: 'b1', businessName: '', review: {id: 'r', text: '', rating: null, status: 'approved', reason: '', version: 1, canEdit: true, canWithdraw: true}}).label, 'Yayında');

  const claims = decodeClaims({claims: [{id: 'c1', name: 'Örnek Motor', city: 'İstanbul', status: 'needs_information', reviewReason: 'Vergi levhası bekleniyor.', businessId: null, reply: ''}, {nope: true}]});
  assert.equal(claims.length, 1);
  const claim = claimRow(claims[0]!);
  assert.deepEqual([claim.label, claim.tone, claim.canReply, claim.note], ['Ek bilgi bekleniyor', 'orange', true, 'Vergi levhası bekleniyor.']);
  assert.throws(() => decodeClaims({items: []}));
});

/* ------------------------------------------------------------------ v2-01 */

test('v2-01 body fields: contact preference, quote-only time window, garage vehicle id, half-hour slots', () => {
  const base = {businessId: 'ornek-pdr', service: 'Boyasız göçük', vehicle: 'BMW 320i 2019', message: 'Kapıda göçük var, boya sağlam.'};
  const quote = requestBody({...base, kind: 'quotes', contactPreference: 'phone', preferredWindow: 'this_week', vehicleId: '11111111-1111-4111-8111-111111111111'}, 'key');
  assert.deepEqual(quote, {...base, kind: 'quotes', contactPreference: 'phone', preferredWindow: 'this_week', vehicleId: '11111111-1111-4111-8111-111111111111', requestKey: 'key'});
  const appointment = requestBody({...base, kind: 'appointments', preferredDate: '2026-11-24', preferredSlot: '10:30', preferredWindow: 'today', contactPreference: 'email'}, 'key');
  assert.equal(appointment.preferredSlot, '10:30');
  assert.equal('preferredWindow' in appointment, false, 'the time window is for quotes only');
  assert.equal(appointment.contactPreference, 'email');
  assert.equal('preferredSlot' in requestBody({...base, kind: 'appointments', preferredDate: '2026-11-24', preferredSlot: '10:15'}, 'key'), false);
  assert.equal('vehicleId' in requestBody({...base, kind: 'quotes', vehicleId: 'bad id!'}, 'key'), false);
  assert.equal('contactPreference' in requestBody({...base, kind: 'quotes', contactPreference: 'fax' as never}, 'key'), false);
  assert.deepEqual([windowParam.bugun, windowParam['bu-hafta'], windowParam['gelecek-hafta'], windowParam['fark-etmez']], ['today', 'this_week', 'next_week', 'any']);
  assert.deepEqual([contactParam.uygulama, contactParam.telefon, contactParam['e-posta']], ['app_message', 'phone', 'email']);
});

const meta = {createdAtMs: NOW - 3 * 3_600_000, reference: 'R-2026-000123', seenByBusinessAtMs: null, contactPreference: 'phone'};
const waitingV2 = {
  id: 'tl-3', businessId: 'ornek-garaj', businessName: 'Örnek Garaj', kind: 'quotes', service: 'Arıza tespiti', vehicle: 'BMW 320i 2019',
  message: 'Klima soğutmuyor, arada tıkırtı var.', status: 'requested', version: 1, ...meta, respondByMs: NOW + 45 * 3_600_000,
  preferredWindow: 'this_week', vehicleId: '11111111-1111-4111-8111-111111111111',
};

test('v2-01 request metadata: reference, created time, 48-hour deadline, seen state, contact and window', () => {
  const [item] = decodeRequestPage({items: [waitingV2], next: null}).items;
  assert.equal(item!.meta.reference, 'R-2026-000123');
  assert.equal(item!.meta.vehicleId, '11111111-1111-4111-8111-111111111111');
  const view = requestView(item!, NOW);
  assert.equal(view.code, 'R-2026-000123');
  assert.match(view.createdText, /^18 Kasım 2026 · 3 sa$/);
  assert.equal(view.createdShort, '3 sa');
  assert.match(view.respondByText, /20 Kasım.*09\.00/);
  assert.equal(view.respondByPassed, false);
  assert.equal(view.seenText, '', 'not seen yet');
  assert.equal(view.contactText, 'Telefon');
  assert.equal(view.windowText, 'Bu hafta içinde');
  assert.equal(requestView(item!, NOW + 2 * DAY).respondByPassed, true);

  const seen = requestView(decodeRequestPage({items: [{...waitingV2, seenByBusinessAtMs: NOW - 20 * 60_000}], next: null}).items[0]!, NOW);
  assert.equal(seen.seenText, '20 dk');

  // A v1-shaped item (no metadata) still reads; the id stands in for the reference.
  const plain = requestView(decodeRequestPage({items: [offered], next: null}).items[0]!, NOW);
  assert.equal(plain.code, '#tl-1');
  assert.equal(plain.seenText, null);
  assert.equal(plain.respondByText, '');

  // A malformed metadata field reads as absent instead of dropping the request.
  const odd = decodeRequestPage({items: [{...waitingV2, reference: 'R-26-1', contactPreference: 'fax'}], next: null});
  assert.equal(odd.items.length, 1);
  assert.equal(odd.items[0]!.meta.reference, null);
  assert.equal(odd.items[0]!.meta.contactPreference, null);
});

test('v2-01 statuses expired and no_show and the reason codes of closed requests', () => {
  const expired = {...waitingV2, status: 'expired', version: 2, resolution: 'Yanıt süresi doldu.', respondByMs: undefined};
  const noShow = {...confirmedAppointment, status: 'no_show', version: 4, ...meta, resolution: 'Müşteri randevuya gelmedi.'};
  const declined = {...waitingV2, id: 'tl-4', status: 'declined', version: 2, respondByMs: undefined, resolution: 'Gerekli parça şu anda temin edilemiyor.', resolutionCode: 'parts_unavailable'};
  const businessCancel = {...waitingV2, id: 'tl-5', status: 'cancelled', version: 2, respondByMs: undefined, resolution: 'İşletmenin bu saat için kapasitesi kalmadı.', resolutionCode: 'no_capacity'};
  const page = decodeRequestPage({items: [expired, noShow, declined, businessCancel], next: null});
  assert.equal(page.dropped, 0);
  const [e, n, d, c] = page.items.map(item => requestView(item, NOW));
  assert.deepEqual([e!.status, e!.statusLabel, e!.canCancel, e!.messagesOpen], ['expired', 'Yanıt süresi doldu', false, false]);
  assert.deepEqual([n!.status, n!.statusLabel, n!.offerStatus, n!.canCancel], ['no_show', 'Randevuya gidilmedi', 'rejected', false]);
  assert.equal(n!.resolution, 'Müşteri randevuya gelmedi.');
  assert.deepEqual([d!.statusLabel, d!.resolutionLabel], ['İşletme reddetti', 'Parça temin edilemiyor']);
  assert.deepEqual([c!.statusLabel, c!.resolutionLabel], ['İşletme iptal etti', 'Uygun kapasite yok']);
  // expired without a resolution text still passes the strict core check.
  assert.equal(decodeRequestPage({items: [{...expired, resolution: undefined}], next: null}).items[0]!.resolution, 'Yanıt süresi doldu.');
});

test('customer cancel carries a reason code; "other" needs a text', () => {
  assert.equal(cancelProblem('', ''), 'Bir neden seç.');
  assert.equal(cancelProblem('price', ''), '');
  assert.match(cancelProblem('other', 'kısa'), /en az 10/);
  assert.match(cancelProblem('timing', 'kısa'), /en az 10/);
  assert.equal(cancelProblem('other', 'Aracı satmaya karar verdim.'), '');
  assert.deepEqual(cancelBody({id: 'tl-3', version: 1}, 'found_other'), {id: 'tl-3', version: 1, action: 'cancel', reasonCode: 'found_other'});
  assert.deepEqual(cancelBody({id: 'tl-3', version: 1}, 'other', '  Aracı satmaya karar verdim. '), {id: 'tl-3', version: 1, action: 'cancel', reasonCode: 'other', text: 'Aracı satmaya karar verdim.'});
  assert.throws(() => cancelBody({id: 'tl-3', version: 1}, 'other'));
});

test('v2 availability: free and full 30-minute slots; full ones are kept as taken', () => {
  const value = decodeAvailability({timezone: 'Europe/Istanbul', slotMinutes: 30, capacity: 1, days: [
    {date: '2026-11-24', slots: [{time: '09:30', state: 'full'}, {time: '09:00', state: 'free'}, {time: '10:00', state: 'free'}]},
    {date: '2026-11-25', slots: [{time: '09:00', state: 'full'}]},
  ]});
  assert.equal(value.slotMinutes, 30);
  assert.equal(value.capacity, 1);
  const days = calendarDays('2026-11-24', value.days, 3);
  assert.deepEqual(days[0]!.slots, ['09:00', '09:30', '10:00']);
  assert.deepEqual(days[0]!.taken, ['09:30']);
  assert.equal(days[0]!.free, 2);
  assert.deepEqual([days[1]!.closed, days[1]!.free, days[1]!.taken], [false, 0, ['09:00']]);
  assert.equal(days[2]!.closed, true);
  // v1 answers (free times as strings) and a closed calendar still read.
  assert.deepEqual(decodeAvailability({timezone: 'Europe/Istanbul', slotMinutes: 60, days: [{date: '2026-11-24', slots: ['09:00']}]}).days[0]!.slots, [{time: '09:00', state: 'free'}]);
  assert.deepEqual(decodeAvailability({timezone: 'Europe/Istanbul', slotMinutes: null, days: [], capacity: null}), {slotMinutes: null, capacity: null, days: []});
  assert.throws(() => decodeAvailability({timezone: 'Europe/Istanbul', slotMinutes: 45, days: []}));
  assert.throws(() => decodeAvailability({timezone: 'Europe/Istanbul', slotMinutes: 30, days: [{date: '2026-11-24', slots: [{time: '09:15', state: 'free'}]}]}));
});
