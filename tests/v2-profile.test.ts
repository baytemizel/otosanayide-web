import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Business} from '@otosanayide/core';
import {parsePublicReviews} from '@otosanayide/core/public-reviews-client';
import type {OpeningHours} from '../app/lib/opening-hours';
import {decodeBusiness} from '../app/lib/search-response';
import {fetchOwnReviews} from '../app/lib/own-reviews';
import {
  addressLine, answersFromOwn, aspectDimensions, contactTargets, hoursRows, liveFacts, liveProfile, liveReportReasons, monthLabel, nameInitials,
  ownReviewMeta, profileSeo, requestActions, reviewBody, reviewCreated, reviewEditBody, reviewReportBody, reviewReportReasons, reviewView,
  visitMonthAllowed, visitMonthOptions,
} from '../app/lib/v2/profile';

const record = (extra: Record<string, unknown> = {}) => ({
  id: 'ornek-garaj', name: 'Örnek Garaj', city: 'İstanbul', district: 'Kadıköy', address: 'Örnek Sanayi Sitesi No 12, Kadıköy',
  categories: ['mechanical'], services: ['Periyodik bakım', 'Fren sistemi'], brands: ['BMW'], phone: '+90 216 000 00 01',
  coordinateStatus: 'unverified', ownership: 'unclaimed', features: {quotes: false, appointments: false}, ownerReady: false, published: true, ...extra,
});
const business = (extra: Record<string, unknown> = {}) => decodeBusiness(record(extra), 'live').business;
const verified = (extra: Record<string, unknown> = {}) => business({latitude: 40.99, longitude: 29.03, coordinateStatus: 'verified', ownership: 'verified', ownerReady: true, ...extra});

