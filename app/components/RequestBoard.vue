<script setup lang="ts">
import {ref} from 'vue';
import RequestCard from '~/components/RequestCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {RequestItem} from '~/lib/request-board-helpers';

const props = withDefaults(defineProps<{business?: boolean}>(), {business: false});

const app = useApp();
const {t: i18nT} = useLocale();
const branches = ref<{id: string; name: string}[]>([]);
const bid = ref('');
const items = ref<RequestItem[]>([]);
const cursor = ref('');
const next = ref<string | null>(null);
const reload = ref(0);
const busy = ref(false);
const error = ref('');

useClientEffect(() => [props.business, app.user, app.demo], () => {
  let cancelled = false;
  const user = app.user;
  if (!props.business || !user || app.demo) return;
  user.getIdToken().then(token => apiFetch('/api/businesses/manage', {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (!cancelled) {
      branches.value = d.businesses;
      bid.value = d.businesses[0]?.id ?? '';
    }
  }).catch(e => {
    if (!cancelled) error.value = e.message;
  });
  return () => {
    cancelled = true;
  };
});
useClientEffect(() => [app.user, app.demo, props.business, bid.value, cursor.value, reload.value], () => {
  let cancelled = false;
  items.value = [];
  next.value = null;
  const user = app.user, business = props.business, branch = bid.value, after = cursor.value;
  if (!user || app.demo || (business && !branch)) return;
  busy.value = true;
  error.value = '';
  user.getIdToken().then(token => apiFetch(`/api/requests?after=${encodeURIComponent(after)}${business ? `&businessId=${encodeURIComponent(branch)}` : ''}`, {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (!cancelled) {
      items.value = d.items;
      next.value = d.next;
    }
  }).catch(e => {
    if (!cancelled) error.value = e.message;
  }).finally(() => {
    if (!cancelled) busy.value = false;
  });
  return () => {
    cancelled = true;
  };
});

function changeBranch(e: Event) {
  bid.value = (e.target as HTMLSelectElement).value;
  cursor.value = '';
}
async function action(value: Record<string, unknown>) {
  const r = await apiFetch('/api/requests', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify(value)});
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  reload.value++;
}
</script>

<template>
  <section class="stack">
    <h2>{{ i18nT('Teklif ve randevular') }}</h2>
    <p>{{ i18nT('Yanıtları ve talep durumunu buradan takip et. Otomatik e-posta veya bildirim gönderimi henüz açık değil.') }}</p>
    <p v-if="app.demo" class="notice">{{ i18nT('Önizlemede gerçek talep veya rezervasyon oluşturulmaz.') }}</p>
    <NuxtLink v-else-if="!app.user" to="/giris">{{ i18nT('Giriş yap') }}</NuxtLink>
    <template v-else>
      <label v-if="business">{{ i18nT('İşletme / şube') }}<select :value="bid" @change="changeBranch">
        <option value="">{{ i18nT('İşletme seç') }}</option>
        <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select></label>
      <button class="button secondary" :disabled="busy" @click="reload++">{{ i18nT('Yenile') }}</button>
      <p v-if="busy" role="status">{{ i18nT('Yükleniyor…') }}</p>
      <template v-else>
        <RequestCard v-for="item in items" :key="`${item.id}-${item.version}`" :item="item" :business="business" :onAction="action"/>
      </template>
      <p v-if="!busy&&!error&&!items.length">{{ i18nT('Bu sayfada talep yok.') }}</p>
      <div class="row">
        <button v-if="cursor" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
        <button v-if="next" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
      </div>
    </template>
    <p v-if="error" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>
