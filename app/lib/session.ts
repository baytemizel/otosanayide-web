import {z} from 'zod';

/** The surface call sites used from firebase/auth's User. */
export type SessionUser = {
  readonly uid: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
  getIdToken(forceRefresh?: boolean): Promise<string>;
};

export type LoginResult = {status: 'signedIn'; user: SessionUser} | {status: 'mfaRequired'; challenge: string};
export type SessionListener = (user: SessionUser | null) => void;

type LockManagerLike = {request<T>(name: string, callback: () => Promise<T>): Promise<T>};
type ChannelLike = {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: {data: unknown}) => void): void;
  close?(): void;
};

export type SessionDeps = {
  /** Sends one request to an /api/auth/* path. */
  request: (path: string, init: RequestInit) => Promise<Response>;
  now?: () => number;
  locks?: LockManagerLike | null;
  channel?: ChannelLike | null;
};

export class SessionRequestError extends Error {
  constructor(public status: number) {
    super('session_request:' + status);
  }
}

const identity = z.object({uid: z.string().min(1), email: z.string().nullable().optional(), emailVerified: z.boolean()});
const sessionSchema = z.object({accessToken: z.string().min(1), expiresIn: z.number().int().positive(), user: identity});
const mfaSchema = z.object({mfaRequired: z.literal(true), challenge: z.string().min(1)});
const shared = z.object({accessToken: z.string().min(1), expiresAt: z.number().int().positive(), user: identity});
const message = z.discriminatedUnion('type', [
  z.object({type: z.literal('session'), session: shared}),
  z.object({type: z.literal('signedOut')}),
]);

type Shared = z.infer<typeof shared>;
type Identity = z.infer<typeof identity>;

const LOCK = 'otosanayide-auth-refresh';
const EXPIRY_MARGIN_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Access tokens live only in this closure. The API revokes a whole session family when a
 * rotated refresh token is presented again, so a refresh is single-flight in the tab, runs
 * under a Web Lock across tabs, and its result is shared over BroadcastChannel.
 */
