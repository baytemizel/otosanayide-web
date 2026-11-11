import assert from 'node:assert/strict';
import test from 'node:test';
import {createSessionService, SessionRequestError, type SessionDeps} from '../app/lib/session';

const session = (token: string, uid = 'u1', expiresIn = 900) => ({accessToken: token, expiresIn, user: {uid, email: uid + '@example.test', emailVerified: true}});
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {status, headers: {'Content-Type': 'application/json'}});

/** A browser origin: one cookie jar's worth of behaviour and shared lock/channel between tabs. */
function browser() {
  let queue: Promise<unknown> = Promise.resolve();
  const channels = new Set<{id: number; on: (data: unknown) => void}>();
  let nextId = 0;
  const locks = {
    request<T>(_: string, callback: () => Promise<T>) {
      const run = queue.then(callback, callback);
      queue = run.catch(() => undefined);
      return run;
    },
  };
  const channel = () => {
    const self = {id: nextId++, on: (_: unknown) => {}};
    channels.add(self);
    return {
      postMessage(message: unknown) {
        for (const other of channels) if (other.id !== self.id) other.on(structuredClone(message));
      },
      addEventListener(_: 'message', listener: (event: {data: unknown}) => void) {
        self.on = data => listener({data});
      },
    };
  };
  return {locks, channel};
}

type Handler = (path: string, init: RequestInit) => Promise<Response> | Response;

function tab(handler: Handler, extra: Partial<SessionDeps> = {}) {
  const calls: string[] = [];
  const service = createSessionService({
    request: async (path, init) => {
      calls.push(path);
      return handler(path, init);
    },
    locks: null,
    channel: null,
    ...extra,
  });
  return {service, calls};
}

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => (resolve = r));
  return {promise, resolve};
};
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('startup restores the session from the refresh cookie and notifies once', async () => {
  const {service, calls} = tab(() => json(session('t1')));
  const seen: Array<string | null> = [];
  service.subscribe(user => seen.push(user?.uid ?? null));
  await service.start();
  assert.deepEqual(calls, ['/api/auth/refresh']);
  assert.deepEqual(seen, ['u1']);
  assert.equal(await service.currentUser()!.getIdToken(), 't1');
});

test('startup without a session is a quiet signed-out state', async () => {
  const {service} = tab(() => json({error: 'Oturum geçersiz'}, 401));
  const seen: Array<string | null> = [];
  service.subscribe(user => seen.push(user?.uid ?? null));
  await service.start();
  assert.deepEqual(seen, [null]);
});

test('a network failure at startup is also a quiet signed-out state', async () => {
  const {service} = tab(() => {
    throw new TypeError('network');
  });
  const seen: Array<string | null> = [];
  service.subscribe(user => seen.push(user?.uid ?? null));
  await service.start();
  assert.deepEqual(seen, [null]);
});

test('concurrent token requests share one refresh in a tab', async () => {
  let clock = 1_000_000;
  let count = 0;
  const gate = deferred<void>();
  const {service, calls} = tab(
    async () => {
      count++;
      if (count === 2) await gate.promise;
      return json(session('t' + count, 'u1', 1));
    },
    {now: () => clock},
  );
  await service.start();
  clock += 5_000;
  const user = service.currentUser()!;
  const all = Promise.all([user.getIdToken(), user.getIdToken(), user.getIdToken()]);
  await tick();
  gate.resolve();
  assert.deepEqual(await all, ['t2', 't2', 't2']);
  assert.equal(calls.length, 2);
});

test('an expired token is renewed; a valid one is reused without a request', async () => {
  let clock = 1_000_000;
  let count = 0;
  const {service, calls} = tab(() => json(session('t' + ++count, 'u1', 900)), {now: () => clock});
  await service.start();
  const user = service.currentUser()!;
  assert.equal(await user.getIdToken(), 't1');
  assert.equal(calls.length, 1);
  clock += 880_000;
  assert.equal(await user.getIdToken(), 't2');
  assert.equal(calls.length, 2);
});

