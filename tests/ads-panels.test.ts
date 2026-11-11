import assert from 'node:assert/strict';
import {test} from 'node:test';
import {metricSummary} from '@otosanayide/core/ad-metrics';
import {brandAcceptanceView} from '@otosanayide/core/brand-acceptance';
import {loadBrandBanner} from '@otosanayide/core/brand-banner-client';
import type {BrandRecord} from '@otosanayide/core/brand-campaigns';
import {brandOrderView} from '@otosanayide/core/brand-orders';
import {brandLedgerView} from '@otosanayide/core/brand-payment-review';
import {brandPrice} from '@otosanayide/core/brand-pricing';
import {campaignView} from '@otosanayide/core/campaigns';
import {fetchHostedCheckout} from '@otosanayide/core/hosted-checkout';
import {
  AdRequestError, brandAcceptanceResponse, brandCapacitySaved, brandMediaSaved, brandMetricResponse, brandOrderPrepared, brandOrderResponse,
  brandPreviewResponse, brandQuoteResponse, brandReservationReleased, brandReservationSaved, brandReservationsResponse, brandTariffResponse,
  campaignPage, campaignSaved, closedMessage, malformedMessage, readAdImage, readAdResponse,
} from '../app/lib/ads-client';

const U1 = '00000000-0000-4000-8000-000000000001';
const U2 = '00000000-0000-4000-8000-000000000002';
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});
const isError = (status: number, message?: string) => (e: unknown) => e instanceof AdRequestError && e.status === status && (message === undefined || e.message === message);

/** The failure matrix every panel decoder must survive: closed, HTML/empty bodies, auth errors and a drifted shape. */
async function failureMatrix(name: string, decode: (raw: unknown) => unknown, valid: unknown, drift: (v: any) => unknown) {
  assert.ok(await readAdResponse(json(valid), decode), name + ': open answer');
  await assert.rejects(readAdResponse(json({error: 'Bu özellik henüz etkin değil.'}, 503), decode), isError(503, 'Bu özellik henüz etkin değil.'), name + ': closed');
  await assert.rejects(readAdResponse(new Response('<html>down</html>', {status: 503, headers: {'Content-Type': 'text/html'}}), decode), isError(503, closedMessage), name + ': HTML 503');
  await assert.rejects(readAdResponse(new Response('', {status: 502}), decode), isError(502, 'İşlem tamamlanamadı. Tekrar dene.'), name + ': empty 502');
  await assert.rejects(readAdResponse(new Response('', {status: 401}), decode), isError(401, 'Oturum süresi doldu. Yeniden giriş yap.'), name + ': 401');
  await assert.rejects(readAdResponse(json({error: 'Bu işlem için yetkiniz yok.'}, 403), decode), isError(403, 'Bu işlem için yetkiniz yok.'), name + ': 403');
  const forbidden = await readAdResponse(json({error: 'x'}, 403), decode).catch(e => e);
  assert.equal((forbidden as AdRequestError).closed, false, name + ': 403 is not "closed"');
  await assert.rejects(readAdResponse(json(drift(structuredClone(valid))), decode), isError(200, malformedMessage), name + ': drift');
  await assert.rejects(readAdResponse(new Response('not json', {status: 200}), decode), isError(200, malformedMessage), name + ': non-JSON 200');
}

const acceptanceRecord = {reservationId: U1, campaignId: U2, campaignVersion: 1, receiptId: 'a'.repeat(64), placement: 'home_banner', dates: ['2026-12-01'], currency: 'TRY', totalMinor: 1200, status: 'accepted', acceptedAtMs: 10, committedUntilMs: 20};
const orderRecord = {reservationId: U1, campaignId: U2, campaignVersion: 1, tariffVersion: 1, capacityVersion: 1, currency: 'TRY' as const, subtotalMinor: 1000, taxMinor: 200, totalMinor: 1200, createdAtMs: 1, expiresAtMs: 2, status: 'prepared' as const};
const tariff = {market: {placement: 'home_banner' as const, city: '', category: ''}, enabled: true, dailyMinor: 1000, taxBasisPoints: 2000, version: 1};
const brandRecord: BrandRecord = {
  creative: {brand: 'Sentetik Marka', headline: 'Sentetik kampanya', description: 'Yalnız test için sentetik açıklama.', url: 'https://www.otosanayide.com/kampanya', placement: 'home_banner', city: '', category: '', startDate: '2026-12-01', endDate: '2026-12-07'} as BrandRecord['creative'],
  status: 'approved', version: 3, note: '', lastEditorId: 'e', createdAtMs: 1, updatedAtMs: 2,
};
const hold = {id: U1, campaignId: U2, status: 'held', expiresAtMs: 99, totalMinor: 1200, currency: 'TRY', campaignVersion: 3, tariffVersion: 1, capacityVersion: 1, payable: false};
const campaign = campaignView(U2, {placement: 'search', city: 'İstanbul', category: 'mechanical', days: 7, startDate: '2026-12-01', headline: 'Kış bakımı', description: 'Sentetik açıklama metni', businessId: 'biz-1', status: 'pending', version: 2})!;

