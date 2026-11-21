// Live data for the request screens (W14 /talep, W15 /taleplerim, W16 /randevu). Every function here
// is for live mode only; the pages keep their demo branch on app/data/mock/requests.ts.
import {computed, ref, shallowRef, type Ref} from 'vue';
import {z} from 'zod';
import {featureAvailable} from '@otosanayide/core';
import {requestReceipt} from '@otosanayide/core/request-client';
import {requestAction} from '@otosanayide/core/request-operations';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {callApi, errorStatus} from '~/lib/api-read';
import {demoMode} from '~/lib/env';
import {turkish, type Translate} from '~/lib/i18n';
import {messagesApi, type RequestMessage} from '~/lib/member-api';
import {readBusiness} from '~/lib/server-read';
import {toCardBusiness, type CardBusiness} from '~/lib/v2/business-card';
import {
  cancelBody, decodeAvailability, decodeRequestPage, liveErrorMessage, requestBody, requestView,
  type CancelReason, type LiveAvailability, type LiveRequest, type RequestDraft, type RequestView,
} from '~/lib/v2/requests';

/** Bearer token of the signed-in member; throws a readable message when the session is gone. */
export function memberToken() {
  const app = useApp();
  const {t} = useLocale();
  return async () => {
    const user = app.user;
    if (!user) throw Error(t('Oturumun sona erdi. Yeniden giriş yap.'));
    return user.getIdToken();
  };
}

export type BusinessState = 'loading' | 'found' | 'missing' | 'unavailable';

/** The business a request goes to (?servis=). Live only; `canRequest` follows the core feature rule. */
export function useRequestBusiness(id: () => string, kind: 'quotes' | 'appointments') {
  const {locale} = useLocale();
  const state = ref<BusinessState>('loading');
  const business = shallowRef<CardBusiness | null>(null);
  useClientEffect(() => [id(), locale.value], () => {
    if (demoMode()) return;
    const wanted = id();
    let cancelled = false;
    state.value = 'loading';
    business.value = null;
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(wanted)) {
      state.value = 'missing';
      return;
    }
    void readBusiness(wanted, locale.value).then(read => {
      if (cancelled) return;
      if (read.status === 'found') business.value = toCardBusiness(read.business, read.extras);
      state.value = read.status;
    });
    return () => {
      cancelled = true;
    };
  });
  const canRequest = computed(() => !!business.value?.source && featureAvailable(business.value.source, kind));
  const services = computed(() => business.value?.source?.services ?? []);
  return {state, business, canRequest, services};
}

/** POST /api/requests. The same `requestKey` must be sent again when the member retries. */
export async function sendRequest(token: () => Promise<string>, draft: RequestDraft, requestKey: string) {
  const body = requestBody(draft, requestKey);
  return callApi('/api/requests', {method: 'POST', token: await token(), body}, raw => requestReceipt.parse(raw));
}

/**
 * Idempotency key for POST /api/requests: kept while the member retries the same draft, renewed when
 * the draft changed (the API answers 409 to a key reused with other content), cleared after success.
 */
export function requestKeyKeeper() {
  let key = '';
  let sent = '';
  return {
    for(draft: RequestDraft) {
      const text = JSON.stringify(draft);
      if (!key || text !== sent) key = crypto.randomUUID();
      sent = text;
      return key;
    },
    clear() {
      key = '';
      sent = '';
    },
  };
}

/** Called from a page's catch block (no Nuxt context there), so the page passes its `t`. */
export function requestSendError(error: unknown, kind: 'quotes' | 'appointments', t: Translate = turkish) {
  return liveErrorMessage(error, t('Talep gönderilemedi. Tekrar dene.'), {
    403: t('Talep göndermek için önce e-posta adresini doğrula (Hesabım sayfası).'),
    ...(kind === 'appointments' ? {409: slotTakenMessage(t)} : {}),
  }, t);
}
/** The 409 text of an appointment whose slot was taken meanwhile; /randevu compares against it. */
export const slotTakenMessage = (t: Translate = turkish) => t('Seçtiğin saat artık uygun değil. Başka bir saat seç.');

