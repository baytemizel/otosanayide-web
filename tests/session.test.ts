import assert from 'node:assert/strict';
import test from 'node:test';
import {createSessionService, type SessionDeps} from '../app/lib/session';

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
