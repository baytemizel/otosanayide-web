import assert from 'node:assert/strict';
import {afterEach, beforeEach, test} from 'node:test';
import {adminApi} from '../app/lib/admin-api';
import {ApiError} from '../app/lib/api-read';
import {configureEnv} from '../app/lib/env';
import {availabilityApi, exportsApi, listsApi, messagesApi, offerExtras, PRODUCT_NEWS_TEXT_VERSION, preferencesApi, waitlistApi} from '../app/lib/member-api';
import {openingHoursSchema} from '../app/lib/opening-hours';
import {decodeSearchPage} from '../app/lib/search-response';

type Seen = {url: string; method: string; body: unknown; auth: string | null};
const original = globalThis.fetch;
let seen: Seen[] = [];
let answer: () => Response = () => new Response('{}');
const token = async () => 'tok';
const json = (v: unknown, status = 200) => () => new Response(JSON.stringify(v), {status, headers: {'Content-Type': 'application/json'}});
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  configureEnv({appMode: 'live', apiOrigin: 'https://api.example.test'});
  seen = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen.push({url, method: init.method ?? 'GET', body: init.body ? JSON.parse(String(init.body)) : undefined, auth: new Headers(init.headers).get('Authorization')});
    return answer();
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = original;
});

/** Every new client: success, a 4xx with the API text, a closed 503, an HTML 503 and a drifted body. */
async function matrix(name: string, run: () => Promise<unknown>, ok: unknown, drift: unknown) {
  answer = json(ok);
  assert.ok((await run()) !== undefined, name + ' ok');
  answer = json({error: 'Bilgileri kontrol edin.'}, 400);
  await assert.rejects(run(), (e: unknown) => e instanceof ApiError && e.status === 400 && e.message === 'Bilgileri kontrol edin.', name + ' 400');
  answer = json({error: 'Veri talepleri henüz kullanıma açılmadı.'}, 503);
  await assert.rejects(run(), (e: unknown) => e instanceof ApiError && e.closed, name + ' 503');
  answer = () => new Response('<html>bakım</html>', {status: 503, headers: {'Content-Type': 'text/html'}});
  await assert.rejects(run(), (e: unknown) => e instanceof ApiError && e.status === 503 && e.message === 'Bu özellik henüz etkin değil.', name + ' HTML 503');
  answer = () => new Response('', {status: 401});
  await assert.rejects(run(), (e: unknown) => e instanceof ApiError && e.status === 401, name + ' 401');
  answer = json(drift);
  await assert.rejects(run(), (e: unknown) => e instanceof ApiError && e.status === 200, name + ' drift');
}

const prefs = {version: 3, requestUpdates: {inApp: true, push: false, email: false}, reminderEmail: true, productNews: {enabled: false, consentAtMs: null, source: null, textVersion: null}, delivery: {requestUpdatesPush: 'not_enabled', requestUpdatesEmail: 'not_enabled', productNews: 'not_enabled'}, updatedAtMs: null};

test('preferences (web-09): read, change, product news adds the consent text version', async () => {
  await matrix('preferences', () => preferencesApi.read(token), prefs, {...prefs, requestUpdates: {inApp: false, push: false, email: false}});
  answer = json({...prefs, version: 4, productNews: {enabled: true, consentAtMs: 1, source: 'web', textVersion: PRODUCT_NEWS_TEXT_VERSION}});
  const next = await preferencesApi.change(token, 3, {productNews: true});
  assert.equal(next.productNews.enabled, true);
  assert.deepEqual(seen.at(-1), {url: 'https://api.example.test/api/me/preferences', method: 'PATCH', body: {expectedVersion: 3, changes: {productNews: true, productNewsTextVersion: PRODUCT_NEWS_TEXT_VERSION}}, auth: 'Bearer tok'});
  await preferencesApi.change(token, 4, {productNews: false});
  assert.deepEqual((seen.at(-1)!.body as {changes: unknown}).changes, {productNews: false}, 'turning off needs no text version');
});

