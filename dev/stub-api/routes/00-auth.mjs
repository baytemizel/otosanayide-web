// /api/auth/* (docs/AUTH_API.md): web channel, refresh token in the otosanayide_refresh cookie.
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

  api.post('/api/auth/register', ({body}, reply) => {
    if (!validEmail(body?.email) || typeof body?.password !== 'string' || body.password.length < 10) return reply.error(400, 'Bilgileri kontrol edin.');
    if (!state.users.has(body.email)) {
      state.users.set(body.email, {uid: 'stub-' + token().slice(0, 12), email: body.email, password: body.password, emailVerified: false});
    }
    return reply.json({ok: true}, 202);
  });

  api.post('/api/auth/login', ({body}, reply) => {
    const user = state.users.get(body?.email);
    if (!user || user.password !== body?.password) return reply.error(401, 'E-posta veya şifre hatalı.');
    return session(reply, user);
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
  api.post('/api/auth/password/forgot', (_, reply) => reply.empty(202));
  api.post('/api/auth/password/reset', ({body}, reply) => {
    if (typeof body?.token !== 'string' || body.token === 'gecersiz' || typeof body?.password !== 'string' || body.password.length < 10) return reply.error(400, 'Bağlantı geçersiz veya şifre uygun değil.');
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
};
