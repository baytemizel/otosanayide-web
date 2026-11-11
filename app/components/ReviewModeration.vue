<script setup lang="ts">
import {computed, ref} from 'vue';
import ReviewDecisionCard from '~/components/ReviewDecisionCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import type {ReviewModerationItem as Item} from '~/lib/review-moderation-helpers';

const {t: i18nT} = useLocale();
const app = useApp();
const aiEnabled = ref(false);
const status = ref('pending');
const cursor = ref('');
const next = ref<string | null>(null);
const items = ref<Item[]>([]);
const loading = ref(false);
const error = ref('');
const message = ref('');
const reload = ref(0);
const selected = ref('');
const active = computed(() => items.value.find(v => v.id === selected.value)?.id ?? items.value[0]?.id ?? '');

useClientEffect(() => [app.user, app.demo, status.value, cursor.value, reload.value], () => {
  let cancelled = false;
  items.value = [];
  next.value = null;
  error.value = '';
  const user = app.user, statusFilter = status.value, after = cursor.value;
  if (app.demo || !user) return;
  loading.value = true;
  user.getIdToken().then(token => apiFetch(`/api/admin/reviews?status=${statusFilter}${after ? `&after=${encodeURIComponent(after)}` : ''}`, {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await responseJson(r);
    if (!r.ok) throw Error(d.error);
    if (!cancelled) {
      items.value = d.reviews;
      next.value = d.nextCursor;
      aiEnabled.value = d.aiEnabled === true;
    }
  }).catch(e => {
    if (!cancelled) error.value = e.message;
  }).finally(() => {
    if (!cancelled) loading.value = false;
  });
  return () => {
    cancelled = true;
  };
});

async function decide(item: Item, decision: 'approve' | 'reject' | 'hide', reason: string, contentReviewed: boolean) {
  const r = await apiFetch('/api/admin/reviews', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify({id: item.id, version: item.version, decision, reason, contentReviewed})});
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error);
  items.value = items.value.filter(v => v.id !== item.id);
  message.value = 'Karar kaydedildi. Yayın durumu ve puan sayacı birlikte güncellendi.';
}
async function analyze(item: Item) {
  const r = await apiFetch('/api/admin/reviews/analyze', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify({id: item.id, version: item.version})});
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error);
  items.value = items.value.map(v => (v.id === item.id ? {...v, automatic: d.automatic} : v));
}
function changeStatus(e: Event) {
  status.value = (e.target as HTMLSelectElement).value;
  cursor.value = '';
  message.value = '';
}
</script>

<template>
  <section v-if="app.demo" class="ds-card ds-pad24 ds-col ds-g8">
    <h3 style="margin:0">{{ i18nT('Yorum incelemeleri') }}</h3>
    <div class="ds-small ds-muted">{{ i18nT('Doğrulanmış yönetici hesabıyla bekleyen yorumlar incelenir; gerekçeli yayın, ret ve yayından kaldırma işlemleri yapılır. Önizlemede gerçek yorum veya onay oluşturulmaz.') }}</div>
    <div class="ds-xs ds-muted">{{ i18nT('Fotoğraflar aşağıdaki ayrı inceleme kuyruğundan yönetilir.') }}</div>
  </section>
  <section v-else-if="!app.user" class="ds-card ds-pad24"><div class="ds-small ds-muted">{{ i18nT('İnceleme için yönetici hesabıyla giriş yap.') }}</div></section>
  <section v-else class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3 style="margin:0">{{ i18nT('Yorum incelemeleri') }}</h3>
      <button class="ds-btn s sm" :disabled="loading" @click="reload++">{{ i18nT('Yenile') }}</button>
    </div>
    <label class="ds-col" style="max-width:320px"><span class="ds-label">{{ i18nT('Yorum durumu') }}</span><select class="ds-field" :value="status" @change="changeStatus">
      <option value="pending">{{ i18nT('İnceleme bekleyenler') }}</option>
      <option value="approved">{{ i18nT('Yayımlananlar') }}</option>
    </select></label>
    <div v-if="message" role="status" class="ds-note ok">{{ i18nT(message) }}</div>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
    <div v-if="loading" role="status" class="ds-small ds-muted">{{ i18nT('Yorumlar yükleniyor…') }}</div>
    <div v-else-if="items.length" class="queue">
      <div class="ds-card q-list">
        <button v-for="item in items" :key="item.id" type="button" class="q-row" :class="{on:active===item.id}" :aria-pressed="active===item.id" @click="selected=item.id">
          <span class="ds-badge warn">{{ i18nT('Yorum') }}</span>
          <span class="ds-col ds-f1"><span class="ds-small ds-b clip">{{ item.text }}</span><span class="ds-xs ds-muted clip">{{ item.rating }}/5 · {{ item.businessId }}</span></span>
        </button>
      </div>
      <div class="ds-f1">
        <ReviewDecisionCard v-for="item in items" v-show="active===item.id" :key="`${item.id}-${item.version}`" :review="item" :aiEnabled="aiEnabled" :onAnalyze="()=>analyze(item)" :onDecision="(d,r,ack)=>decide(item,d,r,ack)"/>
      </div>
    </div>
    <div v-if="!loading&&!error&&!items.length" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('Bu sayfada inceleme kaydı yok.') }}</div>
    <div class="ds-row ds-wrap ds-g10">
      <button v-if="cursor" class="ds-btn s sm" :disabled="loading" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
      <button v-if="next" class="ds-btn s sm" :disabled="loading" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
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