test('BrandAcceptance: core acceptance and ledger views pass; failures are readable', async () => {
  const valid = {reservationId: U1, acceptance: brandAcceptanceView(U1, acceptanceRecord), payment: brandLedgerView(U1, {status: 'verified', checkedAtMs: 5}), eligible: false, expiresAtMs: null, checkedAtMs: 30, enabled: true};
  await failureMatrix('acceptance', raw => brandAcceptanceResponse.parse(raw), valid, v => ({...v, payment: {...v.payment, status: 'paid'}}));
  assert.ok(brandAcceptanceResponse.parse({...valid, acceptance: null, payment: brandLedgerView(U1, undefined)}));
});

test('BrandMetricReport: metricSummary rows pass; totals that do not add up are refused', async () => {
  const valid = {...metricSummary([{date: '2026-11-01', views: 10, clicks: 1}, {date: '2026-11-02', views: 5, clicks: 0}]), enabled: false, campaignId: U2};
  await failureMatrix('metrics', raw => brandMetricResponse.parse(raw), valid, v => ({...v, views: 99}));
});

test('BrandOrderPanel: brandOrderView passes for GET and POST; a payable order is refused', async () => {
  const order = brandOrderView(orderRecord, 'prepared');
  await failureMatrix('orders GET', raw => brandOrderResponse.parse(raw), {enabled: false, checkoutEnabled: false, order}, v => ({...v, order: {...v.order, payable: true}}));
  await failureMatrix('orders POST', raw => brandOrderPrepared.parse(raw), {order}, v => ({order: {...v.order, totalMinor: 1}}));
  assert.ok(brandOrderResponse.parse({enabled: true, checkoutEnabled: false, order: null}));
  assert.ok(brandOrderResponse.parse({enabled: true, checkoutEnabled: false, order: brandOrderView(orderRecord, 'expired')}));
});

test('BrandReservations: hold, capacity, release, tariff and quote shapes', async () => {
  await failureMatrix('reservations', raw => brandReservationsResponse.parse(raw), {enabled: false, capacity: {enabled: true, capacity: 3, version: 1}, reservation: hold}, v => ({...v, capacity: {...v.capacity, capacity: 50}}));
  await failureMatrix('reserve', raw => brandReservationSaved.parse(raw), {reservation: hold}, v => ({reservation: {...v.reservation, status: 'paid'}}));
  await failureMatrix('release', raw => brandReservationReleased.parse(raw), {released: true}, () => ({released: false}));
  await failureMatrix('capacity', raw => brandCapacitySaved.parse(raw), {capacity: {enabled: false, capacity: 1, version: 2}}, () => ({capacity: {enabled: false, capacity: 1, version: 0}}));
});

test('BrandPricing: tariffs go through brandTariffView; the brandPrice quote passes', async () => {
  await failureMatrix('tariff', raw => brandTariffResponse.parse(raw), {tariff}, v => ({tariff: {...v.tariff, dailyMinor: 0}}));
  assert.deepEqual(brandTariffResponse.parse({tariff: null}), {tariff: null});
  const now = Date.parse('2026-11-11T09:00:00+03:00');
  const quote = brandPrice(brandRecord, tariff, {campaignId: U2, campaignVersion: 3, tariffVersion: 1}, now);
  await failureMatrix('quote', raw => brandQuoteResponse.parse(raw), {quote}, v => ({quote: {...v.quote, payable: true}}));
});