const list = {id: U(1), name: 'Kış bakımı', kind: 'list', businessIds: ['b1'], unavailableIds: [], version: 1, createdAtMs: 1, updatedAtMs: 2};
test('lists (web-13): read, create with operationId, change, delete (204)', async () => {
  await matrix('lists', () => listsApi.read(token), {items: [list]}, {items: [{...list, kind: 'folder'}]});
  answer = json(list, 201);
  await listsApi.create(token, {name: 'Kış bakımı', kind: 'list', businessIds: []}, U(9));
  assert.deepEqual(seen.at(-1)!.body, {name: 'Kış bakımı', kind: 'list', businessIds: [], operationId: U(9)});
  answer = json({...list, version: 2, businessIds: ['b1', 'b2']});
  assert.equal((await listsApi.change(token, {id: U(1), expectedVersion: 1, add: ['b2']})).version, 2);
  answer = () => new Response(null, {status: 204});
  assert.equal(await listsApi.remove(token, U(1)), null);
  assert.equal(seen.at(-1)!.url, `https://api.example.test/api/me/lists?id=${U(1)}`);
});

const exportItem = {id: U(2), status: 'submitted', version: 1, reason: null, createdAtMs: 1, updatedAtMs: 1};
test('data exports (web-10): manual preparation only; 428 and 409 surface as statuses', async () => {
  await matrix('exports', () => exportsApi.read(token), {items: [exportItem], preparation: 'manual'}, {items: [exportItem], preparation: 'automatic'});
  answer = json({error: 'Yeniden giriş gerekli.'}, 428);
  await assert.rejects(exportsApi.create(token, U(3)), (e: unknown) => e instanceof ApiError && e.status === 428);
  answer = json({request: exportItem, preparation: 'manual'}, 202);
  assert.equal((await exportsApi.create(token, U(3))).request.status, 'submitted');
  answer = json({request: {...exportItem, status: 'cancelled', version: 2}});
  await exportsApi.cancel(token, exportItem as never);
  assert.deepEqual(seen.at(-1)!.body, {id: U(2), expectedVersion: 1, action: 'cancel'});
});

test('coverage waitlist (web-12): join, read, leave', async () => {
  await matrix('waitlist', () => waitlistApi.read(token), {items: [{city: 'Bayburt', createdAtMs: 1}]}, {items: [{city: 7}]});
  answer = json({city: 'Bayburt', createdAtMs: 1}, 201);
  await waitlistApi.join(token, 'Bayburt');
  answer = () => new Response(null, {status: 204});
  await waitlistApi.leave(token, 'Bayburt');
  assert.equal(seen.at(-1)!.url, 'https://api.example.test/api/coverage/waitlist?city=Bayburt');
});

test('request messages and availability (web-15)', async () => {
  const message = {id: 'm1', author: 'business', text: 'Merhaba', createdAtMs: 1};
  await matrix('messages', () => messagesApi.read(token, 'r1'), {items: [message], next: null}, {items: [{...message, author: 'admin'}], next: null});
  answer = json(message, 201);
  await messagesApi.send(token, 'r1', 'Merhaba', U(4));
  assert.deepEqual(seen.at(-1)!.body, {id: 'r1', text: 'Merhaba', operationId: U(4)});
  await matrix('availability', () => availabilityApi.read('biz-1', '2026-11-12'), {timezone: 'Europe/Istanbul', slotMinutes: 60, days: [{date: '2026-11-12', slots: ['09:00', '10:00']}]}, {timezone: 'Europe/Istanbul', slotMinutes: 60, days: [{date: '2026-11-12', slots: ['09:30']}]});
  assert.equal(seen.at(-1)!.auth, null, 'availability is public');
  answer = json({timezone: 'Europe/Istanbul', slotMinutes: null, days: []});
  assert.equal((await availabilityApi.read('biz-1', '2026-11-12')).slotMinutes, null);
});

test('offer lines (portal-05): total must equal the lines; otherwise ignored', () => {
  const ok = offerExtras({text: 'x', price: 150, expiresAtMs: 1, lines: [{kind: 'labour', label: 'İşçilik', amountMinor: 10000}, {kind: 'parts', label: 'Balata', amountMinor: 5000}], totalMinor: 15000, currency: 'TRY', mayChangeAfterInspection: true});
  assert.equal(ok?.lines?.length, 2);
  assert.equal(offerExtras({lines: [{kind: 'labour', label: 'x', amountMinor: 100}], totalMinor: 999}), null);
  assert.deepEqual(offerExtras({text: 'eski teklif', price: 100, expiresAtMs: 1}), {text: 'eski teklif', price: 100, expiresAtMs: 1});
});

