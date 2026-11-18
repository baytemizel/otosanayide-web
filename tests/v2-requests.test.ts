import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ApiError} from '../app/lib/api-read';
import {
  calendarDays, claimRow, decodeClaims, decodeNotices, decodeRequestPage, dayLongText, exportErrorMessage, exportSummary, liveErrorMessage,
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
  assert.equal('preferredSlot' in requestBody({...base, kind: 'appointments', preferredDate: '2026-11-20', preferredSlot: '10:30'}, 'key'), false);
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
  const days = calendarDays('2026-11-21', [{date: '2026-11-21', slots: ['11:00', '09:00']}, {date: '2026-11-23', slots: ['10:00']}], 3);
  assert.deepEqual(days.map(d => [d.date, d.closed, d.free]), [['2026-11-21', false, 2], ['2026-11-22', true, 0], ['2026-11-23', false, 1]]);
  assert.deepEqual(days[0]!.slots, ['09:00', '11:00']);
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
