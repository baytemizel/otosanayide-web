// Live data for the account screens: W17 /bildirimler, W18 /hesabim (preferences, data export,
// deletion request, security), /yorumlarim and /basvurularim. Live mode only; the pages keep
// their demo branch on app/data/mock/*.
import {computed, ref, shallowRef} from 'vue';
import {z} from 'zod';
import {privacyOwnerAction, privacyOwnerResponse, type PrivacyOwnRequest} from '@otosanayide/core/privacy-requests';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {memberToken} from '~/composables/v2/useRequests';
import {useUnreadCount} from '~/composables/v2/useUnreadCount';
import {securityErrorMessage} from '~/lib/account-security';
import {callApi} from '~/lib/api-read';
import {demoMode} from '~/lib/env';
import {exportsApi, preferencesApi, type ExportRequest, type PreferenceChanges, type Preferences} from '~/lib/member-api';
import {readAllNotifications} from '~/lib/notifications-read';
import type {Notice} from '~/lib/notifications-helpers';
import {fetchOwnReviews, type OwnReviewListItem} from '~/lib/own-reviews';
import {SessionRequestError} from '~/lib/session';
import {readUnreadCount} from '~/lib/v2/account';
import {browserSession} from '~/lib/session-instance';
import {decodeClaims, decodeNotices, exportErrorMessage, exportSummary, liveErrorMessage, noticeKindParam, ownReviewRow, type LiveClaim, type OwnReviewRow} from '~/lib/v2/requests';

const live = () => !demoMode();

/* ------------------------------------------------------------------ W17 notifications */

export function useNotices(filter: () => string) {
  const app = useApp();
  const token = memberToken();
  const items = ref<Notice[]>([]);
  const next = ref<string | null>(null);
  const loading = ref(false);
  const error = ref('');
  const markingAll = ref(false);
  // v2-04: the page answer carries the inbox's unread count (navbar badge, page counter).
  const unread = useUnreadCount();
  let generation = 0;

  async function load(after = '') {
    if (!live() || !app.user) return;
    const run = ++generation;
    loading.value = true;
    error.value = '';
    const kind = noticeKindParam(filter());
    try {
      const query = new URLSearchParams({v: '2'});
      if (after) query.set('after', after);
      if (kind) query.set('kind', kind);
      const page = await callApi(`/api/notifications?${query}`, {token: await token()}, (raw) => ({...decodeNotices(raw), unreadCount: readUnreadCount(raw)}));
      if (run !== generation) return;
      unread.set(page.unreadCount);
      items.value = after ? [...items.value, ...page.items] : page.items;
      next.value = page.next;
    } catch (e) {
      if (run === generation) error.value = liveErrorMessage(e, 'Bildirimler yüklenemedi. Tekrar dene.');
    } finally {
      if (run === generation) loading.value = false;
    }
  }
  useClientEffect(() => [app.user?.uid, filter()], () => {
    items.value = [];
    next.value = null;
    void load();
  });

  async function markRead(id: string) {
    const item = items.value.find(n => n.id === id);
    if (!item || item.read) return;
    try {
      await callApi('/api/notifications', {method: 'PATCH', token: await token(), body: {id, read: true}}, () => null);
      items.value = items.value.map(n => (n.id === id ? {...n, read: true} : n));
      unread.adjust(-1);
    } catch (e) {
      app.notify(liveErrorMessage(e, 'Bildirim okundu olarak işaretlenemedi.'));
    }
  }

  async function markAll() {
    if (markingAll.value) return;
    markingAll.value = true;
    try {
      const updated = await readAllNotifications(token, Date.now());
      items.value = items.value.map(n => ({...n, read: true}));
      void unread.refresh(true);
      app.notify(updated ? `${updated} bildirim okundu olarak işaretlendi.` : 'Okunmamış bildirim yok.');
    } catch (e) {
      app.notify(liveErrorMessage(e, 'İşlem tamamlanamadı. Tekrar dene.'));
    } finally {
      markingAll.value = false;
    }
  }
  return {items, next, loading, error, markingAll, unreadCount: unread.value, load, markRead, markAll};
}

/* ------------------------------------------------------------------ W18 preferences (web-09) */

export interface PreferenceRow {id: keyof PreferenceChanges | 'inApp'; title: string; text: string; on: boolean; locked: boolean; note: string}

