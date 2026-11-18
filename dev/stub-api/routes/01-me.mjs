// /api/me: garage (vehicles, maintenance, reminders) and favorites, as read by packages/core/account-client.
export default (api) => {
  const guard = (req, reply) => {
    const user = api.user(req);
    if (!user) reply.error(401, 'Giriş gerekli.');
    return user;
  };

  api.get('/api/me', ({req}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    return reply.json(api.account(user.uid));
  });

  api.post('/api/me', ({req, body}, reply) => {
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
    const saved = {...body.value, id: api.uuid()};
    account[kind].push(saved);
    return reply.json(saved);
  });

  api.patch('/api/me', ({req, body}, reply) => {
    const user = guard(req, reply);
    if (!user) return;
    const account = api.account(user.uid);
    const list = account[body?.resource];
    const index = list ? list.findIndex((r) => r.id === body.id) : -1;
    if (index < 0) return reply.error(404, 'Kayıt bulunamadı.');
    list[index] = {...list[index], ...body.value, id: body.id};
    return reply.json(list[index]);
  });
};
