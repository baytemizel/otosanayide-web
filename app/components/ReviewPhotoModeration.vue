<script setup lang="ts">
import {ref} from 'vue';
import PhotoDecisionCard from '~/components/PhotoDecisionCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {ReviewPhoto} from '~/lib/review-photos-helpers';

type Item = ReviewPhoto & {businessId: string; reviewId: string};

const app = useApp();
const {t: i18nT} = useLocale();
const items = ref<Item[]>([]);
const status = ref('pending');
const cursor = ref('');
const next = ref<string | null>(null);
const loading = ref(false);
const error = ref('');
const reload = ref(0);

useClientEffect(() => [app.user, app.demo, status.value, cursor.value, reload.value], () => {
  let cancel = false;
  items.value = [];
  error.value = '';
  next.value = null;
  const user = app.user, statusFilter = status.value, after = cursor.value;
  if (!user || app.demo) return;
  loading.value = true;
  user.getIdToken().then(token => apiFetch(`/api/admin/review-photos?status=${statusFilter}${after ? `&after=${encodeURIComponent(after)}` : ''}`, {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (!cancel) {
      items.value = d.items;
      next.value = d.nextCursor;
    }
  }).catch(e => {
    if (!cancel) error.value = e.message;
  }).finally(() => {
    if (!cancel) loading.value = false;
  });
  return () => {
    cancel = true;
  };
});

async function request(path: string, method: string, body?: unknown) {
  const r = await apiFetch(path, {method, headers: {Authorization: `Bearer ${await app.user!.getIdToken()}`, 'Content-Type': 'application/json'}, ...(body ? {body: JSON.stringify(body)} : {})});
  if (!r.ok) {
    const d = await r.json();
    throw Error(d.error);
  }
  return r;
}
function changeStatus(e: Event) {
  status.value = (e.target as HTMLSelectElement).value;
  cursor.value = '';
}
async function open(p: Item) {
  return (await request(`/api/review-photos/media?id=${p.id}`, 'GET')).blob();
}
async function decide(p: Item, decision: string, reason: string, attested: boolean) {
  await request('/api/admin/review-photos', 'PATCH', {id: p.id, version: p.version, decision, reason, attested});
  items.value = items.value.filter(v => v.id !== p.id);
}
</script>

<template>
  <section v-if="app.demo" class="panel">
    <h2>{{ i18nT('Yorum fotoğrafı incelemeleri') }}</h2>
    <p>{{ i18nT('Fotoğraflar özel depoya alınır; yönetici tam boyutta açıp onayladıktan sonra görünür. Önizlemede gerçek fotoğraf yayımlanmaz.') }}</p>
  </section>
  <section v-else-if="app.user">
    <div class="row between">
      <h2>{{ i18nT('Yorum fotoğrafı incelemeleri') }}</h2>
      <button class="button secondary" :disabled="loading" @click="reload++">{{ i18nT('Yenile') }}</button>
    </div>
    <label>{{ i18nT('Fotoğraf durumu') }}<select :value="status" @change="changeStatus">
      <option value="pending">{{ i18nT('İnceleme bekleyenler') }}</option>
      <option value="approved">{{ i18nT('Yayımlananlar') }}</option>
    </select></label>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <p v-if="loading" role="status">{{ i18nT('Yükleniyor…') }}</p>
    <template v-else>
      <div v-for="p in items" :key="`${p.id}-${p.version}`">
        <a :href="`/servis/${encodeURIComponent(p.businessId)}#deneyimler`" target="_blank" rel="noreferrer">{{ i18nT('İlgili işletmeyi aç ↗') }}</a>
        <PhotoDecisionCard :photo="p" :onOpen="()=>open(p)" :onDecision="(decision,reason,attested)=>decide(p,decision,reason,attested)"/>
      </div>
    </template>
    <p v-if="!loading&&!error&&!items.length">{{ i18nT('Bu sayfada inceleme kaydı yok.') }}</p>
    <div class="row">
      <button v-if="cursor" class="button secondary" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
      <button v-if="next" class="button secondary" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
    </div>
  </section>
</template>
