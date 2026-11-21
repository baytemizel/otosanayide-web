// Garage group (/araclarim, /kaydedilenler, sign-in pages): seed data only (incl. the API v2-02 garage fields).
// Auth (00-auth), GET/POST/PATCH /api/me (01-me), GET /api/businesses/:id and /api/me/lists (10-search)
// are already served; this file gives the seed member something to show on /kaydedilenler:
// three saved synthetic businesses, one saved id that is no longer published (the "artık yayında değil"
// state) and one named list. Not faked here: the MFA step of /api/auth/login (00-auth has no MFA user).
export default (api) => {
  const {state} = api;
  const seedUid = 'stub-user-deniz';
  const published = () => (state.businesses instanceof Map ? [...state.businesses.values()] : state.businesses ?? [])
    .filter((b) => b.published && !b.sample)
    .map((b) => b.id);

  const ids = published().slice(0, 3);
  const account = api.account(seedUid);
  if (!account.favorites.length) account.favorites = [...ids, 'ornek-kapanan-servis'];

  // API v2-02 fields on the seed garage (shown with ?v=2): a synthetic plate ("34 ABC 123" style, not a real
  // registration) and transmission on the BMW, record types / service name / document label, reminder topic,
  // several notice days and one switched-off reminder. The Togg stays without v2 fields (a v1-era vehicle).
  const bmw = account.vehicles.find((v) => v.brand === 'BMW');
  if (bmw && bmw.plate === undefined) Object.assign(bmw, {plate: '34 ORN 001', transmission: 'automatic'});
  for (const record of account.maintenance) {
    if (record.type !== undefined) continue;
    if (record.title === 'Periyodik bakım') Object.assign(record, {type: 'periodic', providerName: record.note || 'Örnek Teknik Garaj', note: '', documentKind: 'invoice'});
    if (record.title === 'Lastik değişimi') Object.assign(record, {type: 'tyre'});
  }
  if (bmw && !account.maintenance.some((r) => r.type === 'insurance')) {
    account.maintenance.push({id: api.uuid(), vehicleId: bmw.id, title: 'Trafik sigortası', date: '2026-02-18', mileage: 79000, amount: 750, note: 'Poliçe yenileme', type: 'insurance', documentKind: 'policy'});
  }
  for (const reminder of account.reminders) {
    if (reminder.enabled !== undefined) continue;
    if (reminder.title === 'Muayene') Object.assign(reminder, {enabled: true, topic: 'inspection', advanceDays: 7, advanceDaysList: [0, 1, 7]});
    if (reminder.title === 'Yağ değişimi') Object.assign(reminder, {enabled: true, topic: 'oil'});
  }
  if (bmw && !account.reminders.some((r) => r.enabled === false)) {
    account.reminders.push({id: api.uuid(), vehicleId: bmw.id, title: 'Trafik sigortası', dueDate: '2027-02-18', channels: ['email'], advanceDays: 7, enabled: false, topic: 'insurance', advanceDaysList: [7]});
  }

  state.lists ??= new Map();
  if (!state.lists.get(seedUid)?.length && ids.length >= 2) {
    const now = Date.now();
    state.lists.set(seedUid, [{
      id: api.uuid(), name: 'Örnek kış hazırlığı', kind: 'list', businessIds: ids.slice(0, 2), unavailableIds: [],
      version: 1, createdAtMs: now, updatedAtMs: now, operationId: api.uuid(),
    }]);
  }
};