export function usePreferences() {
  const app = useApp();
  const token = memberToken();
  const prefs = shallowRef<Preferences | null>(null);
  const loading = ref(false);
  const busy = ref(false);
  const error = ref('');
  const saved = ref('');

  useClientEffect(() => [app.user?.uid], () => {
    prefs.value = null;
    if (!live() || !app.user) return;
    let cancelled = false;
    loading.value = true;
    error.value = '';
    preferencesApi.read(token).then(v => {
      if (!cancelled) prefs.value = v;
    }).catch(e => {
      if (!cancelled) error.value = liveErrorMessage(e, 'Tercihler yüklenemedi.');
    }).finally(() => {
      if (!cancelled) loading.value = false;
    });
    return () => {
      cancelled = true;
    };
  });

  const off = 'Bu kanaldan gönderim henüz etkin değil; seçimin saklanır.';
  const rows = computed<PreferenceRow[]>(() => {
    const p = prefs.value;
    if (!p) return [];
    const consent = p.productNews.enabled && p.productNews.consentAtMs
      ? `Onay: ${new Date(p.productNews.consentAtMs).toLocaleString('tr-TR', {timeZone: 'Europe/Istanbul'})} · metin ${p.productNews.textVersion ?? ''}` : '';
    return [
      {id: 'inApp', title: 'Talep güncellemeleri · uygulama içi', text: 'İşlem bildirimidir, kapatılamaz.', on: true, locked: true, note: ''},
      {id: 'requestUpdatesPush', title: 'Talep güncellemeleri · push', text: 'Tarayıcı ve uygulama bildirimi', on: p.requestUpdates.push, locked: false, note: p.delivery.requestUpdatesPush === 'not_enabled' ? off : ''},
      {id: 'requestUpdatesEmail', title: 'Talep güncellemeleri · e-posta', text: 'Doğrulanmış adres', on: p.requestUpdates.email, locked: false, note: p.delivery.requestUpdatesEmail === 'not_enabled' ? off : ''},
      {id: 'reminderEmail', title: 'Bakım hatırlatmaları e-postası', text: 'Kapalıyken hiçbir hatırlatma e-postası gönderilmez.', on: p.reminderEmail, locked: false, note: ''},
      {id: 'productNews', title: 'Ürün duyuruları', text: 'Pazarlama iletisi · varsayılan kapalı. Açarsan onayın zaman ve metin sürümüyle kaydedilir.', on: p.productNews.enabled, locked: false, note: [consent, p.delivery.productNews === 'not_enabled' ? off : ''].filter(Boolean).join(' ')},
    ];
  });

  async function toggle(id: PreferenceRow['id'], next: boolean) {
    const current = prefs.value;
    if (id === 'inApp' || !current || busy.value) return;
    busy.value = true;
    error.value = '';
    saved.value = '';
    try {
      prefs.value = await preferencesApi.change(token, current.version, {[id]: next});
      saved.value = 'Tercihin kaydedildi.';
    } catch (e) {
      error.value = liveErrorMessage(e, 'Tercih kaydedilemedi.', {409: 'Tercihler başka bir yerde değişti. Sayfayı yenile.', 403: 'Bu tercih için önce e-posta adresini doğrula.'});
    } finally {
      busy.value = false;
    }
  }
  return {prefs, rows, loading, busy, error, saved, toggle};
}

/* ------------------------------------------------------------------ W18 data export (web-10) */

