// /api/me: garage (vehicles, maintenance, reminders) and favorites, as read by packages/core/account-client.
// API v2-02 (otosanayide-api docs/v2/02-garage.md), faked in memory:
//   - `?v=2` shows plate/transmission/vin, record type/businessId/providerName/documentKind and reminder
//     enabled/topic/advanceDaysList; without it these fields are left out (v1 shape, strict core parsers).
//   - On POST/PATCH a v2 field that is absent keeps the stored value, `null` clears it. Plates are normalised
//     ("34abc123" → "34 ABC 123"); advanceDaysList is sorted and advanceDays becomes its largest day.
//   - PATCH resource "maintenance" (single record) and DELETE /api/me?resource=maintenance&id=… (204).
// Not faked: shared-garage revisions (X-Garage-Revision), the businessId "published" check, full validation.
const VEHICLE_V2 = ['plate', 'transmission', 'vin'];
const RECORD_V2 = ['type', 'businessId', 'providerName', 'documentKind'];
const REMINDER_V2 = ['enabled', 'topic', 'advanceDaysList'];
const V2 = {vehicles: VEHICLE_V2, maintenance: RECORD_V2, reminders: REMINDER_V2};
const PLATE = /^(0[1-9]|[1-7][0-9]|8[01]) [A-Z]{1,3} [0-9]{2,5}$/;

const omit = (item, keys) => Object.fromEntries(Object.entries(item).filter(([k]) => !keys.includes(k)));
const view = (kind, item, v2) => {
  if (kind === 'reminders') return v2 ? {enabled: true, ...item} : omit(item, REMINDER_V2);
  return v2 ? item : omit(item, V2[kind]);
};

function normalizePlate(value) {
  const s = String(value).trim().replace(/\s+/g, ' ').toUpperCase();
  const m = /^(\d{2}) ?([A-Z]{1,3}) ?(\d{2,5})$/.exec(s);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : s;
}

/** v2 rules on top of the stored record; returns an error text or the record to store. */
function merge(kind, input, existing) {
  const out = {...omit(existing ?? {}, V2[kind]), ...omit(input, V2[kind])};
  for (const key of V2[kind]) {
    const value = key in input ? input[key] : existing?.[key];
    if (value !== null && value !== undefined) out[key] = value;
  }
  if (kind === 'vehicles' && out.plate !== undefined) {
    out.plate = normalizePlate(out.plate);
    if (!PLATE.test(out.plate)) return {error: 'Geçersiz plaka.'};
  }
  if (kind === 'reminders') {
    if ('advanceDaysList' in input && input.advanceDaysList) {
      const list = [...input.advanceDaysList].sort((a, b) => a - b);
      if (!list.length || list.length > 3 || new Set(list).size !== list.length || list.some((d) => ![0, 1, 3, 7].includes(d))) return {error: 'Geçersiz hatırlatma günleri.'};
      if (input.advanceDays !== undefined && input.advanceDays !== list.at(-1)) return {error: 'advanceDays, advanceDaysList içindeki en erken hatırlatma günüyle aynı olmalı.'};
      out.advanceDaysList = list;
    } else if (!('advanceDaysList' in input) && existing?.advanceDaysList && input.advanceDays !== existing.advanceDays) {
      delete out.advanceDaysList; // a different single advanceDays drops the stored list
    }
    if (out.advanceDaysList) out.advanceDays = out.advanceDaysList.at(-1);
  }
  return {value: out};
}

export default (api) => {
  const guard = (req, reply) => {
    const user = api.user(req);
    if (!user) reply.error(401, 'Giriş gerekli.');
    return user;
  };
  const isV2 = (query) => query.get('v') === '2';

  api.get('/api/me', ({req, query}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const account = api.account(user.uid);
    const v2 = isV2(query);
    return reply.json({
      ...account,
      vehicles: account.vehicles.map((x) => view('vehicles', x, v2)),
      maintenance: account.maintenance.map((x) => view('maintenance', x, v2)),
      reminders: account.reminders.map((x) => view('reminders', x, v2)),
    });
  });

  api.post('/api/me', ({req, body, query}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const account = api.account(user.uid);
    const kind = body?.resource;
    if (kind === 'favorites') {
      const {businessId, adding} = body.value ?? {};
      account.favorites = adding ? [...new Set([...account.favorites, businessId])] : account.favorites.filter((id) => id !== businessId);
      return reply.json({ok: true});
    }
    if (!['vehicles', 'maintenance', 'reminders'].includes(kind)) return reply.error(400, 'Geçersiz istek.');
    const merged = merge(kind, body.value ?? {}, undefined);
    if (merged.error) return reply.error(400, merged.error);
    const saved = {...merged.value, id: api.uuid()};
    if (kind === 'reminders' && saved.enabled === undefined) saved.enabled = true;
    account[kind].push(saved);
    return reply.json(view(kind, saved, isV2(query)), 201);
  });

  api.patch('/api/me', ({req, body, query}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const account = api.account(user.uid);
    const kind = body?.resource;
    const list = ['vehicles', 'maintenance', 'reminders'].includes(kind) ? account[kind] : undefined;
    const index = list ? list.findIndex((r) => r.id === body.id) : -1;
    if (index < 0) return reply.error(kind === 'maintenance' ? 409 : 404, 'Kayıt bulunamadı.');
    if (kind !== 'vehicles' && list[index].vehicleId !== body.value?.vehicleId) {
      return reply.error(400, kind === 'maintenance' ? 'Bakım kaydının bağlı olduğu araç değiştirilemez.' : 'Hatırlatmanın bağlı olduğu araç değiştirilemez.');
    }
    // PATCH replaces the record; only v2 fields fall back to the stored value.
    const merged = merge(kind, body.value ?? {}, Object.fromEntries(V2[kind].filter((k) => k in list[index]).map((k) => [k, list[index][k]])));
    if (merged.error) return reply.error(400, merged.error);
    list[index] = {...merged.value, id: body.id};
    return reply.json(view(kind, list[index], isV2(query)));
  });

  api.delete('/api/me', ({req, query}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const keys = [...query.keys()];
    if (query.get('resource') !== 'maintenance' || !/^[a-zA-Z0-9_-]{1,120}$/.test(query.get('id') ?? '') || keys.some((k) => !['resource', 'id', 'expectedGarageRevision'].includes(k))) {
      return reply.error(400, 'Geçersiz istek.');
    }
    const account = api.account(user.uid);
    const before = account.maintenance.length;
    account.maintenance = account.maintenance.filter((r) => r.id !== query.get('id'));
    if (account.maintenance.length === before) return reply.error(404, 'Kayıt bulunamadı.');
    return reply.empty(204);
  });
};
