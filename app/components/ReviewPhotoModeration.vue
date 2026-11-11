<script setup lang="ts">
import {computed, ref} from 'vue';
import PhotoDecisionCard from '~/components/PhotoDecisionCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
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
const selected = ref('');
const active = computed(() => items.value.find(v => v.id === selected.value)?.id ?? items.value[0]?.id ?? '');

useClientEffect(() => [app.user, app.demo, status.value, cursor.value, reload.value], () => {
  let cancel = false;
  items.value = [];
  error.value = '';
  next.value = null;
  const user = app.user, statusFilter = status.value, after = cursor.value;
  if (!user || app.demo) return;
  loading.value = true;
  user.getIdToken().then(token => apiFetch(`/api/admin/review-photos?status=${statusFilter}${after ? `&after=${encodeURIComponent(after)}` : ''}`, {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await responseJson(r);
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
    const d = await responseJson(r);
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
  <section v-if="app.demo" class="ds-card ds-pad24 ds-col ds-g8">
    <h3 style="margin:0">{{ i18nT('Yorum fotoğrafı incelemeleri') }}</h3>
    <div class="ds-small ds-muted">{{ i18nT('Fotoğraflar özel depoya alınır; yönetici tam boyutta açıp onayladıktan sonra görünür. Önizlemede gerçek fotoğraf yayımlanmaz.') }}</div>
  </section>
  <section v-else-if="app.user" class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3 style="margin:0">{{ i18nT('Yorum fotoğrafı incelemeleri') }}</h3>
      <button class="ds-btn s sm" :disabled="loading" @click="reload++">{{ i18nT('Yenile') }}</button>
    </div>
    <label class="ds-col" style="max-width:320px"><span class="ds-label">{{ i18nT('Fotoğraf durumu') }}</span><select class="ds-field" :value="status" @change="changeStatus">
      <option value="pending">{{ i18nT('İnceleme bekleyenler') }}</option>
      <option value="approved">{{ i18nT('Yayımlananlar') }}</option>
    </select></label>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
    <div v-if="loading" role="status" class="ds-small ds-muted">{{ i18nT('Yükleniyor…') }}</div>
    <div v-else-if="items.length" class="queue">
      <div class="ds-card q-list">
        <button v-for="p in items" :key="p.id" type="button" class="q-row" :class="{on:active===p.id}" :aria-pressed="active===p.id" @click="selected=p.id">
          <span class="ds-badge info">{{ i18nT('Fotoğraf') }}</span>
          <span class="ds-col ds-f1"><span class="ds-small ds-b clip">{{ p.width }} × {{ p.height }} · {{ Math.ceil(p.bytes/1024) }} KB</span><span class="ds-xs ds-muted clip">{{ p.businessId }}</span></span>
        </button>
      </div>
      <div class="ds-f1">
        <div v-for="p in items" v-show="active===p.id" :key="`${p.id}-${p.version}`" class="ds-col ds-g8">
          <a class="text-link ds-small" :href="`/servis/${encodeURIComponent(p.businessId)}#deneyimler`" target="_blank" rel="noreferrer">{{ i18nT('İlgili işletmeyi aç ↗') }}</a>
          <PhotoDecisionCard :photo="p" :onOpen="()=>open(p)" :onDecision="(decision,reason,attested)=>decide(p,decision,reason,attested)"/>
        </div>
      </div>
    </div>
    <div v-if="!loading&&!error&&!items.length" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('Bu sayfada inceleme kaydı yok.') }}</div>
    <div class="ds-row ds-wrap ds-g10">
      <button v-if="cursor" class="ds-btn s sm" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
      <button v-if="next" class="ds-btn s sm" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
    </div>
  </section>
</template>

<style scoped>
.queue{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:20px;align-items:start}
.q-list{overflow:hidden}
.q-row{display:flex;align-items:flex-start;gap:12px;width:100%;padding:14px 16px;border:0;border-bottom:1px solid #edf0f3;background:#fff;text-align:left;cursor:pointer}
.q-row:last-child{border-bottom:0}
.q-row.on{background:#fff3ec}
.q-row:focus-visible{outline-offset:-3px}
.clip{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:1100px){.queue{grid-template-columns:minmax(0,1fr)}}
</style>
