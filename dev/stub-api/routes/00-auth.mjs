// /api/auth/* (docs/AUTH_API.md): web channel, refresh token in the otosanayide_refresh cookie.
// v2-04 (docs/v2/04-account.md): register `name` + `consents`, password reset by 6-digit code
// (forgot {method:"code"} → verify-code → reset), GET/PATCH /api/me/profile, and `unreadCount` on
// GET /api/notifications?v=2. Faked: the reset code is always 123456 (nothing is mailed); consents are
// kept on the stub user only.
import {randomBytes} from 'node:crypto';

const ACCESS_SECONDS = 900;
const COOKIE = 'otosanayide_refresh';
const token = () => randomBytes(24).toString('base64url');

export default (api) => {
  const {state} = api;

  function session(reply, user) {
    const access = token();
    const refresh = token();
    state.tokens.set(access, {uid: user.uid, expiresAt: Date.now() + ACCESS_SECONDS * 1000});
    state.refresh.set(refresh, user.uid);
    reply.header('Set-Cookie', `${COOKIE}=${refresh}; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=2592000`);
    return reply.json({accessToken: access, expiresIn: ACCESS_SECONDS, user: {uid: user.uid, email: user.email, emailVerified: user.emailVerified}});
  }
  const byUid = (uid) => [...state.users.values()].find((u) => u.uid === uid);
  const validEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // v2-04 display name: 2–80 characters after trim / single spaces / NFC; starts with a letter.
  const cleanName = (v) => (typeof v === 'string' ? v.trim().replace(/ {2,}/g, ' ').normalize('NFC') : null);
  const validName = (v) => typeof v === 'string' && v.length >= 2 && v.length <= 80 && /^\p{L}[\p{L}\p{M} '.\-]*$/u.test(v);
  const version = (v) => v === undefined || (typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(v));
  const validConsents = (c) => c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length > 0
    && Object.keys(c).every((k) => ['termsVersion', 'kvkkVersion', 'marketing'].includes(k))
    && version(c.termsVersion) && version(c.kvkkVersion) && (c.marketing === undefined || typeof c.marketing === 'boolean');

  api.post('/api/auth/register', ({body}, reply) => {
    if (!validEmail(body?.email) || typeof body?.password !== 'string' || body.password.length < 10) return reply.error(400, 'Bilgileri kontrol edin.');
    const extra = Object.keys(body).filter((k) => !['email', 'password', 'name', 'consents'].includes(k));
    const name = body.name === undefined ? undefined : cleanName(body.name);
    if (extra.length || (name !== undefined && !validName(name)) || (body.consents !== undefined && !validConsents(body.consents))) return reply.error(400, 'Bilgileri kontrol edin.');
    if (!state.users.has(body.email)) {
      // Name and consents only on a new account; an existing address gets the same answer.
      state.users.set(body.email, {uid: 'stub-' + token().slice(0, 12), email: body.email, password: body.password, emailVerified: false,
        displayName: name ?? null, locale: null, consents: body.consents ?? null});
    }
    return reply.json({ok: true}, 202);
  });

  // Second seed member with TOTP on: login answers with a challenge, any code "123456" passes.
  state.users.set('mfa@example.com', {uid: 'stub-user-mfa', email: 'mfa@example.com', password: 'ornek-sifre-123', emailVerified: true, mfa: true});
  const challenges = new Map();

  api.post('/api/auth/login', ({body}, reply) => {
    const user = state.users.get(body?.email);
    if (!user || user.password !== body?.password) return reply.error(401, 'E-posta veya şifre hatalı.');
    if (user.mfa) {
      const challenge = token();
      challenges.set(challenge, user.uid);
      return reply.json({mfaRequired: true, challenge});
    }
    return session(reply, user);
  });

  api.post('/api/auth/mfa/verify', ({body}, reply) => {
    const uid = challenges.get(body?.challenge);
    if (!uid) return reply.error(401, 'Doğrulama süresi doldu. Yeniden giriş yap.');
    if (body?.code !== '123456') return reply.error(400, 'Kod hatalı.');
    challenges.delete(body.challenge);
    return session(reply, byUid(uid));
  });

  api.post('/api/auth/refresh', ({cookies}, reply) => {
    const uid = state.refresh.get(cookies[COOKIE]);
    if (!uid) return reply.error(401, 'Oturum geçersiz veya süresi dolmuş.');
    state.refresh.delete(cookies[COOKIE]);
    return session(reply, byUid(uid));
  });

  api.post('/api/auth/logout', ({cookies}, reply) => {
    state.refresh.delete(cookies[COOKIE]);
    reply.header('Set-Cookie', `${COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=0`);
    return reply.empty(204);
  });

  api.post('/api/auth/email/verify', ({body}, reply) => {
    if (body?.token === 'gecersiz' || typeof body?.token !== 'string') return reply.error(400, 'Bağlantı geçersiz veya süresi dolmuş.');
    return reply.json({ok: true});
  });
  api.post('/api/auth/email/resend', ({req}, reply) => (api.user(req) ? reply.empty(202) : reply.error(401, 'Giriş gerekli.')));
  // Reset: {email} or {method:"link"} as before; {method:"code"} answers the masked address (never a DB lookup).
  const resetCodes = new Map(); // email -> {expiresAt, attempts, sentAt}
  const RESET_CODE = '123456';
  const mask = (email) => email.slice(0, 1) + '***' + email.slice(email.lastIndexOf('@'));
  api.post('/api/auth/password/forgot', ({body}, reply) => {
    if (!validEmail(body?.email) || (body.method !== undefined && !['link', 'code'].includes(body.method))) return reply.error(400, 'Bilgileri kontrol edin.');
    if (body.method !== 'code') return reply.json({ok: true}, 202);
    const email = body.email.trim().toLowerCase();
    const previous = resetCodes.get(email);
    if (previous && Date.now() - previous.sentAt < 60_000) return reply.error(429, 'Çok fazla istek. Biraz sonra tekrar deneyin.');
    if (state.users.has(email)) resetCodes.set(email, {expiresAt: Date.now() + 10 * 60_000, attempts: 0, sentAt: Date.now()});
    else resetCodes.set(email, {expiresAt: 0, attempts: 99, sentAt: Date.now()});
    return reply.json({ok: true, maskedEmail: mask(email)}, 202);
  });
  const resetTokens = new Map(); // token -> {email, expiresAt}
  api.post('/api/auth/password/verify-code', ({body}, reply) => {
    if (!validEmail(body?.email) || typeof body?.code !== 'string' || !/^[0-9]{6}$/.test(body.code)) return reply.error(400, 'Bilgileri kontrol edin.');
    const email = body.email.trim().toLowerCase();
    const entry = resetCodes.get(email);
    const wrong = 'Doğrulama kodu hatalı veya süresi dolmuş.';
    if (!entry || entry.expiresAt < Date.now() || entry.attempts >= 5) return reply.error(400, wrong);
    if (body.code !== RESET_CODE) {
      entry.attempts++;
      return reply.error(400, wrong);
    }
    resetCodes.delete(email);
    const resetToken = token();
    resetTokens.set(resetToken, {email, expiresAt: Date.now() + 15 * 60_000});
    return reply.json({resetToken});
  });
  api.post('/api/auth/password/reset', ({body}, reply) => {
    if (typeof body?.token !== 'string' || body.token === 'gecersiz' || typeof body?.password !== 'string' || body.password.length < 10) return reply.error(400, 'Bağlantı geçersiz veya şifre uygun değil.');
    const coded = resetTokens.get(body.token);
    if (coded) {
      resetTokens.delete(body.token);
      if (coded.expiresAt < Date.now()) return reply.error(400, 'Bağlantı geçersiz veya şifre uygun değil.');
      const user = state.users.get(coded.email);
      if (user) user.password = body.password;
    }
    return reply.json({ok: true});
  });
  api.post('/api/auth/password/change', ({req, body}, reply) => {
    const user = api.user(req);
    if (!user) return reply.error(401, 'Giriş gerekli.');
    if (body?.currentPassword !== user.password) return reply.error(400, 'Şifre veya doğrulama kodu hatalı.');
    user.password = body.newPassword;
    return session(reply, user);
  });
  api.post('/api/auth/email/change', ({req, body}, reply) => {
    const user = api.user(req);
    if (!user) return reply.error(401, 'Giriş gerekli.');
    if (body?.password !== user.password) return reply.error(400, 'Şifre veya doğrulama kodu hatalı.');
    return reply.json({ok: true}, 202);
  });
  api.get('/api/auth/mfa', ({req}, reply) => (api.user(req) ? reply.json({totp: {enabled: false, enabledAtMs: null}}) : reply.error(401, 'Giriş gerekli.')));

  /* ---------------------------------------------------------------- v2-04 profile */
  // Seed members: Deniz has a name, the MFA member has none (the label then falls back to the e-mail).
  const seedName = state.users.get('deniz@example.com');
  if (seedName && seedName.displayName === undefined) Object.assign(seedName, {displayName: 'Deniz Kaya', locale: 'tr'});
  const profileOf = (u) => ({displayName: u.displayName ?? null, locale: u.locale ?? null, email: u.email, emailVerified: u.emailVerified});
  api.get('/api/me/profile', ({req, url}, reply) => {
    if (url.search) return reply.error(400, 'Geçersiz istek.');
    const user = api.user(req);
    if (!user) return reply.error(401, 'Giriş gerekli.');
    return reply.json(profileOf(user));
  });
  api.patch('/api/me/profile', ({req, url, body}, reply) => {
    if (url.search) return reply.error(400, 'Geçersiz istek.');
    if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) return reply.error(415, 'Geçersiz istek.');
    const user = api.user(req);
    if (!user) return reply.error(401, 'Giriş gerekli.');
    const keys = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : null;
    if (!keys || !keys.length || keys.some((k) => !['displayName', 'locale'].includes(k))) return reply.error(400, 'Bilgileri kontrol edin.');
    const name = body.displayName === null || body.displayName === undefined ? body.displayName : cleanName(body.displayName);
    if (name !== null && name !== undefined && !validName(name)) return reply.error(400, 'Bilgileri kontrol edin.');
    if (body.locale !== undefined && body.locale !== null && !['tr', 'en'].includes(body.locale)) return reply.error(400, 'Bilgileri kontrol edin.');
    if (name !== undefined) user.displayName = name;
    if (body.locale !== undefined) user.locale = body.locale;
    return reply.json(profileOf(user));
  });

  /* ---------------------------------------------------------------- v2-04 notifications unreadCount */
  // The notification inbox lives in 40-requests.mjs. With ?v=2 the API adds the inbox's unread count
  // (independent of kind/after); this wraps that handler instead of reaching into its data. Route files
  // load in name order, so 00-auth can wrap registrations made later.
  const register = api.get;
  api.get = (pattern, handler) => register(pattern, pattern === '/api/notifications' ? withUnreadCount(handler) : handler);
  function withUnreadCount(handler) {
    return async (ctx, reply) => {
      await handler(ctx, reply);
      if (ctx.query.get('v') !== '2' || reply.status !== 200) return;
      let unread = 0;
      let after = '';
      for (let page = 0; page < 100; page++) {
        const probe = {status: 200, body: null, headers: {}, json(b, s = 200) { this.status = s; this.body = b; return this; }, error(s) { this.status = s; return this; }, header() { return this; }, empty(s = 204) { this.status = s; return this; }};
        await handler({...ctx, query: new URLSearchParams(after ? {after} : {})}, probe);
        if (probe.status !== 200 || !probe.body) return;
        unread += probe.body.items.filter((n) => !n.read).length;
        if (!probe.body.next) break;
        after = probe.body.next;
      }
      reply.json({...JSON.parse(reply.body), unreadCount: unread});
    };
  }
};