/** The member's requests (GET /api/requests?v=2) with accept/cancel (PATCH, customer actions only; cancel carries a v2-01 reason code). */
export function useMemberRequests() {
  const app = useApp();
  const {t, localeTag} = useLocale();
  const token = memberToken();
  const items = ref<LiveRequest[]>([]);
  const next = ref<string | null>(null);
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref('');
  const acting = ref(false);
  const now = ref(Date.now());
  let generation = 0;

  async function load(after = '') {
    if (demoMode() || !app.user) return;
    const run = ++generation;
    loading.value = true;
    error.value = '';
    try {
      const page = await callApi(`/api/requests?v=2${after ? '&after=' + encodeURIComponent(after) : ''}`, {token: await token()}, decodeRequestPage);
      if (run !== generation) return;
      items.value = after ? [...items.value, ...page.items.filter(i => !items.value.some(x => x.id === i.id))] : page.items;
      next.value = page.next;
      now.value = Date.now();
      loaded.value = true;
    } catch (e) {
      if (run === generation) error.value = liveErrorMessage(e, t('Talepler yüklenemedi. Tekrar dene.'), {}, t);
    } finally {
      if (run === generation) loading.value = false;
    }
  }
  useClientEffect(() => [app.user?.uid], () => {
    items.value = [];
    loaded.value = false;
    void load();
  });

  const views = computed<RequestView[]>(() => items.value.map(item => requestView(item, now.value, t, localeTag.value)));

  async function act(view: RequestView, action: 'accept' | 'cancel', reason?: {code: CancelReason; text: string}) {
    if (acting.value) return;
    acting.value = true;
    try {
      // The core action schema is strict and has no reasonCode yet: the cancel body is built here.
      const body = action === 'cancel' && reason ? cancelBody(view, reason.code, reason.text, t) : requestAction.parse({id: view.id, version: view.version, action});
      await callApi('/api/requests', {method: 'PATCH', token: await token(), body}, raw => z.object({ok: z.literal(true)}).passthrough().parse(raw));
      await load();
    } catch (e) {
      throw Error(liveErrorMessage(e, t('İşlem tamamlanamadı. Tekrar dene.'), {409: t('Talep değişti ya da önerinin süresi doldu. Liste yenilendi.')}, t));
    } finally {
      acting.value = false;
    }
  }

  return {items, views, next, loading, loaded, error, acting, load, accept: (v: RequestView) => act(v, 'accept'), cancel: (v: RequestView, code: CancelReason, text: string) => act(v, 'cancel', {code, text})};
}

/** Messages of one request (web-15 (2)). No notification is sent to the business. */
export function useRequestThread(requestId: () => string) {
  const app = useApp();
  const {t} = useLocale();
  const token = memberToken();
  const items = ref<RequestMessage[]>([]);
  const next = ref<string | null>(null);
  const loading = ref(false);
  const error = ref('');
  let operationId = '';
  let generation = 0;

  async function load(after = '') {
    const id = requestId();
    if (demoMode() || !app.user || !id) return;
    const run = ++generation;
    loading.value = true;
    error.value = '';
    try {
      const page = await messagesApi.read(token, id, after);
      if (run !== generation) return;
      items.value = after ? [...items.value, ...page.items] : page.items;
      next.value = page.next;
    } catch (e) {
      if (run === generation) error.value = liveErrorMessage(e, t('Mesajlar yüklenemedi.'), {}, t);
    } finally {
      if (run === generation) loading.value = false;
    }
  }
  useClientEffect(() => [app.user?.uid, requestId()], () => {
    items.value = [];
    next.value = null;
    operationId = '';
    void load();
  });

  /** Throws a readable message; the caller keeps the draft on failure. */
  async function send(text: string) {
    const id = requestId();
    operationId ||= crypto.randomUUID();
    try {
      const sent = await messagesApi.send(token, id, text, operationId);
      operationId = '';
      if (!items.value.some(m => m.id === sent.id)) items.value = [...items.value, sent];
    } catch (e) {
      // A refused message (4xx) was not stored: the next text gets a new operation id.
      const status = errorStatus(e);
      if (status >= 400 && status < 500) operationId = '';
      throw Error(liveErrorMessage(e, t('Mesaj gönderilemedi.'), {409: t('Bu talep kapandığı için mesaj gönderilemez.')}, t));
    }
  }
  return {items, next, loading, error, load, send};
}

/** Public availability for a week (web-15 (3); v2-01: free and full slots, 30-minute slots). */
export function useAvailability(businessId: () => string, from: Ref<string>, enabled: () => boolean) {
  const {t} = useLocale();
  const data = shallowRef<LiveAvailability | null>(null);
  const loading = ref(false);
  const error = ref('');
  const reload = ref(0);
  useClientEffect(() => [businessId(), from.value, enabled(), reload.value], () => {
    if (demoMode() || !enabled() || !businessId()) return;
    let cancelled = false;
    loading.value = true;
    error.value = '';
    callApi(`/api/businesses/${encodeURIComponent(businessId())}/availability?from=${from.value}&days=7&v=2`, {}, decodeAvailability).then(value => {
      if (!cancelled) data.value = value;
    }).catch(e => {
      if (!cancelled) error.value = liveErrorMessage(e, t('Uygun saatler yüklenemedi.'), {}, t);
    }).finally(() => {
      if (!cancelled) loading.value = false;
    });
    return () => {
      cancelled = true;
    };
  });
  return {data, loading, error, refresh: () => reload.value++};
}
