<script setup lang="ts">
import {computed, ref} from 'vue';
import {RefreshCw, Settings} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import {contractReady} from '~/lib/contract';
import {readAllNotifications} from '~/lib/notifications-read';
import type {Notice} from '~/lib/notifications-helpers';
import NotificationCard from '~/components/NotificationCard.vue';

const app = useApp();
const {t: i18nT} = useLocale();
const items = ref<Notice[]>([]);
const cursor = ref('');
const next = ref<string | null>(null);
const reload = ref(0);
const busy = ref(false);
const error = ref('');
const tabs = [{value: 'all', label: 'Tümü'}, {value: 'requests', label: 'Talepler'}, {value: 'reminders', label: 'Araçlarım'}] as const;
const tab = ref<(typeof tabs)[number]['value']>('all');
/** With web-11 the API filters by kind; the local filter stays as a safety net for older APIs. */
const visible = computed(() => items.value.filter(n => tab.value === 'all' || (tab.value === 'reminders') === (n.kind === 'reminder')));
const kindParam = computed(() => (contractReady.notificationsReadAll && tab.value !== 'all' ? (tab.value === 'reminders' ? 'reminder' : 'request') : ''));
const markingAll = ref(false);
function selectTab(value: typeof tab.value) {
  tab.value = value;
  cursor.value = '';
}
async function markAllRead() {
  const user = app.user;
  if (!user || markingAll.value) return;
  markingAll.value = true;
  error.value = '';
  try {
    const updated = await readAllNotifications(() => user.getIdToken(), Date.now());
    app.notify(updated ? i18nT('{0} bildirim okundu olarak işaretlendi.', {'0': updated}) : 'Okunmamış bildirim yok.');
    items.value = items.value.map(n => ({...n, read: true}));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı. Tekrar dene.';
  } finally {
    markingAll.value = false;
  }
}

useClientEffect(() => [app.user, app.demo, cursor.value, reload.value, kindParam.value], () => {
  let cancelled = false;
  items.value = [];
  next.value = null;
  const user = app.user;
  if (!user || app.demo) return;
  busy.value = true;
  error.value = '';
  const after = cursor.value;
  user.getIdToken()
    .then(token => apiFetch(`/api/notifications?after=${encodeURIComponent(after)}${kindParam.value ? '&kind=' + kindParam.value : ''}`, {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await responseJson(r);
      if (!r.ok) throw Error(d.error);
      if (!cancelled) {
        items.value = d.items;
        next.value = d.next;
      }
    })
    .catch(e => {
      if (!cancelled) error.value = e.message;
    })
    .finally(() => {
      if (!cancelled) busy.value = false;
    });
  return () => {
    cancelled = true;
  };
});

async function markRead(n: Notice, read: boolean) {
  const user = app.user!;
  const r = await apiFetch('/api/notifications', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify({id: n.id, read})});
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error);
  items.value = items.value.map(v => (v.id === n.id ? {...v, read} : v));
}
</script>

<template>
  <section class="ds-col ds-g16 inbox">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h1 class="ds-serif">{{ i18nT('Bildirimler') }}</h1>
      <div v-if="app.user&&!app.demo" class="ds-row ds-g10 ds-wrap">
        <button v-if="contractReady.notificationsReadAll" type="button" class="ds-btn g sm" :disabled="markingAll" @click="markAllRead">{{ markingAll ? i18nT('İşleniyor…') : i18nT('Tümünü okundu yap') }}</button>
        <button v-else type="button" class="ds-btn g sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Tümünü okundu yap') }}</button>
        <NuxtLink class="ds-btn s sm" to="/hesabim#gizlilik"><Settings :size="15"/>{{ i18nT('Tercihler') }}</NuxtLink>
      </div>
    </div>
    <p class="ds-small ds-muted">{{ i18nT('Uygulama içi talep güncellemeleri ve araç hatırlatmaları. E-posta veya push gönderildiği anlamına gelmez.') }}</p>
    <p v-if="app.demo" class="ds-note info">{{ i18nT('Önizlemede gerçek bildirim oluşturulmaz.') }}</p>
    <NuxtLink v-else-if="!app.user" class="ds-btn p inbox-login" to="/giris">{{ i18nT('Giriş yap') }}</NuxtLink>
    <template v-else>
      <div><button type="button" class="ds-btn s" :disabled="busy" @click="reload++"><RefreshCw :size="16"/>{{ i18nT('Yenile') }}</button></div>
      <div class="ds-tabs inbox-tabs" role="group" :aria-label="i18nT('Bildirim türü')">
        <button v-for="item in tabs" :key="item.value" type="button" :class="{on: tab===item.value}" :aria-pressed="tab===item.value" @click="selectTab(item.value)">{{ i18nT(item.label) }}</button>
        <button type="button" class="ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Yorumlar') }}</button>
      </div>
      <p v-if="busy" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</p>
      <div v-else-if="visible.length" class="ds-card inbox-list"><NotificationCard v-for="n in visible" :key="n.id" :notice="n" :onRead="read=>markRead(n,read)"/></div>
      <p v-if="!busy&&!error&&!visible.length" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('Bu sayfada bildirim yok.') }}</p>
      <div v-if="cursor||next" class="ds-row ds-g10"><button v-if="cursor" type="button" class="ds-btn s sm" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button><button v-if="next" type="button" class="ds-btn s sm" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button></div>
    </template>
    <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>

<style scoped>
h1 {margin: 0; font-size: 34px; line-height: 38px;}
p {margin: 0;}
.inbox-login {align-self: flex-start;}
.inbox-tabs {overflow-x: auto;}
.inbox-tabs button {flex: none; white-space: nowrap;}
.inbox-tabs button:focus-visible {outline: 2px solid #2459b4; outline-offset: -2px;}
.inbox-list {overflow: hidden;}
@media (max-width: 480px) {
  h1 {font-size: 28px; line-height: 32px;}
}
</style>