export function useDataExports() {
  const app = useApp();
  const token = memberToken();
  const items = ref<ExportRequest[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const busy = ref(false);
  const error = ref('');
  const done = ref('');
  let operationId = '';

  async function load() {
    if (!live() || !app.user) return;
    loading.value = true;
    try {
      items.value = (await exportsApi.read(token)).items;
      loaded.value = true;
    } catch (e) {
      error.value = exportErrorMessage(e);
    } finally {
      loading.value = false;
    }
  }
  useClientEffect(() => [app.user?.uid], () => {
    items.value = [];
    loaded.value = false;
    error.value = '';
    void load();
  });

  async function request() {
    if (busy.value) return;
    busy.value = true;
    error.value = '';
    done.value = '';
    operationId ||= crypto.randomUUID();
    try {
      const created = await exportsApi.create(token, operationId);
      operationId = '';
      items.value = [created.request, ...items.value.filter(i => i.id !== created.request.id)];
      done.value = 'Talebin alındı. Kopya bir görevli tarafından elle hazırlanır; bu sayfada indirme yoktur.';
    } catch (e) {
      error.value = exportErrorMessage(e);
    } finally {
      busy.value = false;
    }
  }
  async function cancel(item: ExportRequest) {
    if (busy.value) return;
    busy.value = true;
    error.value = '';
    done.value = '';
    try {
      const raw = await exportsApi.cancel(token, item);
      const changed = ('request' in raw && raw.request && typeof raw.request === 'object' ? raw.request : raw) as ExportRequest;
      items.value = items.value.map(i => (i.id === changed.id ? changed : i));
    } catch (e) {
      error.value = exportErrorMessage(e);
    } finally {
      busy.value = false;
    }
  }
  const summary = computed(() => exportSummary(items.value));
  return {items, summary, loading, loaded, busy, error, done, request, cancel};
}

/* ------------------------------------------------------------------ W18 deletion request (/api/me/privacy) */

export function privacyErrorMessage(error: unknown) {
  return liveErrorMessage(error, 'Talep durumu değişti. Yeniden kontrol et.', {
    428: 'Güvenlik için son 10 dakika içinde yeniden giriş yapman gerekiyor. Çıkış yapıp tekrar giriş yap.',
    409: 'Talep durumu değişti. Sayfayı yenileyip tekrar dene.',
    503: 'Veri talepleri henüz kullanıma açılmadı.',
    403: 'Silme talebi için önce e-posta adresini doğrula.',
  });
}

export function usePrivacyRequest() {
  const app = useApp();
  const token = memberToken();
  const request = shallowRef<PrivacyOwnRequest | null>(null);
  const loading = ref(false);
  const loaded = ref(false);
  const busy = ref(false);
  const error = ref('');
  const notice = ref('');

  async function call(body?: unknown) {
    const payload = body === undefined ? undefined : privacyOwnerAction.parse(body);
    const value = await callApi('/api/me/privacy', payload ? {method: 'POST', token: await token(), body: payload} : {token: await token()}, raw => privacyOwnerResponse.parse(raw));
    request.value = value.request;
    loaded.value = true;
  }
  useClientEffect(() => [app.user?.uid], () => {
    request.value = null;
    loaded.value = false;
    error.value = '';
    if (!live() || !app.user) return;
    loading.value = true;
    call().catch(e => {
      error.value = privacyErrorMessage(e);
    }).finally(() => {
      loading.value = false;
    });
  });

  async function act(body: () => unknown, message: string) {
    if (busy.value) return false;
    busy.value = true;
    error.value = '';
    notice.value = '';
    try {
      await call(body());
      notice.value = message;
      return true;
    } catch (e) {
      error.value = privacyErrorMessage(e);
      return false;
    } finally {
      busy.value = false;
    }
  }
  const existing = (action: 'cancel' | 'confirm') => () => ({
    action, requestId: request.value!.id, expectedVersion: request.value!.version, operationId: crypto.randomUUID(),
    ...(action === 'confirm' ? {acknowledged: true, confirmedScope: true} : {}),
  });
  return {
    request, loading, loaded, busy, error, notice,
    submit: (scope: 'garage' | 'account') => act(() => ({action: 'submit', scope, operationId: crypto.randomUUID(), acknowledged: true, confirmedScope: true}), 'Silme talebin alındı. Verilerin henüz silinmedi; talep incelenir.'),
    cancel: () => act(existing('cancel'), 'Silme talebin iptal edildi.'),
    confirm: () => act(existing('confirm'), 'Kapsamı onayladın. Talep yeniden incelemeye alındı.'),
  };
}

/* ------------------------------------------------------------------ W18 security (web-01/02/03) */

export function useAccountSecurity() {
  const app = useApp();
  const totp = ref<'unknown' | 'off' | 'on'>('unknown');
  const busy = ref<'' | 'email' | 'password'>('');
  const message = ref<{tone: 'ok' | 'err' | 'info'; text: string} | null>(null);

  useClientEffect(() => [app.user?.uid], () => {
    totp.value = 'unknown';
    if (!live() || !app.user) return;
    let cancelled = false;
    browserSession().mfaStatus().then(status => {
      if (!cancelled) totp.value = status.totp.enabled ? 'on' : 'off';
    }).catch(() => {
      /* stays "unknown"; the screen says the status could not be read */
    });
    return () => {
      cancelled = true;
    };
  });

  async function run(kind: 'email' | 'password', task: () => Promise<string>, wrong: string) {
    if (busy.value) return false;
    busy.value = kind;
    message.value = null;
    try {
      message.value = {tone: 'ok', text: await task()};
      return true;
    } catch (error) {
      if (error instanceof SessionRequestError && error.status === 403) {
        totp.value = 'on';
        message.value = {tone: 'info', text: 'İki adımlı doğrulama kodu gerekli. Kodu yazıp tekrar gönder.'};
      } else if (error instanceof SessionRequestError && error.status === 400) message.value = {tone: 'err', text: wrong};
      else message.value = {tone: 'err', text: securityErrorMessage(error)};
      return false;
    } finally {
      busy.value = '';
    }
  }
  const changeEmail = (newEmail: string, password: string, code?: string) => run('email', async () => {
    await browserSession().changeEmail(newEmail.trim(), password, code || undefined);
    return 'Yeni adrese onay bağlantısı gönderdik. Bağlantıyı açana kadar mevcut adresin geçerli kalır; onaydan sonra bütün oturumların kapanır.';
  }, 'Şifreyi, kodu ve yeni adresin mevcut adresten farklı olduğunu kontrol et.');
  const changePassword = (currentPassword: string, newPassword: string, code?: string) => run('password', async () => {
    await browserSession().changePassword(currentPassword, newPassword, code || undefined);
    return 'Şifren güncellendi. Diğer cihazlardaki oturumlar kapatıldı.';
  }, 'Şifre veya doğrulama kodu hatalı.');
  return {totp, busy, message, changeEmail, changePassword};
}

/* ------------------------------------------------------------------ /yorumlarim (web-17) */

export function useOwnReviews() {
  const app = useApp();
  const token = memberToken();
  const items = ref<OwnReviewListItem[]>([]);
  const next = ref<string | null>(null);
  const loading = ref(false);
  const error = ref('');
  const busy = ref('');

  async function load(after = '') {
    if (!live() || !app.user) return;
    loading.value = true;
    error.value = '';
    try {
      const page = await fetchOwnReviews(token, after);
      items.value = after ? [...items.value, ...page.items] : page.items;
      next.value = page.next;
    } catch (e) {
      error.value = e instanceof Error && e.message ? e.message : 'Yorumlar yüklenemedi.';
    } finally {
      loading.value = false;
    }
  }
  useClientEffect(() => [app.user?.uid], () => {
    items.value = [];
    void load();
  });
  const rows = computed<OwnReviewRow[]>(() => items.value.map(ownReviewRow));

  /** PATCH /api/reviews/mine {action:'withdraw'} (same body as the review-author client). */
  async function withdraw(row: OwnReviewRow) {
    if (busy.value) return;
    busy.value = row.id;
    try {
      await callApi('/api/reviews/mine', {method: 'PATCH', token: await token(), body: {action: 'withdraw', businessId: row.businessId, expectedVersion: row.version, confirmed: true}},
        raw => z.object({ok: z.literal(true), status: z.literal('withdrawn')}).passthrough().parse(raw));
      app.notify('Yorumun geri çekildi.');
      await load();
    } catch (e) {
      app.notify(liveErrorMessage(e, 'Yorum geri çekilemedi.', {409: 'Yorum değişti. Liste yenilendi; tekrar dene.'}));
      await load();
    } finally {
      busy.value = '';
    }
  }
  // `items` keeps the raw list for the v2-03 review fields (visit month, service) shown on /yorumlarim.
  return {rows, items, next, loading, error, busy, load, withdraw};
}

/* ------------------------------------------------------------------ /basvurularim */

export function useClaims() {
  const app = useApp();
  const token = memberToken();
  const claims = ref<LiveClaim[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref('');
  const busy = ref('');

  async function load() {
    if (!live() || !app.user) return;
    loading.value = true;
    error.value = '';
    try {
      claims.value = await callApi('/api/claims', {token: await token()}, decodeClaims);
      loaded.value = true;
    } catch (e) {
      error.value = liveErrorMessage(e, 'Başvurular yüklenemedi.');
    } finally {
      loading.value = false;
    }
  }
  useClientEffect(() => [app.user?.uid], () => {
    claims.value = [];
    void load();
  });

  /** Answer to "Ek bilgi bekleniyor" (PATCH /api/claims {claimId, message}). Throws a readable message. */
  async function reply(claimId: string, message: string) {
    busy.value = claimId;
    try {
      await callApi('/api/claims', {method: 'PATCH', token: await token(), body: {claimId, message: message.trim()}}, () => null);
      app.notify('Yanıtın incelemeye gönderildi.');
      await load();
    } catch (e) {
      throw Error(liveErrorMessage(e, 'Yanıt gönderilemedi.'));
    } finally {
      busy.value = '';
    }
  }
  return {claims, loading, loaded, error, busy, load, reply};
}
