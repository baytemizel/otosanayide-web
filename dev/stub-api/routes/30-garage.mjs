// Garage group (/araclarim, /kaydedilenler, sign-in pages): seed data only.
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

  state.lists ??= new Map();
  if (!state.lists.get(seedUid)?.length && ids.length >= 2) {
    const now = Date.now();
    state.lists.set(seedUid, [{
      id: api.uuid(), name: 'Örnek kış hazırlığı', kind: 'list', businessIds: ids.slice(0, 2), unavailableIds: [],
      version: 1, createdAtMs: now, updatedAtMs: now, operationId: api.uuid(),
    }]);
  }
};
