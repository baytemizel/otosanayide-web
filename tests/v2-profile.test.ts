import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Business} from '@otosanayide/core';
import {parsePublicReviews} from '@otosanayide/core/public-reviews-client';
import type {OpeningHours} from '../app/lib/opening-hours';
import {decodeBusiness} from '../app/lib/search-response';
import {
  addressLine, contactTargets, hoursRows, liveFacts, liveProfile, liveReportReasons, profileSeo, requestActions,
  reviewBody, reviewCreated, reviewView,
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
  assert.deepEqual(unclaimed.dimensions, [], 'the API has no dimension averages');
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
