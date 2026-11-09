import assert from 'node:assert/strict';
import {afterEach, beforeEach, test} from 'node:test';
import {apiFetch, apiOrigin, apiUrl, assertApiConfiguration, credentialsFor, setApiLocale, setApiSessionHook} from '../app/lib/api';
import {configureEnv} from '../app/lib/env';

const origin = 'https://api.example.test';
type Call = {url: string; init: RequestInit};
const original = globalThis.fetch;
let calls: Call[] = [];
let responses: Array<() => Response>;

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  calls = [];
  responses = [];
  configureEnv({appMode: 'live', apiOrigin: origin});
  setApiLocale('tr');
  setApiSessionHook(null);
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({url, init});
    return (responses.shift() ?? (() => new Response('{}', {status: 200})))();
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = original;
});

const headerOf = (call: Call, name: string) => new Headers(call.init.headers).get(name);

test('apiUrl joins the configured origin and refuses other paths', () => {
  assert.equal(apiUrl('/api/search?city=x'), origin + '/api/search?city=x');
  assert.throws(() => apiUrl('/other'));
  assert.throws(() => apiUrl('//evil.example/api/x'));
});

test('live mode without an API origin fails instead of using the same origin', () => {
  configureEnv({appMode: 'live', apiOrigin: ''});
  assert.throws(() => apiUrl('/api/me'), /api_config:missing/);
  assert.throws(() => assertApiConfiguration(), /api_config:missing/);
});

test('an origin with a path is rejected', () => {
  configureEnv({appMode: 'live', apiOrigin: origin + '/v1'});
  assert.throws(() => apiOrigin(), /api_config:invalid/);
});

test('production refuses a non-https origin', () => {
  process.env.NODE_ENV = 'production';
  configureEnv({appMode: 'live', apiOrigin: 'http://api.example.test'});
  assert.throws(() => apiOrigin(), /api_config:insecure/);
});

test('credentials are included only for /api/auth/*', async () => {
  assert.equal(credentialsFor('/api/auth/refresh'), 'include');
  assert.equal(credentialsFor('/api/authority'), 'omit');
  assert.equal(credentialsFor('/api/me'), 'omit');
  await apiFetch('/api/me', {credentials: 'include'});
  assert.equal(calls[0]!.init.credentials, 'omit', 'a caller cannot widen credentials');
  await apiFetch('/api/auth/logout', {method: 'POST'});
  assert.equal(calls[1]!.init.credentials, 'include');
});

test('language travels as Accept-Language unless a caller set it', async () => {
  setApiLocale('en');
  await apiFetch('/api/search');
  assert.equal(headerOf(calls[0]!, 'Accept-Language'), 'en');
  await apiFetch('/api/search', {headers: {'Accept-Language': 'tr'}});
  assert.equal(headerOf(calls[1]!, 'Accept-Language'), 'tr');
});

test('a header the API does not allow is refused before leaving the browser', async () => {
  await assert.rejects(apiFetch('/api/me', {headers: {'X-Custom': '1'}}), /api_config:header/);
  assert.equal(calls.length, 0);
});

test('absolute URLs must point at the API origin', async () => {
  await apiFetch(new URL(origin + '/api/search?q=a'));
  assert.equal(calls[0]!.url, origin + '/api/search?q=a');
  await assert.rejects(apiFetch('https://evil.example/api/search'), /foreign_origin/);
});

test('a GET that gets 401 renews once and is resent with the new token', async () => {
  let renewals = 0;
  setApiSessionHook(async used => {
    renewals++;
    assert.equal(used, 'old');
    return 'new';
  });
  responses = [() => new Response('{}', {status: 401}), () => new Response('{"ok":1}', {status: 200})];
  const response = await apiFetch('/api/me', {headers: {Authorization: 'Bearer old'}});
  assert.equal(response.status, 200);
  assert.equal(renewals, 1);
  assert.equal(calls.length, 2);
  assert.equal(headerOf(calls[1]!, 'Authorization'), 'Bearer new');
});

test('a second 401 is returned without another renewal', async () => {
  let renewals = 0;
  setApiSessionHook(async () => {
    renewals++;
    return 'new';
  });
  responses = [() => new Response('{}', {status: 401}), () => new Response('{}', {status: 401})];
  const response = await apiFetch('/api/me', {headers: {Authorization: 'Bearer old'}});
  assert.equal(response.status, 401);
  assert.equal(renewals, 1);
  assert.equal(calls.length, 2);
});

test('a write that gets 401 renews the token but is never resent', async () => {
  let renewals = 0;
  setApiSessionHook(async () => {
    renewals++;
    return 'new';
  });
  responses = [() => new Response('{}', {status: 401})];
  const response = await apiFetch('/api/me', {method: 'POST', body: '{}', headers: {Authorization: 'Bearer old'}});
  assert.equal(response.status, 401);
  assert.equal(renewals, 1);
  assert.equal(calls.length, 1);
});

test('a 401 without a bearer or on an auth path does not trigger renewal', async () => {
  let renewals = 0;
  setApiSessionHook(async () => {
    renewals++;
    return 'new';
  });
  responses = [() => new Response('{}', {status: 401}), () => new Response('{}', {status: 401})];
  await apiFetch('/api/search');
  await apiFetch('/api/auth/refresh', {method: 'POST', headers: {Authorization: 'Bearer old'}});
  assert.equal(renewals, 0);
});

test('demo mode answers locally and never touches the network', async () => {
  configureEnv({appMode: 'demo', apiOrigin: origin});
  const search = await apiFetch('/api/search?q=&city=İstanbul&district=&category=&service=&brand=&card=false');
  const body = (await search.json()) as {mode: string; items: unknown[]};
  assert.equal(body.mode, 'demo');
  assert.ok(body.items.length > 0);
  assert.equal((await apiFetch('/api/me')).status, 503);
  assert.equal(calls.length, 0);
});