export function createSessionService(deps: SessionDeps) {
  const now = deps.now ?? Date.now;
  const listeners = new Set<SessionListener>();
  let accessToken = '';
  let expiresAt = 0;
  let user: SessionUser | null = null;
  let mutable: {email: string | null; emailVerified: boolean} | null = null;
  let initialized = false;
  let starting: Promise<void> | null = null;
  let inflight: Promise<string | null> | null = null;
  /** Bumped whenever the signed-in identity changes; stale responses are discarded. */
  let epoch = 0;
  /** Bumped whenever tokens arrive from elsewhere; lets a lock waiter skip its refresh. */
  let received = 0;

  const withLock = <T>(task: () => Promise<T>) => (deps.locks ? deps.locks.request(LOCK, task) : task());
  const valid = () => !!accessToken && now() < expiresAt - EXPIRY_MARGIN_MS;
  const emit = () => {
    for (const listener of [...listeners]) listener(user);
  };
  const publish = (value: z.infer<typeof message>) => {
    try {
      deps.channel?.postMessage(value);
    } catch {
      /* A closed channel must not break the session in this tab. */
    }
  };

  function makeUser(uid: string, details: {email: string | null; emailVerified: boolean}): SessionUser {
    mutable = details;
    const created: SessionUser = {
      uid,
      get email() {
        return details.email;
      },
      get emailVerified() {
        return details.emailVerified;
      },
      async getIdToken(forceRefresh = false) {
        if (user !== created) throw new Error('session_changed');
        if (!forceRefresh && valid()) return accessToken;
        const token = await refresh();
        if (user !== created || !token) throw new Error('session_changed');
        return token;
      },
    };
    return created;
  }

  /** Same uid keeps the object and stays silent, as firebase did on token refresh. */
  function adopt(session: Shared) {
    const details = {email: session.user.email ?? null, emailVerified: session.user.emailVerified};
    accessToken = session.accessToken;
    expiresAt = session.expiresAt;
    if (user && user.uid === session.user.uid && mutable) {
      Object.assign(mutable, details);
      return;
    }
    epoch++;
    user = makeUser(session.user.uid, details);
    if (initialized) emit();
  }

  function clear() {
    accessToken = '';
    expiresAt = 0;
    if (!user) return;
    epoch++;
    user = null;
    mutable = null;
    if (initialized) emit();
  }

  deps.channel?.addEventListener('message', event => {
    const parsed = message.safeParse(event.data);
    if (!parsed.success) return;
    if (parsed.data.type === 'signedOut') {
      received++;
      epoch++;
      clear();
      return;
    }
    received++;
    adopt(parsed.data.session);
  });

  async function post(path: string, body?: unknown, bearer?: string) {
    const headers: Record<string, string> = {Accept: 'application/json'};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (bearer) headers.Authorization = 'Bearer ' + bearer;
    return deps.request(path, {
      method: 'POST',
      headers,
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    });
  }

  function accept(raw: unknown) {
    const parsed = sessionSchema.parse(raw);
    const session: Shared = {accessToken: parsed.accessToken, expiresAt: now() + parsed.expiresIn * 1000, user: parsed.user};
    adopt(session);
    publish({type: 'session', session});
  }

  function refresh(): Promise<string | null> {
    if (inflight) return inflight;
    const startEpoch = epoch;
    const startReceived = received;
    const attempt: Promise<string | null> = withLock(async () => {
      if (epoch !== startEpoch) return valid() ? accessToken : null;
      if (received !== startReceived && valid()) return accessToken;
      const response = await post('/api/auth/refresh');
      // The other tabs learn of a dead session on their own next refresh. Broadcasting
      // here could sign out a tab that has just logged in with a newer cookie.
      if (epoch !== startEpoch) return valid() ? accessToken : null;
      if (response.status === 401) {
        clear();
        return null;
      }
      if (!response.ok) throw new SessionRequestError(response.status);
      accept(await response.json());
      return accessToken;
    }).finally(() => {
      if (inflight === attempt) inflight = null;
    });
    inflight = attempt;
    return attempt;
  }

  async function bootstrap() {
    try {
      await refresh();
    } catch {
      /* No session is the normal signed-out state, never an error on screen. */
    }
    initialized = true;
    emit();
  }

  async function ensureOk(response: Response) {
    if (!response.ok) throw new SessionRequestError(response.status);
    return response;
  }

  return {
    /** Restores the session once; subscribers hear the first state when it settles. */
    start() {
      starting ??= bootstrap();
      return starting;
    },
    /** Fires once with the settled state, then on each identity change. */
    subscribe(listener: SessionListener) {
      listeners.add(listener);
      if (initialized) queueMicrotask(() => listeners.has(listener) && listener(user));
      return () => {
        listeners.delete(listener);
      };
    },
    currentUser: () => user,
    /** After a 401: another caller may already have renewed the token this one used. */
    async renew(usedToken: string) {
      if (accessToken && accessToken !== usedToken && valid()) return accessToken;
      if (!user) return null;
      return refresh();
    },
    async login(email: string, password: string): Promise<LoginResult> {
      return withLock(async () => {
        const response = await ensureOk(await post('/api/auth/login', {email, password}));
        const raw = await response.json();
        const mfa = mfaSchema.safeParse(raw);
        if (mfa.success) return {status: 'mfaRequired' as const, challenge: mfa.data.challenge};
        accept(raw);
        return {status: 'signedIn' as const, user: user!};
      });
    },
    async verifyMfa(challenge: string, code: string) {
      return withLock(async () => {
        const response = await ensureOk(await post('/api/auth/mfa/verify', {challenge, code}));
        accept(await response.json());
        return user!;
      });
    },
    async register(email: string, password: string) {
      await ensureOk(await post('/api/auth/register', {email, password}));
    },
    /** Memory and state first: a network failure must never keep the user signed in. */
    async logout() {
      epoch++;
      received++;
      clear();
      publish({type: 'signedOut'});
      try {
        await withLock(() => post('/api/auth/logout'));
      } catch {
        /* The cookie expires server-side; signing out locally has already happened. */
      }
    },
    async resendVerification() {
      const token = await user?.getIdToken();
      if (!token) throw new SessionRequestError(401);
      await ensureOk(await post('/api/auth/email/resend', undefined, token));
    },
    async verifyEmail(token: string) {
      await ensureOk(await post('/api/auth/email/verify', {token}));
    },
    async forgotPassword(email: string) {
      await ensureOk(await post('/api/auth/password/forgot', {email}));
    },
    async resetPassword(token: string, password: string) {
      await ensureOk(await post('/api/auth/password/reset', {token, password}));
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
export type {Identity};
