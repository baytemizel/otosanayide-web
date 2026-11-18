// Local stub of the Otosanayide REST API for developing the web in live mode
// (NUXT_PUBLIC_APP_MODE=live, NUXT_PUBLIC_API_ORIGIN=http://localhost:4010).
// In-memory, synthetic data only. Shapes follow ../../../otosanayide-api/docs/openapi.yaml.
// Not a test of the real API: behaviour that the stub fakes is listed in README.md.
//
//   node dev/stub-api/server.mjs            (port 4010, web origin http://localhost:3001)
//
// Route modules in ./routes/*.mjs export `default (api) => { api.get(...); ... }`.
import {createServer} from 'node:http';
import {readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

const PORT = Number(process.env.STUB_PORT ?? 4010);
const WEB_ORIGINS = new Set((process.env.STUB_WEB_ORIGINS ?? 'http://localhost:3001,http://127.0.0.1:3001').split(','));
const REQUEST_HEADERS = 'authorization, content-type, accept, accept-language, x-firebase-appcheck';

/** Shared in-memory state. Route modules may add their own keys. */
export const state = {
  users: new Map(), // email -> {uid, email, password, emailVerified, name}
  tokens: new Map(), // access token -> {uid, expiresAt}
  refresh: new Map(), // refresh cookie -> uid
  accounts: new Map(), // uid -> {vehicles, maintenance, reminders, favorites}
};

/** Seed member (synthetic). Credentials are in README.md. */
function seed() {
  const uid = 'stub-user-deniz';
  state.users.set('deniz@example.com', {uid, email: 'deniz@example.com', password: 'ornek-sifre-123', emailVerified: true});
  const v1 = '11111111-1111-4111-8111-111111111111';
  const v2 = '22222222-2222-4222-8222-222222222222';
  state.accounts.set(uid, {
    vehicles: [
      {id: v1, brand: 'BMW', model: '320i', year: 2019, fuel: 'Benzin', mileage: 86400, inspectionDueDate: '2027-03-12'},
      {id: v2, brand: 'Togg', model: 'T10X', year: 2024, fuel: 'Elektrikli', mileage: 12100},
    ],
    maintenance: [
      {id: randomUUID(), vehicleId: v1, title: 'Periyodik bakım', date: '2026-10-12', mileage: 84000, amount: 7850, note: 'Örnek Teknik Garaj'},
      {id: randomUUID(), vehicleId: v1, title: 'Lastik değişimi', date: '2026-03-05', mileage: 81200, amount: 2400, note: ''},
    ],
    reminders: [
      {id: randomUUID(), vehicleId: v1, title: 'Muayene', dueDate: '2026-12-01', channels: ['email'], advanceDays: 7},
      {id: randomUUID(), vehicleId: v1, title: 'Yağ değişimi', dueKm: 94000},
    ],
    favorites: [],
  });
}
seed();

const routes = [];
const api = {
  state,
  get: (pattern, handler) => routes.push({method: 'GET', pattern, handler}),
  post: (pattern, handler) => routes.push({method: 'POST', pattern, handler}),
  patch: (pattern, handler) => routes.push({method: 'PATCH', pattern, handler}),
  put: (pattern, handler) => routes.push({method: 'PUT', pattern, handler}),
  delete: (pattern, handler) => routes.push({method: 'DELETE', pattern, handler}),
  /** The signed-in user for a Bearer token, or null. */
  user(req) {
    const token = (req.headers.authorization ?? '').match(/^Bearer (.+)$/)?.[1];
    const entry = token ? state.tokens.get(token) : undefined;
    if (!entry || entry.expiresAt < Date.now()) return null;
    return [...state.users.values()].find((u) => u.uid === entry.uid) ?? null;
  },
  account(uid) {
    if (!state.accounts.has(uid)) state.accounts.set(uid, {vehicles: [], maintenance: [], reminders: [], favorites: []});
    return state.accounts.get(uid);
  },
  uuid: randomUUID,
};

function match(pattern, path) {
  const a = pattern.split('/');
  const b = path.split('/');
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return {__invalid: raw};
  }
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie ?? '').split(';').map((p) => p.trim().split('=')).filter((p) => p[0]));
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const isAuth = url.pathname.startsWith('/api/auth/');
  if (origin && WEB_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Expose-Headers', 'X-Garage-Revision');
    if (isAuth) res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', REQUEST_HEADERS);
    res.setHeader('Access-Control-Max-Age', '600');
    res.writeHead(204).end();
    return;
  }
  const reply = {
    status: 200,
    headers: {'Content-Type': 'application/json', 'Cache-Control': 'private, no-store'},
    body: undefined,
    json(body, status = 200) { this.status = status; this.body = JSON.stringify(body); return this; },
    error(status, message) { return this.json({error: message}, status); },
    empty(status = 204) { this.status = status; this.body = ''; return this; },
    raw(body, type, status = 200) { this.status = status; this.headers['Content-Type'] = type; this.body = body; return this; },
    header(name, value) { this.headers[name] = value; return this; },
  };
  try {
    let found = false;
    for (const route of routes) {
      if (route.method !== req.method) continue;
      const params = match(route.pattern, url.pathname);
      if (!params) continue;
      found = true;
      const body = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) ? await readBody(req) : undefined;
      await route.handler({req, url, query: url.searchParams, params, body, cookies: cookies(req)}, reply);
      break;
    }
    if (!found) reply.error(404, 'Bulunamadı.');
  } catch (error) {
    console.error(error);
    reply.error(500, 'İşlem tamamlanamadı.');
  }
  if (process.env.STUB_LOG !== '0') console.log(req.method, url.pathname + url.search, reply.status);
  res.writeHead(reply.status, reply.headers).end(reply.status === 204 ? undefined : reply.body ?? '');
});

const dir = new URL('./routes/', import.meta.url);
for (const file of (await readdir(dir)).filter((f) => f.endsWith('.mjs')).sort()) {
  const mod = await import(new URL(file, dir));
  mod.default(api);
}
server.listen(PORT, () => console.log(`stub API on http://localhost:${PORT} (${routes.length} routes)`));
