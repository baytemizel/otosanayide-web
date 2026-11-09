import {defineStore} from 'pinia';
import {computed, ref, shallowRef, watch} from 'vue';
import {maintenanceSchema, reminderSchema, vehicleSchema} from '@otosanayide/core';
import {accountUpdateSchema} from '@otosanayide/core/account-update';
import {accountJson, createAccountMutationGate, createAccountReadGate, createPreviewAccountRepository, parseAccountData, type AccountData} from '@otosanayide/core/account-client';
import {createSessionFence} from '@otosanayide/core/garage-transfer';
import {apiFetch} from '../lib/api';
import {demoMode, publicEnv} from '../lib/env';
import {browserSession} from '../lib/session-instance';
import type {SessionService, SessionUser} from '../lib/session';

const empty = (): AccountData => ({vehicles: [], maintenance: [], reminders: [], favorites: []});
const unavailableStorage = 'Yerel kayıt okunamadı. Mevcut veriler değiştirilmedi.';
const sessionChanged = 'Oturum değişti. Yeniden giriş yap.';

export const useAppStore = defineStore('app', () => {
  const data = shallowRef<AccountData>(empty());
  const ready = ref(false);
  const demoMember = ref(false);
  const user = shallowRef<SessionUser | null>(null);
  const notice = ref('');
  const demo = computed(() => demoMode());
  const member = computed(() => (demo.value ? demoMember.value : !!user.value));

  let latest = data.value;
  let currentUser: SessionUser | null = null;
  let blocked = false;
  let memberFlag = false;
  let mounted = false;
  let started = false;
  let session: SessionService | null = null;
  let unsubscribe: (() => void) | undefined;
  const fence = createSessionFence();
  const mutation = createAccountMutationGate();
  const readGate = createAccountReadGate();
  const previewRepo = createPreviewAccountRepository({
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });

  function notify(message: string) {
    notice.value = message;
  }

  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  watch(notice, value => {
    if (import.meta.server) return;
    clearTimeout(noticeTimer);
    if (value) noticeTimer = setTimeout(() => notify(''), 6000);
  });

  function accountGuard(uid: string) {
    const check = fence.capture();
    return () => {
      try {
        check();
      } catch {
        throw Error(sessionChanged);
      }
      if (!mounted || currentUser?.uid !== uid) throw Error(sessionChanged);
    };
  }

  function commit(next: AccountData, nextMember = memberFlag) {
    const valid = parseAccountData(next);
    if (demo.value) {
      if (blocked) throw Error(unavailableStorage);
      previewRepo.write(valid, nextMember);
    }
    readGate.invalidate();
    latest = valid;
    data.value = valid;
    memberFlag = nextMember;
    demoMember.value = nextMember;
  }

  async function request(path: string, init: RequestInit = {}, owner = currentUser) {
    if (!owner) throw Error('Giriş gerekli.');
    const check = accountGuard(owner.uid);
    let token = '';
    return accountJson({
      guard: check,
      token: async () => {
        token = await owner.getIdToken();
        return token;
      },
      request: signal => apiFetch(path, {...init, signal, headers: {...(init.headers as Record<string, string> | undefined), Authorization: 'Bearer ' + token}}),
      decode: (value: unknown) => value,
    });
  }

  async function refresh() {
    const ticket = readGate.begin();
    if (demo.value) {
      blocked = true;
      const saved = previewRepo.read();
      blocked = false;
      latest = saved.data;
      data.value = saved.data;
      memberFlag = saved.member;
      demoMember.value = saved.member;
      return;
    }
    const result = await request('/api/me');
    result.check();
    const next = parseAccountData(result.value);
    if (!readGate.accept(ticket, latest, next)) return;
    latest = next;
    data.value = next;
  }

  function onSessionChange(next: SessionUser | null) {
    fence.change();
    mutation.reset();
    currentUser = next;
    user.value = next;
    latest = empty();
    data.value = latest;
    ready.value = false;
    const check = fence.capture();
    if (!next) {
      ready.value = true;
      return;
    }
    void refresh()
      .catch(error => {
        try {
          check();
          if (mounted) notify(error instanceof Error ? error.message : 'Hesap verileri yüklenemedi.');
        } catch {
          /* The session moved on; this result belongs to nobody. */
        }
      })
      .finally(() => {
        try {
          check();
          if (mounted) ready.value = true;
        } catch {
          /* Same as above. */
        }
      });
  }

  /** Called once after hydration: session and storage must never run during SSR. */
  function start() {
    if (started) return;
    started = true;
    mounted = true;
    if (demo.value) {
      void refresh()
        .catch(() => notify(unavailableStorage))
        .finally(() => {
          ready.value = true;
        });
      return;
    }
    try {
      session = browserSession();
      unsubscribe = session.subscribe(onSessionChange);
      void session.start();
    } catch {
      ready.value = true;
    }
  }

  function stop() {
    mounted = false;
    started = false;
    fence.change();
    unsubscribe?.();
    unsubscribe = undefined;
  }

  function requireMember() {
    if (blocked) throw Error(unavailableStorage);
    if (!ready.value || !(demo.value ? memberFlag : currentUser)) throw Error('Önce ücretsiz hesabına giriş yap.');
  }

  async function exclusive(action: () => Promise<void>) {
    requireMember();
    const release = mutation.begin();
    readGate.invalidate();
    try {
      await action();
    } finally {
      release();
    }
  }

  function revision(header: string | null) {
    if (header === null) return {};
    const value = Number(header);
    if (!Number.isSafeInteger(value) || value < 1) throw Error('account_revision');
    return {garageRevision: value};
  }

  const guardOrNoop = () => (demo.value ? () => {} : accountGuard(currentUser!.uid));

  async function save<T>(resource: string, raw: T) {
    await exclusive(async () => {
      const check = guardOrNoop();
      if (!['vehicles', 'maintenance', 'reminders'].includes(resource)) throw Error('Geçersiz istek.');
      const kind = resource as 'vehicles' | 'maintenance' | 'reminders';
      const value = {vehicles: vehicleSchema, maintenance: maintenanceSchema, reminders: reminderSchema}[kind].parse(raw);
      let saved: unknown = {...value, id: crypto.randomUUID()};
      let version = {};
      if (!demo.value) {
        const result = await request('/api/me', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({resource: kind, value, ...(kind !== 'reminders' && latest.garageShared ? {expectedGarageRevision: latest.garageRevision} : {})}),
        });
        saved = result.value;
        version = revision(result.revision);
      }
      const before = latest;
      const next = {...before, ...version, [kind]: [...before[kind], saved]} as AccountData;
      if (kind === 'maintenance' && before.garageShared && 'vehicleId' in value) {
        next.vehicles = before.vehicles.map(v => (v.id === value.vehicleId ? {...v, mileage: Math.max(v.mileage, 'mileage' in value ? value.mileage : 0)} : v));
      }
      check();
      commit(parseAccountData(next));
    });
  }

  async function update(resource: 'vehicles' | 'reminders', id: string, value: unknown) {
    await exclusive(async () => {
      const check = guardOrNoop();
      const input = accountUpdateSchema.parse({
        resource,
        id,
        value,
        ...(resource === 'vehicles' && latest.garageShared ? {expectedGarageRevision: latest.garageRevision} : {}),
      });
      const existing = (latest[resource] as Array<{id: string; vehicleId?: string}>).find(r => r.id === id);
      if (!existing) throw Error('Kayıt bulunamadı.');
      if (input.resource === 'reminders' && 'vehicleId' in existing && existing.vehicleId !== input.value.vehicleId) throw Error('Hatırlatmanın aracı değiştirilemez.');
      let saved: unknown = {...existing, ...input.value, id};
      let version = {};
      if (!demo.value) {
        const result = await request('/api/me', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(input)});
        saved = result.value;
        version = revision(result.revision);
      }
      check();
      commit(parseAccountData({...latest, ...version, [resource]: (latest[resource] as Array<{id: string}>).map(r => (r.id === id ? saved : r))} as AccountData));
    });
  }

  async function toggleFavorite(id: string) {
    await exclusive(async () => {
      const check = guardOrNoop();
      const adding = !latest.favorites.includes(id);
      if (!demo.value) {
        await request('/api/me', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({resource: 'favorites', value: {businessId: id, adding}})});
      }
      check();
      commit({...latest, favorites: adding ? [...latest.favorites, id] : latest.favorites.filter(x => x !== id)});
    });
  }

  async function logout() {
    fence.change();
    mutation.reset();
    if (demo.value) {
      commit(latest, false);
      return;
    }
    currentUser = null;
    user.value = null;
    latest = empty();
    data.value = latest;
    await (session ?? browserSession()).logout();
    if (publicEnv().pushEnabled) {
      try {
        const {discardBrowserPush} = await import('../lib/push-browser');
        await discardBrowserPush();
      } catch {
        /* Logout must remain available; generic notification bodies contain no account data. */
      }
    }
  }

  function loginDemo() {
    if (!demo.value) return;
    try {
      commit(latest, true);
    } catch {
      notify(unavailableStorage);
    }
  }

  return {data, ready, member, user, demo, notice, notify, start, stop, loginDemo, logout, refresh, accountGuard, save, update, toggleFavorite};
});
