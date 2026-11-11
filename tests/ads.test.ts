import assert from 'node:assert/strict';
import {test} from 'node:test';
import {brandView, type BrandRecord} from '@otosanayide/core/brand-campaigns';
import {paymentCaseAmounts, paymentCaseView} from '@otosanayide/core/payment-cases';
import {AdRequestError, brandCampaignPage, brandCampaignSaved, cancellationQueueResponse, closedMessage, malformedMessage, paymentCasePage, paymentCaseSaved, readAdResponse, tariffResponse, tariffSaved} from '../app/lib/ads-client';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const rejectsWith = async (promise: Promise<unknown>, status: number, message: string) =>
  assert.rejects(promise, (e: unknown) => e instanceof AdRequestError && e.status === status && e.message === message);

/** The API's ClosedFeatureController body (flags off) and a proxy's HTML page. */
const closedBodies = [
  () => json({error: 'Bu özellik henüz etkin değil.'}, 503),
  () => json({error: 'Marka reklamı kabul işlemleri henüz açılmadı.'}, 503),
  () => new Response('<html>Service Unavailable</html>', {status: 503, headers: {'Content-Type': 'text/html'}}),
  () => new Response('', {status: 503}),
];

test('a closed feature (503) reads as a closed error with the API message or a fixed one', async () => {
  const decoders = [tariffResponse, brandCampaignPage, paymentCasePage, cancellationQueueResponse];
  for (const decoder of decoders) {
    await rejectsWith(readAdResponse(closedBodies[0]!(), raw => decoder.parse(raw)), 503, 'Bu özellik henüz etkin değil.');
    await rejectsWith(readAdResponse(closedBodies[1]!(), raw => decoder.parse(raw)), 503, 'Marka reklamı kabul işlemleri henüz açılmadı.');
    await rejectsWith(readAdResponse(closedBodies[2]!(), raw => decoder.parse(raw)), 503, closedMessage);
    await rejectsWith(readAdResponse(closedBodies[3]!(), raw => decoder.parse(raw)), 503, closedMessage);
  }
  const error = await readAdResponse(closedBodies[0]!(), raw => raw).catch(e => e);
  assert.equal((error as AdRequestError).closed, true);
});

test('authorization failures keep their meaning and are not shown as closed', async () => {
  const error = await readAdResponse(json({error: 'Bu işlem için yetkiniz yok.'}, 403), raw => raw).catch(e => e);
  assert.equal((error as AdRequestError).closed, false);
  await rejectsWith(readAdResponse(new Response('nope', {status: 401}), raw => raw), 401, 'Oturum süresi doldu. Yeniden giriş yap.');
});

test('ad tariffs: an open answer passes, an empty market is null, drift is an error', async () => {
  const tariff = {placement: 'search', city: 'İstanbul', category: 'mechanical', enabled: true, capacity: 3, sevenDaysMinor: 150000, thirtyDaysMinor: 500000, taxBasisPoints: 2000, version: 4};
  assert.deepEqual((await readAdResponse(json({tariff}), raw => tariffResponse.parse(raw))).tariff, tariff);
  assert.equal((await readAdResponse(json({tariff: null}), raw => tariffResponse.parse(raw))).tariff, null);
  assert.equal((await readAdResponse(json({version: 5}), raw => tariffSaved.parse(raw))).version, 5);
  await rejectsWith(readAdResponse(json({tariff: {...tariff, capacity: 99}}), raw => tariffResponse.parse(raw)), 200, malformedMessage);
  await rejectsWith(readAdResponse(json({tariff: {...tariff, extra: true}}), raw => tariffResponse.parse(raw)), 200, malformedMessage);
});

const record: BrandRecord = {
  creative: {brand: 'Sentetik Marka', headline: 'Sentetik kampanya', description: 'Yalnız test için sentetik açıklama.', url: 'https://www.otosanayide.com/kampanya', placement: 'home_banner', city: '', category: '', startDate: '2026-12-01', endDate: '2026-12-14'} as BrandRecord['creative'],
  status: 'pending', version: 2, note: '', lastEditorId: 'editor-1', createdAtMs: 1, updatedAtMs: 2,
};

test('brand campaigns: rows built by the core brandView pass; a changed row shape does not', async () => {
  const item = brandView(uuid(1), record, 'reviewer-2');
  const page = await readAdResponse(json({mediaEnabled: false, items: [item], next: null}), raw => brandCampaignPage.parse(raw));
  assert.deepEqual(page.items, [item]);
  assert.equal((await readAdResponse(json({item}), raw => brandCampaignSaved.parse(raw))).item.canReview, true);
  await rejectsWith(readAdResponse(json({mediaEnabled: false, items: [{...item, status: 'live'}], next: null}), raw => brandCampaignPage.parse(raw)), 200, malformedMessage);
  await rejectsWith(readAdResponse(json({items: [item], next: null}), raw => brandCampaignPage.parse(raw)), 200, malformedMessage);
});

test('payment cases: list rows with amounts and the PATCH answer pass; unknown status does not', async () => {
  const row = {...paymentCaseView(uuid(2), {status: 'reviewing', version: 1, reason: 'additional_payment', createdAtMs: 10, note: 'x'}), ...paymentCaseAmounts({totalMinor: 1000, currency: 'TRY'}, undefined)};
  const page = await readAdResponse(json({items: [row], next: null}), raw => paymentCasePage.parse(raw));
  assert.deepEqual(page.items[0]?.expected, {minor: 1000, currency: 'TRY'});
  assert.equal(page.items[0]?.received, null);
  const saved = paymentCaseView(uuid(2), {status: 'closed', version: 2, reason: 'additional_payment', createdAtMs: 10, note: 'kapandı'});
  assert.equal((await readAdResponse(json({item: saved}), raw => paymentCaseSaved.parse(raw))).item.status, 'closed');
  await rejectsWith(readAdResponse(json({items: [{...row, status: 'paid'}], next: null}), raw => paymentCasePage.parse(raw)), 200, malformedMessage);
});

test('cancellation queue uses the core response schema unchanged', async () => {
  const empty = await readAdResponse(json({filter: 'all', items: [], next: null}), raw => cancellationQueueResponse.parse(raw)).catch(e => e);
  // The filter names come from core; whichever is first must be accepted.
  if (empty instanceof Error) {
    const {cancellationFilters} = await import('@otosanayide/core/brand-cancellation-queue');
    const ok = await readAdResponse(json({filter: cancellationFilters[0], items: [], next: null}), raw => cancellationQueueResponse.parse(raw));
    assert.deepEqual(ok.items, []);
  } else {
    assert.deepEqual(empty.items, []);
  }
});
