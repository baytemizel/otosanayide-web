import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';
import {groupSecret, securityErrorMessage} from '../app/lib/account-security';
import {consentCookie, parseConsent, readConsent, serializeConsent} from '../app/lib/consent';
import {configureEnv, origin} from '../app/lib/env';
import {legalPath} from '../app/lib/legal';
import {portalUrl} from '../app/lib/portal';
import {SessionRequestError} from '../app/lib/session';

afterEach(() => {
  configureEnv({});
});

test('origin settings accept only a bare https origin, or http on a local development host', () => {
  assert.equal(origin('https://portal.otosanayide.com'), 'https://portal.otosanayide.com');
  assert.equal(origin('https://portal.otosanayide.com/'), 'https://portal.otosanayide.com');
  assert.equal(origin('http://localhost:3001'), 'http://localhost:3001');
  assert.equal(origin('http://portal.otosanayide.com'), '');
  assert.equal(origin('https://portal.otosanayide.com/giris'), '');
  assert.equal(origin('javascript:alert(1)'), '');
  assert.equal(origin('https://user:pass@portal.otosanayide.com'), '');
  assert.equal(origin(''), '');
});

test('portal links are null while no portal origin is configured', () => {
  configureEnv({portalOrigin: ''});
  assert.equal(portalUrl('login'), null);
  assert.equal(portalUrl('claim', {business: 'abc'}), null);
});

test('portal links use the agreed routes and forward only a well-formed business id', () => {
  configureEnv({portalOrigin: 'https://portal.example.test'});
  assert.equal(portalUrl('login'), 'https://portal.example.test/giris');
  assert.equal(portalUrl('home'), 'https://portal.example.test/');
  assert.equal(portalUrl('newBusiness'), 'https://portal.example.test/basvuru');
  assert.equal(portalUrl('claim', {business: 'biz_1-A'}), 'https://portal.example.test/basvuru?business=biz_1-A');
  assert.equal(portalUrl('claim', {business: '../x?y=1'}), null);
  configureEnv({portalOrigin: 'https://portal.example.test/path'});
  assert.equal(portalUrl('login'), null, 'an origin with a path is refused, not trimmed');
});

test('legal pages have no route unless the flag is on', () => {
  configureEnv({legalPagesEnabled: 'false'});
  assert.equal(legalPath('gizlilik'), null);
  configureEnv({legalPagesEnabled: true});
  assert.equal(legalPath('gizlilik'), '/yasal/gizlilik');
});

test('cookie consent round-trips and defaults to no choice on anything malformed', () => {
  const value = {measurement: true, adMeasurement: false, savedAtMs: 1731300000000};
  assert.equal(serializeConsent(value), '1.1.0.1731300000000');
  assert.deepEqual(parseConsent(serializeConsent(value)), value);
  assert.equal(parseConsent('1.1.0.0'), null);
  assert.equal(parseConsent('2.1.1.1731300000000'), null);
  assert.equal(parseConsent('1.1.1.1731300000000; other=1'), null);
  assert.equal(parseConsent(undefined), null);
  assert.deepEqual(readConsent('a=1; otosanayide-consent=1.0.1.5; b=2'), {measurement: false, adMeasurement: true, savedAtMs: 5});
  assert.equal(readConsent('a=1'), null);
  const cookie = consentCookie(value, true);
  assert.match(cookie, /^otosanayide-consent=1\.1\.0\.1731300000000; Path=\/; Max-Age=15552000; SameSite=Lax; Secure$/);
  assert.doesNotMatch(consentCookie(value, false), /Secure/);
});

test('account security messages follow the API status, never its free text', () => {
  assert.equal(securityErrorMessage(new SessionRequestError(429)), 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.');
  assert.equal(securityErrorMessage(new SessionRequestError(403)), 'Önce e-posta adresini doğrula.');
  assert.equal(securityErrorMessage(new SessionRequestError(404)), 'Bu işlem henüz kullanılamıyor.');
  assert.equal(securityErrorMessage(new Error('boom')), 'İşlem tamamlanamadı. Tekrar dene.');
  assert.equal(groupSecret('JBSWY3DPEHPK3PXP'), 'JBSW Y3DP EHPK 3PXP');
});

test('read-all repeats with the same cutoff while the API reports more, and maps errors', async () => {
  const {readAllNotifications} = await import('../app/lib/notifications-read');
  const bodies: unknown[] = [];
  const answers = [{updated: 1000, more: true}, {updated: 7, more: false}];
  const request = (async (_: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer tok');
    return new Response(JSON.stringify(answers.shift()), {status: 200});
  }) as never;
  assert.equal(await readAllNotifications(async () => 'tok', 1234.5, request), 1007);
  assert.deepEqual(bodies, [{before: 1234}, {before: 1234}]);
  const missing = (async () => new Response('{"error":"x"}', {status: 404})) as never;
  await assert.rejects(readAllNotifications(async () => 'tok', 1, missing), /henüz kullanılamıyor/);
});

test('own review list (web-17) parses pages and maps 404 to "not available yet"', async () => {
  const {fetchOwnReviews} = await import('../app/lib/own-reviews');
  const review = {id: 'r1', text: 'İyi hizmet aldım, teşekkürler.', rating: 5, version: 1, status: 'published', reason: '', resolved: 'yes', wc: 'unknown', canEdit: true, canWithdraw: true};
  const ok = (async (path: string) => {
    assert.equal(path, '/api/reviews/mine/all?after=c1');
    return new Response(JSON.stringify({items: [{businessId: 'b1', businessName: 'Sentetik', review}], next: null}), {status: 200});
  }) as never;
  assert.equal((await fetchOwnReviews(async () => 't', 'c1', ok)).items[0]?.businessId, 'b1');
  await assert.rejects(fetchOwnReviews(async () => 't', '', (async () => new Response('', {status: 404})) as never), /henüz kullanılamıyor/);
  await assert.rejects(fetchOwnReviews(async () => 't', '', (async () => new Response('{"items":"x"}', {status: 200})) as never), /beklenen biçimde/);
});

test('responseJson gives every error a readable message and refuses a non-JSON success', async () => {
  const {responseJson, unreadableAnswer} = await import('../app/lib/response-json');
  assert.deepEqual(await responseJson(new Response('{"items":[]}', {status: 200})), {items: []});
  assert.equal((await responseJson(new Response('<html>502</html>', {status: 502}))).error, 'İşlem tamamlanamadı. Tekrar dene.');
  assert.equal((await responseJson(new Response('', {status: 503}))).error, 'Bu özellik henüz etkin değil.');
  assert.equal((await responseJson(new Response('{"error":"Yorum bulunamadı."}', {status: 404}))).error, 'Yorum bulunamadı.');
  assert.equal((await responseJson(new Response('{}', {status: 403}))).error, 'Bu işlem için yetkiniz yok.');
  await assert.rejects(responseJson(new Response('<html/>', {status: 200})), new RegExp(unreadableAnswer.slice(0, 20)));
});