test('admin (web-16, web-04, web-10): overview, read-only flags, reports and export queue', async () => {
  await matrix('overview', () => adminApi.overview(token), {queues: {claims: 2, businessReports: 1}, generatedAtMs: 1}, {queues: {claims: -1}, generatedAtMs: 1});
  await matrix('flags', () => adminApi.flags(token), {flags: [{name: 'PUSH_DELIVERY_ENABLED', key: 'push_delivery', enabled: false, source: 'env'}], workers: [], pushDriver: 'log', writable: false}, {flags: [], workers: [], writable: true});
  const report = {id: U(5), businessId: 'b1', businessName: 'Sentetik', reason: 'phone', note: '', status: 'submitted', version: 1, resolution: null, createdAtMs: 1, updatedAtMs: 1};
  await matrix('reports', () => adminApi.reports(token, 'submitted'), {items: [report], next: null}, {items: [{...report, reason: 'rude'}], next: null});
  answer = json({ok: true});
  await adminApi.decideReport(token, {id: U(5), expectedVersion: 1, decision: 'resolved', resolution: 'Telefon güncellendi.'});
  assert.equal(seen.at(-1)!.method, 'PATCH');
  const exp = {id: U(6), ownerUid: 'u1', status: 'submitted', version: 1, reason: null, createdAtMs: 1, updatedAtMs: 1};
  await matrix('admin exports', () => adminApi.exports(token, 'submitted'), {items: [exp], next: null}, {items: [{...exp, ownerUid: ''}], next: null});
  assert.match(seen.at(-1)!.url, /\/api\/admin\/privacy\?kind=export&status=submitted$/);
  answer = json({request: exp});
  await adminApi.decideExport(token, {requestId: U(6), expectedVersion: 1, action: 'start'});
  assert.deepEqual(seen.at(-1)!.body, {kind: 'export', requestId: U(6), expectedVersion: 1, action: 'start'});
});

test('search v2 page: sort and cursor fields, reviewSummary always, hours with a 24:00 close', () => {
  const item = {id: 'v2a', name: 'Usta Oto', city: 'İstanbul', district: 'Kadıköy', address: 'Örnek Sokak No 1 Kadıköy', categories: ['mechanical'], services: [], brands: [], coordinateStatus: 'unverified', ownership: 'verified', features: {quotes: false, appointments: false}, ownerReady: false, published: true,
    reviewSummary: {count: 0, average: null}, openingHours: {timezone: 'Europe/Istanbul', week: [{day: 6, intervals: [{open: '18:00', close: '24:00'}]}], exceptions: [], updatedAtMs: 1}};
  const page = decodeSearchPage({items: [item], districts: [], sponsored: [], mode: 'live', sort: 'rating', nextCursor: 'abc_DEF.1', total: null}, 'live');
  assert.equal(page.items.length, 1);
  assert.deepEqual(page.extras.v2a?.reviewSummary, {count: 0, average: null});
  assert.ok(page.extras.v2a?.openingHours);
  assert.equal(page.nextCursor, 'abc_DEF.1');
  assert.equal(page.total, null);
  assert.equal(openingHoursSchema.safeParse({timezone: 'Europe/Istanbul', week: [{day: 1, intervals: [{open: '09:00', close: '24:30'}]}]}).success, false);
});

test('profile read falls back to the v1 shape when the API does not know v=2 yet', async () => {
  const {readBusiness} = await import('../app/lib/server-read');
  const item = {id: 'p1', name: 'Usta Oto', city: 'İstanbul', district: 'Kadıköy', address: 'Örnek Sokak No 1 Kadıköy', categories: ['mechanical'], services: [], brands: [], coordinateStatus: 'unverified', ownership: 'unclaimed', features: {quotes: false, appointments: false}, ownerReady: false, published: true};
  const answers = [json({error: 'Geçersiz istek.'}, 400), json(item)];
  answer = () => answers.shift()!();
  const read = await readBusiness('p1', 'tr');
  assert.equal(read.status, 'found');
  assert.deepEqual(seen.map(s => s.url), ['https://api.example.test/api/businesses/p1?v=2', 'https://api.example.test/api/businesses/p1']);
  answer = json({...item, reviewSummary: {count: 2, average: 4.5}});
  const v2 = await readBusiness('p1', 'tr');
  assert.equal(v2.status === 'found' && v2.extras.reviewSummary?.count, 2);
});