test('token renewal keeps the same user object and does not fire listeners', async () => {
  let clock = 1_000_000;
  let count = 0;
  const {service} = tab(() => json(session('t' + ++count, 'u1', 900)), {now: () => clock});
  const seen: unknown[] = [];
  service.subscribe(user => seen.push(user));
  await service.start();
  const first = service.currentUser();
  clock += 880_000;
  await first!.getIdToken();
  assert.equal(service.currentUser(), first);
  assert.equal(seen.length, 1);
});

test('two tabs starting together rotate the refresh token once', async () => {
  const shared = browser();
  let requests = 0;
  const handler: Handler = async () => {
    requests++;
    await tick();
    return json(session('t' + requests));
  };
  const a = tab(handler, {locks: shared.locks, channel: shared.channel()});
  const b = tab(handler, {locks: shared.locks, channel: shared.channel()});
  await Promise.all([a.service.start(), b.service.start()]);
  assert.equal(requests, 1, 'the second tab must use the broadcast token instead of rotating again');
  assert.equal(await a.service.currentUser()!.getIdToken(), 't1');
  assert.equal(await b.service.currentUser()!.getIdToken(), 't1');
});

test('sign-in in one tab reaches the other through the session fence', async () => {
  const shared = browser();
  const a = tab(path => (path === '/api/auth/login' ? json(session('login')) : json({}, 401)), {locks: shared.locks, channel: shared.channel()});
  const b = tab(() => json({}, 401), {locks: shared.locks, channel: shared.channel()});
  const seen: Array<string | null> = [];
  b.service.subscribe(user => seen.push(user?.uid ?? null));
  await Promise.all([a.service.start(), b.service.start()]);
  await a.service.login('u1@example.test', 'correct-horse-battery');
  assert.deepEqual(seen, [null, 'u1']);
  assert.equal(await b.service.currentUser()!.getIdToken(), 'login');
});

test('logging out in one tab signs the other out without a refresh', async () => {
  const shared = browser();
  const handler: Handler = path => (path === '/api/auth/refresh' ? json(session('t1')) : new Response(null, {status: 204}));
  const a = tab(handler, {locks: shared.locks, channel: shared.channel()});
  const b = tab(handler, {locks: shared.locks, channel: shared.channel()});
  await Promise.all([a.service.start(), b.service.start()]);
  const stale = b.service.currentUser()!;
  await a.service.logout();
  assert.equal(b.service.currentUser(), null);
  await assert.rejects(stale.getIdToken(), /session_changed/);
});

test('logout clears state before the request and survives a network failure', async () => {
  let userDuringRequest: unknown = 'unset';
  const holder: {service?: ReturnType<typeof createSessionService>} = {};
  const created = tab(path => {
    if (path === '/api/auth/logout') {
      userDuringRequest = holder.service!.currentUser();
      throw new TypeError('network');
    }
    return json(session('t1'));
  });
  holder.service = created.service;
  await created.service.start();
  const stale = created.service.currentUser()!;
  await created.service.logout();
  assert.equal(userDuringRequest, null);
  assert.equal(created.service.currentUser(), null);
  await assert.rejects(stale.getIdToken(), /session_changed/);
  assert.equal(created.calls.at(-1), '/api/auth/logout');
});

test('a refresh response arriving after logout cannot restore the session', async () => {
  const gate = deferred<void>();
  let count = 0;
  let clock = 1_000_000;
  const {service} = tab(
    async path => {
      if (path === '/api/auth/logout') return new Response(null, {status: 204});
      count++;
      if (count === 2) await gate.promise;
      return json(session('t' + count, 'u1', 1));
    },
    {now: () => clock},
  );
  await service.start();
  clock += 5_000;
  const pending = service.currentUser()!.getIdToken();
  await tick();
  await service.logout();
  gate.resolve();
  await assert.rejects(pending, /session_changed/);
  assert.equal(service.currentUser(), null);
});

test('a rejected refresh ends the session and tells listeners', async () => {
  let clock = 1_000_000;
  let count = 0;
  const {service} = tab(() => (++count === 1 ? json(session('t1', 'u1', 1)) : json({error: 'x'}, 401)), {now: () => clock});
  const seen: Array<string | null> = [];
  service.subscribe(user => seen.push(user?.uid ?? null));
  await service.start();
  clock += 5_000;
  await assert.rejects(service.currentUser()!.getIdToken());
  assert.deepEqual(seen, ['u1', null]);
});