test('BrandPreview: a closed preview and an eligible one pass; reason and ad must agree', async () => {
  const context = {reservationId: U1, placement: 'home_banner', city: 'İstanbul', category: ''};
  await failureMatrix('preview', raw => brandPreviewResponse.parse(raw), {context, eligible: false, reason: 'disabled', ad: null, checkedAtMs: 1}, v => ({...v, reason: 'eligible'}));
  assert.ok(brandPreviewResponse.parse({context, eligible: true, reason: 'eligible', ad: {campaignId: U2, brand: 'B', headline: 'H', description: 'D', url: 'https://www.otosanayide.com/', image: {id: U1, width: 10, height: 10}}, checkedAtMs: 1}));
});

test('BrandImageEditor: media upload answers a brand view; images must be WebP', async () => {
  const {brandView} = await import('@otosanayide/core/brand-campaigns');
  await failureMatrix('media', raw => brandMediaSaved.parse(raw), {item: brandView(U2, brandRecord, 'r')}, v => ({item: {...v.item, status: 'live'}}));
  const webp = new Response(new Uint8Array([1, 2, 3]), {headers: {'Content-Type': 'image/webp'}});
  assert.equal((await readAdImage(webp)).size, 3);
  await assert.rejects(readAdImage(new Response('<html/>', {headers: {'Content-Type': 'text/html'}})), isError(200, malformedMessage));
  await assert.rejects(readAdImage(new Response(new Uint8Array(), {headers: {'Content-Type': 'image/webp'}})), isError(200, malformedMessage));
  await assert.rejects(readAdImage(json({error: 'Bu özellik henüz etkin değil.'}, 503)), isError(503, 'Bu özellik henüz etkin değil.'));
  await assert.rejects(readAdImage(new Response('', {status: 403})), isError(403, 'Bu işlem için yetkiniz yok.'));
});

test('Campaigns: every row must survive the core campaignView builder', async () => {
  await failureMatrix('campaigns', raw => campaignPage.parse(raw), {items: [campaign], next: null}, v => ({...v, items: [{...v.items[0], status: 'live'}]}));
  await failureMatrix('campaign save', raw => campaignSaved.parse(raw), {item: campaign}, v => ({item: {...v.item, days: 9}}));
});

test('ActiveBrandBanner (core loadBrandBanner): closed, HTML and auth errors hide the banner; drift throws', async () => {
  const context = {placement: 'home_banner', city: 'İstanbul', category: ''};
  for (const response of [json({error: 'kapalı'}, 503), new Response('<html/>', {status: 503}), new Response('', {status: 401}), new Response('', {status: 403})]) {
    assert.equal(await loadBrandBanner(context, async () => 'tok', (async () => response) as typeof fetch), null);
  }
  await assert.rejects(loadBrandBanner(context, async () => 'tok', (async () => json({items: [{key: 'x'}]})) as typeof fetch));
  assert.equal(await loadBrandBanner(context, async () => 'tok', (async () => json({items: []})) as typeof fetch), null);
});

test('HostedCheckoutButton (core fetchHostedCheckout): closed and malformed answers reject; nothing redirects', async () => {
  const options = (response: Response) => ({origin: 'https://api.otosanayide.com', locale: 'tr', token: async () => 'tok', guard: () => {}, request: (async () => response) as typeof fetch});
  const input = {kind: 'brand', reservationId: U1};
  await assert.rejects(fetchHostedCheckout(options(json({error: 'Kartla ödeme henüz etkin değil.'}, 503)), input), /henüz etkin değil/);
  await assert.rejects(fetchHostedCheckout(options(new Response('<html/>', {status: 503})), input));
  await assert.rejects(fetchHostedCheckout(options(new Response('', {status: 401})), input));
  await assert.rejects(fetchHostedCheckout(options(json({kind: 'brand', orderId: U1, session: {sessionId: 's', url: 'http://pay.example/', expiresAtMs: Date.now() + 60000}})), input));
  const ok = await fetchHostedCheckout(options(json({kind: 'brand', orderId: U1, session: {sessionId: 's', url: 'https://pay.example/x', expiresAtMs: Date.now() + 60000}})), input);
  assert.equal(ok.session.url, 'https://pay.example/x');
});