test('structured hours become Monday-first rows; equal neighbours share a row and days map to JS weekdays', () => {
  const hours: OpeningHours = {timezone: 'Europe/Istanbul', week: [
    ...[1, 2, 3, 4, 5].map((day) => ({day, intervals: [{open: '08:30', close: '19:00'}]})),
    {day: 6, intervals: [{open: '09:00', close: '12:00'}, {open: '13:00', close: '17:00'}]},
  ]};
  assert.deepEqual(hoursRows(hours), [
    {label: 'Pazartesi – Cuma', days: [1, 2, 3, 4, 5], time: '08.30 – 19.00'},
    {label: 'Cumartesi', days: [6], time: '09.00 – 12.00, 13.00 – 17.00'},
    {label: 'Pazar', days: [0], time: 'Kapalı'},
  ]);
  // A closed day between two equal days splits them.
  const split: OpeningHours = {timezone: 'Europe/Istanbul', week: [{day: 1, intervals: [{open: '09:00', close: '18:00'}]}, {day: 3, intervals: [{open: '09:00', close: '18:00'}]}]};
  assert.deepEqual(hoursRows(split).map((r) => r.label), ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe – Pazar']);
});

test('live profile data: catalog vs owner records, unknown hours stay unknown, free-text hours are kept', () => {
  const unclaimed = liveProfile(business({brands: []}));
  assert.equal(unclaimed.source, 'catalog');
  assert.equal(unclaimed.brands, null);
  assert.equal(unclaimed.hours, null);
  assert.equal(unclaimed.hoursNote, null);
  assert.equal(unclaimed.coordinateVerified, false);
  assert.deepEqual(unclaimed.dimensions, [], 'no aspects without reviewSummary.aspects');
  assert.deepEqual(unclaimed.reviews, []);
  assert.deepEqual(unclaimed.photos, []);

  const owner = liveProfile(verified({hours: 'Hafta içi 09.00–18.00', cardPayment: false, wc: true}));
  assert.equal(owner.source, 'owner');
  assert.deepEqual(owner.brands, ['BMW']);
  assert.equal(owner.hoursNote, 'Hafta içi 09.00–18.00');
  assert.equal(owner.coordinateVerified, true);
  assert.deepEqual(owner.facts, [{label: 'Kart ile ödeme', value: 'Yok'}, {label: 'WC', value: 'Var'}]);

  const hours: OpeningHours = {timezone: 'Europe/Istanbul', week: [{day: 1, intervals: [{open: '09:00', close: '18:00'}]}]};
  const structured = liveProfile(verified({hours: 'eski metin'}), {openingHours: hours});
  assert.deepEqual(structured.hours?.map((r) => r.label), ['Pazartesi', 'Salı – Pazar']);
  assert.equal(structured.hoursNote, null, 'structured hours win over the free text');
  assert.deepEqual(liveFacts(business()), [], 'nothing is assumed when the record is silent');
});

test('contact targets: a checked phone, a route only for a verified point, an address search otherwise', () => {
  const plain = contactTargets(business());
  assert.equal(plain.call, 'tel:+902160000001');
  assert.equal(plain.verified, false);
  assert.match(plain.directions, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  assert.equal(plain.map, plain.directions);

  const point = contactTargets(verified());
  assert.equal(point.verified, true);
  assert.match(point.directions, /maps\/dir\/\?api=1&destination=40\.99%2C29\.03/);
  assert.match(point.map, /maps\/search\/\?api=1&query=40\.99%2C29\.03/);

  assert.equal(contactTargets(business({phone: undefined})).call, null);
  assert.equal(contactTargets(business({phone: '444 0 444'})).call, 'tel:4440444');
});

test('quote and appointment buttons follow the core activation rule', () => {
  assert.deepEqual(requestActions(business()), {quotes: false, appointments: false});
  assert.deepEqual(requestActions(verified({features: {quotes: true, appointments: false}})), {quotes: true, appointments: false});
  assert.deepEqual(requestActions(verified({ownerReady: false, features: {quotes: false, appointments: false}})), {quotes: false, appointments: false});
});

test('public reviews map to anonymous cards with score chips, owner reply and photo URLs', () => {
  const photo = '6b2d1c4e-8f3a-4b7c-a1d2-9e8f7a6b5c42';
  const page = parsePublicReviews({
    reviews: [
      {id: 'r1', rating: 5, text: 'Fren balatalarını aynı gün değiştirdiler.', resolved: 'partial', wc: 'yes', quality: 5, wcCleanliness: 4, reply: {text: 'Teşekkürler, tekrar bekleriz.'}, photoIds: [photo]},
      {id: 'r2', rating: 3, text: 'İş uzun sürdü ama sonuç iyi.', resolved: 'unknown', wc: 'unknown'},
    ],
    nextCursor: null, count: 2, average: 4,
  });
  const media = (id: string, thumb: boolean) => `/media/${id}${thumb ? '?t' : ''}`;
  const [first, second] = page.reviews.map((r) => reviewView(r, media));
  assert.equal(first!.author, '');
  assert.equal(first!.resolved, 'Kısmen');
  assert.deepEqual(first!.chips, ['Hizmet kalitesi 5/5', 'WC temizliği 4/5', 'WC: Var']);
  assert.equal(first!.ownerReply, 'Teşekkürler, tekrar bekleriz.');
  assert.deepEqual(first!.photos, [{src: `/media/${photo}`, thumb: `/media/${photo}?t`, alt: 'Yorum fotoğrafı 1'}]);
  assert.equal(first!.photoCount, 1);
  assert.equal(second!.resolved, 'Henüz belli değil');
  assert.deepEqual(second!.chips, []);
  assert.equal(second!.ownerReply, null);
});

test('the W07 answers become a core reviewSchema body', () => {
  const body = reviewBody('ornek-garaj', {rating: 4, scores: {quality: 5, payment: 0, wcCleanliness: 3}, resolved: 'Evet', wc: 'no', text: '  Fren işi temiz yapıldı.  '});
  assert.deepEqual(body, {businessId: 'ornek-garaj', rating: 4, quality: 5, resolved: 'yes', wc: 'no', text: 'Fren işi temiz yapıldı.'});
  const withWc = reviewBody('ornek-garaj', {rating: 5, scores: {wcCleanliness: 3, cleanliness: 4}, resolved: '', wc: 'yes', text: 'Bekleme alanı ve WC temizdi.'});
  assert.deepEqual(withWc, {businessId: 'ornek-garaj', rating: 5, cleanliness: 4, wcCleanliness: 3, resolved: 'unknown', wc: 'yes', text: 'Bekleme alanı ve WC temizdi.'});
  assert.throws(() => reviewBody('ornek-garaj', {rating: 0, scores: {}, resolved: '', wc: 'unknown', text: 'Yeterince uzun bir metin.'}));
  assert.throws(() => reviewBody('ornek-garaj', {rating: 5, scores: {}, resolved: '', wc: 'unknown', text: 'kısa'}));
  assert.deepEqual(reviewCreated.parse({id: 'rv-1', status: 'pending'}), {id: 'rv-1', status: 'pending'});
  assert.throws(() => reviewCreated.parse({id: 'rv-1', status: 'approved'}));
});

test('S08 reasons, SEO text and the header address line', () => {
  assert.deepEqual(liveReportReasons.map((r) => r.value), ['closed', 'moved', 'phone', 'address', 'location', 'hours', 'services', 'other']);
  assert.equal(liveReportReasons.at(-1)?.label, 'Diğer');
  const seo = profileSeo(business() as Business);
  assert.equal(seo.title, 'Örnek Garaj · Kadıköy / İstanbul · Mekanik Servis');
  assert.match(seo.description, /Hizmetler: Periyodik bakım, Fren sistemi\./);
  assert.equal(addressLine('Örnek Sokak No 1, Kadıköy', 'Kadıköy'), 'Örnek Sokak No 1, Kadıköy');
  assert.equal(addressLine('Örnek Sokak No 1', 'Kadıköy'), 'Örnek Sokak No 1, Kadıköy');
});

const NOW = new Date('2026-11-21T09:00:00Z');

test('v2 public reviews: short author name with initials, visit month · service line, publish date, extra score chips', () => {
  const page = parsePublicReviews({
    reviews: [
      {id: 'r1', rating: 5, text: 'Fren balatalarını aynı gün değiştirdiler.', resolved: 'yes', wc: 'unknown', quality: 5, communication: 4, priceTransparency: 3,
        author: {displayName: 'Selin A.'}, service: 'Periyodik bakım', visitMonth: '2026-10', publishedAtMs: Date.UTC(2026, 10, 14, 9)},
      {id: 'r2', rating: 3, text: 'İş uzun sürdü ama sonuç iyi.', resolved: 'unknown', wc: 'unknown', author: null, service: null, visitMonth: null, publishedAtMs: null},
    ],
    nextCursor: null, count: 2, average: 4,
  });
  const [named, anonymous] = page.reviews.map((r) => reviewView(r, () => ''));
  assert.equal(named!.author, 'Selin A.');
  assert.equal(named!.initials, 'SA');
  assert.match(named!.avatarColor, /^var\(--/);
  assert.equal(named!.meta, 'Ekim 2026 · Periyodik bakım');
  assert.deepEqual(named!.published, {iso: '2026-11-14T09:00:00.000Z', label: '14 Kasım 2026'});
  assert.deepEqual(named!.chips, ['Hizmet kalitesi 5/5', 'İletişim 4/5', 'Fiyat şeffaflığı 3/5']);
  assert.equal(anonymous!.author, '', 'null author keeps the anonymous label');
  assert.equal(anonymous!.initials, '');
  assert.equal(anonymous!.meta, '');
  assert.equal(anonymous!.published, null);
  // Unknown or malformed v2 fields still fail the strict page parser.
  assert.throws(() => parsePublicReviews({reviews: [{id: 'r', rating: 4, text: 'Yeterince uzun metin.', resolved: 'yes', wc: 'no', author: {displayName: 'A', email: 'x'}}], nextCursor: null, count: 1, average: 4}));
  assert.throws(() => parsePublicReviews({reviews: [{id: 'r', rating: 4, text: 'Yeterince uzun metin.', resolved: 'yes', wc: 'no', visitMonth: '2026-13'}], nextCursor: null, count: 1, average: 4}));
  assert.equal(nameInitials('Selin'), 'SE');
  assert.equal(nameInitials('ilker A.'), 'İA');
});

test('aspect averages from the business record become the rating bars; an unscored aspect is null ("—")', () => {
  const aspects = {quality: {average: 4.5, count: 12}, payment: {average: 4.1, count: 9}, cleanliness: {average: 3.9, count: 7}, communication: {average: 4.8, count: 3}, priceTransparency: {average: null, count: 0}};
  assert.deepEqual(aspectDimensions(aspects), [
    {label: 'Hizmet kalitesi', score: 4.5, count: 12},
    {label: 'İletişim', score: 4.8, count: 3},
    {label: 'Fiyat şeffaflığı', score: null, count: 0},
    {label: 'Ödeme kolaylığı', score: 4.1, count: 9},
    {label: 'Temizlik', score: 3.9, count: 7},
  ]);
  const none = Object.fromEntries(Object.keys(aspects).map((k) => [k, {average: null, count: 0}]));
  assert.deepEqual(aspectDimensions(none), [], 'nothing scored: no bars');
  assert.deepEqual(aspectDimensions(undefined), []);
  // The detail endpoint's reviewSummary keeps its aspects through the shared business parser.
  const decoded = decodeBusiness({...record(), reviewSummary: {count: 12, average: 4.4, aspects}}, 'live');
  assert.equal(decoded.extras.reviewSummary?.count, 12);
  assert.equal(liveProfile(decoded.business, decoded.extras).dimensions[0]?.score, 4.5);
  assert.equal(decodeBusiness({...record(), reviewSummary: {count: 1, average: 4, aspects: {quality: {average: 4, count: 0}}}}, 'live').extras.reviewSummary, undefined, 'contradictory aspect is rejected');
});

test('visit month choices: this Istanbul month back to 24 months; the same rule guards the body', () => {
  const options = visitMonthOptions(NOW);
  assert.equal(options.length, 25);
  assert.deepEqual(options[0], {value: '2026-11', label: 'Kasım 2026'});
  assert.deepEqual(options.at(-1), {value: '2024-11', label: 'Kasım 2024'});
  assert.equal(visitMonthOptions(new Date('2026-11-30T22:30:00Z'))[0]?.value, '2026-12', 'Istanbul is already in December');
  assert.equal(visitMonthAllowed('2026-11', NOW), true);
  assert.equal(visitMonthAllowed('2024-11', NOW), true);
  assert.equal(visitMonthAllowed('2024-10', NOW), false);
  assert.equal(visitMonthAllowed('2026-12', NOW), false);
  assert.equal(visitMonthAllowed('2026-1', NOW), false);
  assert.equal(monthLabel('2026-01'), 'Ocak 2026');
});

test('W07 v2 answers: new scores, service and visit month go into POST and the PATCH edit body', () => {
  const answers = {rating: 5, scores: {quality: 5, communication: 4, priceTransparency: 3}, resolved: 'Evet' as const, wc: 'unknown' as const, text: 'Fiyatı işe başlamadan söylediler.', service: ' Periyodik bakım ', visitMonth: '2026-10'};
  assert.deepEqual(reviewBody('ornek-garaj', answers, NOW), {
    businessId: 'ornek-garaj', rating: 5, quality: 5, communication: 4, priceTransparency: 3, resolved: 'yes', wc: 'unknown',
    text: 'Fiyatı işe başlamadan söylediler.', service: 'Periyodik bakım', visitMonth: '2026-10',
  });
  const plain = reviewBody('ornek-garaj', {...answers, scores: {}, service: '', visitMonth: ''}, NOW);
  assert.equal('service' in plain, false);
  assert.equal('visitMonth' in plain, false);
  assert.throws(() => reviewBody('ornek-garaj', {...answers, visitMonth: '2026-12'}, NOW), /gelecekte/);
  assert.throws(() => reviewBody('ornek-garaj', {...answers, visitMonth: '2024-10'}, NOW));
  assert.throws(() => reviewBody('ornek-garaj', {...answers, service: 'x'.repeat(121)}, NOW));
  const edit = reviewEditBody('ornek-garaj', 3, answers, NOW);
  assert.equal(edit.action, 'edit');
  assert.equal(edit.action === 'edit' && edit.expectedVersion, 3);
  assert.equal(edit.action === 'edit' && edit.review.visitMonth, '2026-10');
});

test('the own review fills the edit form; a visit month now older than 24 months is dropped', () => {
  const own = {id: 'rv-1', text: 'Fren işi temiz yapıldı.', rating: 4, status: 'approved' as const, version: 2, reason: '', resolved: 'partial' as const, wc: 'yes' as const,
    quality: 5, wcCleanliness: 3, communication: 4, service: 'Fren sistemi', visitMonth: '2026-09', canEdit: true, canWithdraw: true};
  assert.deepEqual(answersFromOwn(own, NOW), {
    answers: {rating: 4, scores: {quality: 5, communication: 4, wcCleanliness: 3}, resolved: 'Kısmen', wc: 'yes', text: 'Fren işi temiz yapıldı.', service: 'Fren sistemi', visitMonth: '2026-09'},
    droppedMonth: false,
  });
  const old = answersFromOwn({...own, visitMonth: '2024-01', service: null, resolved: 'unknown'}, NOW);
  assert.equal(old.answers.visitMonth, '');
  assert.equal(old.answers.service, '');
  assert.equal(old.answers.resolved, '');
  assert.equal(old.droppedMonth, true);
  assert.equal(answersFromOwn({...own, visitMonth: null}, NOW).droppedMonth, false);
});

test('review report: a reason, the text only when written; "Diğer" needs 10+ characters', () => {
  assert.deepEqual(reviewReportReasons.map((r) => r.value), ['fake', 'offensive', 'personal_data', 'not_customer', 'spam', 'other']);
  assert.deepEqual(reviewReportBody('rv-1', 'fake'), {reviewId: 'rv-1', kind: 'report', reason: 'fake'});
  assert.deepEqual(reviewReportBody('rv-1', 'spam', '  Sürekli aynı reklam metni.  '), {reviewId: 'rv-1', kind: 'report', reason: 'spam', text: 'Sürekli aynı reklam metni.'});
  assert.throws(() => reviewReportBody('rv-1', 'other'));
  assert.throws(() => reviewReportBody('rv-1', 'other', 'kısa'));
  assert.throws(() => reviewReportBody('rv-1', 'fake', 'kısa'), 'a written text still needs 10 characters');
  assert.deepEqual(reviewReportBody('rv-1', 'other', 'Bu işletmeyle ilgili değil.').text, 'Bu işletmeyle ilgili değil.');
});

test('own review list asks for v=2, falls back to v1 on 400 and keeps the v2 fields for the meta line', async () => {
  const review = {id: 'r1', text: 'İyi hizmet aldım, teşekkürler.', rating: 5, version: 1, status: 'approved', reason: '', resolved: 'yes', wc: 'unknown', canEdit: true, canWithdraw: true, service: 'Periyodik bakım', visitMonth: '2026-10'};
  const paths: string[] = [];
  const request = (async (path: string) => {
    paths.push(path);
    return path.includes('v=2') ? new Response('{"error":"Geçersiz istek."}', {status: 400}) : Response.json({items: [{businessId: 'b1', businessName: 'Sentetik', review}], next: null});
  }) as never;
  const page = await fetchOwnReviews(async () => 't', '', request);
  assert.deepEqual(paths, ['/api/reviews/mine/all?v=2', '/api/reviews/mine/all']);
  assert.equal(ownReviewMeta(page.items[0]!.review), 'Ziyaret: Ekim 2026 · Periyodik bakım');
  assert.equal(ownReviewMeta({service: null, visitMonth: null}), '');
  assert.equal(ownReviewMeta({service: 'Fren', visitMonth: null}), 'Fren');
});