test('a temporary refresh outage keeps the user signed in', async () => {
  let clock = 1_000_000;
  let count = 0;
  const {service} = tab(() => (++count === 1 ? json(session('t1', 'u1', 1)) : json({error: 'x'}, 503)), {now: () => clock});
  await service.start();
  clock += 5_000;
  await assert.rejects(service.currentUser()!.getIdToken());
  assert.equal(service.currentUser()?.uid, 'u1');
});

test('renew after 401 reuses a token another caller already renewed', async () => {
  let count = 0;
  const {service, calls} = tab(() => json(session('t' + ++count)));
  await service.start();
  assert.equal(await service.renew('old-token'), 't1');
  assert.equal(calls.length, 1);
  assert.equal(await service.renew('t1'), 't2');
  assert.equal(calls.length, 2);
});

test('login with MFA returns the challenge and establishes nothing until verified', async () => {
  const {service} = tab(path => {
    if (path === '/api/auth/login') return json({mfaRequired: true, challenge: 'c1'});
    if (path === '/api/auth/mfa/verify') return json(session('mfa'));
    return json({}, 401);
  });
  await service.start();
  assert.deepEqual(await service.login('a@example.test', 'correct-horse-battery'), {status: 'mfaRequired', challenge: 'c1'});
  assert.equal(service.currentUser(), null);
  assert.equal((await service.verifyMfa('c1', '123456')).uid, 'u1');
});

test('malformed broadcast messages are ignored', async () => {
  const shared = browser();
  const sender = shared.channel();
  const {service} = tab(() => json({}, 401), {locks: shared.locks, channel: shared.channel()});
  await service.start();
  sender.postMessage({type: 'session', session: {accessToken: 1}});
  sender.postMessage('nonsense');
  assert.equal(service.currentUser(), null);
});

const bodyOf = (init: RequestInit) => (init.body ? JSON.parse(String(init.body)) : undefined);
const bearerOf = (init: RequestInit) => new Headers(init.headers).get('Authorization');

test('TOTP enroll, confirm and disable send the current bearer token and parse the enrollment', async () => {
  const seen: Array<{path: string; bearer: string | null; body: unknown}> = [];
  const {service} = tab((path, init) => {
    seen.push({path, bearer: bearerOf(init), body: bodyOf(init)});
    if (path === '/api/auth/refresh') return json(session('t1'));
    if (path === '/api/auth/mfa/totp/enroll') return json({secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Otosanayide%3Au1?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'}, 201);
    return json({ok: true});
  });
  await service.start();
  const enrollment = await service.enrollTotp();
  assert.equal(enrollment.secret, 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');
  await service.confirmTotp('123456');
  await service.disableTotp('654321');
  assert.deepEqual(seen.slice(1).map(c => [c.path, c.bearer, c.body]), [
    ['/api/auth/mfa/totp/enroll', 'Bearer t1', undefined],
    ['/api/auth/mfa/totp/confirm', 'Bearer t1', {code: '123456'}],
    ['/api/auth/mfa/totp/disable', 'Bearer t1', {code: '654321'}],
  ]);
});

test('an enrollment that is not an otpauth TOTP URI is rejected', async () => {
  const {service} = tab(path => (path === '/api/auth/refresh' ? json(session('t1')) : json({secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'https://evil.example/'}, 201)));
  await service.start();
  await assert.rejects(service.enrollTotp());
});

test('an already enabled factor surfaces as status 409 for the screen to read', async () => {
  const {service} = tab(path => (path === '/api/auth/refresh' ? json(session('t1')) : json({error: 'İki adımlı doğrulama zaten etkin.'}, 409)));
  await service.start();
  await assert.rejects(service.enrollTotp(), (e: unknown) => e instanceof SessionRequestError && e.status === 409);
});

test('signed-in auth calls without a session fail as 401 and send nothing', async () => {
  const {service, calls} = tab(() => json({error: 'x'}, 401));
  await service.start();
  await assert.rejects(service.resendVerification(), (e: unknown) => e instanceof SessionRequestError && e.status === 401);
  await assert.rejects(service.enrollTotp(), (e: unknown) => e instanceof SessionRequestError && e.status === 401);
  assert.deepEqual(calls, ['/api/auth/refresh']);
});

test('reloadIdentity updates emailVerified on the same user object without notifying listeners', async () => {
  let verified = false;
  const {service} = tab(() => json({...session(verified ? 't2' : 't1'), user: {uid: 'u1', email: 'u1@example.test', emailVerified: verified}}));
  const seen: Array<string | null> = [];
  service.subscribe(user => seen.push(user?.uid ?? null));
  await service.start();
  const user = service.currentUser()!;
  assert.equal(user.emailVerified, false);
  verified = true;
  await service.reloadIdentity();
  assert.equal(service.currentUser(), user);
  assert.equal(user.emailVerified, true);
  assert.deepEqual(seen, ['u1']);
});

test('reloadIdentity without a session sends nothing', async () => {
  const {service, calls} = tab(() => json({error: 'x'}, 401));
  await service.start();
  assert.equal(await service.reloadIdentity(), null);
  assert.deepEqual(calls, ['/api/auth/refresh']);
});

test('password change adopts the new session and broadcasts it to other tabs', async () => {
  const shared = browser();
  const a = tab((path, init) => {
    if (path === '/api/auth/refresh') return json(session('t1'));
    assert.deepEqual(bodyOf(init), {currentPassword: 'old-password', newPassword: 'new-password-1'});
    assert.equal(bearerOf(init), 'Bearer t1');
    return json(session('t9'));
  }, {locks: shared.locks, channel: shared.channel()});
  const b = tab(() => json(session('t1')), {locks: shared.locks, channel: shared.channel()});
  await a.service.start();
  await b.service.start();
  await a.service.changePassword('old-password', 'new-password-1');
  assert.equal(await a.service.currentUser()!.getIdToken(), 't9');
  assert.equal(await b.service.currentUser()!.getIdToken(), 't9');
});

test('password change with an expired token renews first instead of deadlocking on the lock', async () => {
  let now = 0;
  const shared = browser();
  const calls: string[] = [];
  const {service} = tab(path => {
    calls.push(path);
    if (path === '/api/auth/refresh') return json(session(calls.length === 1 ? 't1' : 't2', 'u1', 60));
    return json(session('t3'));
  }, {locks: shared.locks, now: () => now});
  await service.start();
  now = 120_000;
  await service.changePassword('old-password', 'new-password-1');
  assert.deepEqual(calls, ['/api/auth/refresh', '/api/auth/refresh', '/api/auth/password/change']);
  assert.equal(await service.currentUser()!.getIdToken(), 't3');
});

test('a failed password change keeps the current session', async () => {
  const {service} = tab(path => (path === '/api/auth/refresh' ? json(session('t1')) : json({error: 'x'}, 401)));
  await service.start();
  await assert.rejects(service.changePassword('wrong', 'new-password-1'), (e: unknown) => e instanceof SessionRequestError && e.status === 401);
  assert.equal(await service.currentUser()!.getIdToken(), 't1');
});

test('email change and MFA status call their proposed endpoints with the bearer token', async () => {
  const seen: Array<[string, string | undefined, string | null]> = [];
  const {service} = tab((path, init) => {
    seen.push([path, init.method, bearerOf(init)]);
    if (path === '/api/auth/refresh') return json(session('t1'));
    if (path === '/api/auth/mfa') return json({totp: {enabled: true, enabledAtMs: 1}});
    return json({ok: true}, 202);
  });
  await service.start();
  await service.changeEmail('new@example.test', 'password-123');
  assert.deepEqual(await service.mfaStatus(), {totp: {enabled: true, enabledAtMs: 1}});
  assert.deepEqual(seen.slice(1), [['/api/auth/email/change', 'POST', 'Bearer t1'], ['/api/auth/mfa', 'GET', 'Bearer t1']]);
});
