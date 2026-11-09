<script setup lang="ts">
import {ref} from 'vue';
import ReviewDecisionCard from '~/components/ReviewDecisionCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
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

useClientEffect(() => [app.user, app.demo, status.value, cursor.value, reload.value], () => {
  let cancelled = false;
  items.value = [];
  next.value = null;
  error.value = '';
  const user = app.user, statusFilter = status.value, after = cursor.value;
  if (app.demo || !user) return;
  loading.value = true;
  user.getIdToken().then(token => apiFetch(`/api/admin/reviews?status=${statusFilter}${after ? `&after=${encodeURIComponent(after)}` : ''}`, {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await r.json();
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
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  items.value = items.value.filter(v => v.id !== item.id);
  message.value = 'Karar kaydedildi. Yayın durumu ve puan sayacı birlikte güncellendi.';
}
async function analyze(item: Item) {
  const r = await apiFetch('/api/admin/reviews/analyze', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify({id: item.id, version: item.version})});
  const d = await r.json();
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
  <section v-if="app.demo" class="panel">
    <h2>{{ i18nT('Yorum incelemeleri') }}</h2>
    <p>{{ i18nT('Doğrulanmış yönetici hesabıyla bekleyen yorumlar incelenir; gerekçeli yayın, ret ve yayından kaldırma işlemleri yapılır. Önizlemede gerçek yorum veya onay oluşturulmaz.') }}</p>
    <p class="small muted">{{ i18nT('Fotoğraflar aşağıdaki ayrı inceleme kuyruğundan yönetilir.') }}</p>
  </section>
  <p v-else-if="!app.user">{{ i18nT('İnceleme için yönetici hesabıyla giriş yap.') }}</p>
  <template v-else>
    <div class="row between">
      <h2>{{ i18nT('Yorum incelemeleri') }}</h2>
      <button class="button secondary" :disabled="loading" @click="reload++">{{ i18nT('Yenile') }}</button>
    </div>
    <label>{{ i18nT('Yorum durumu') }}<select :value="status" @change="changeStatus">
      <option value="pending">{{ i18nT('İnceleme bekleyenler') }}</option>
      <option value="approved">{{ i18nT('Yayımlananlar') }}</option>
    </select></label>
    <p v-if="message" role="status" class="notice">{{ i18nT(message) }}</p>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <p v-if="loading" role="status">{{ i18nT('Yorumlar yükleniyor…') }}</p>
    <template v-else>
      <ReviewDecisionCard v-for="item in items" :key="`${item.id}-${item.version}`" :review="item" :aiEnabled="aiEnabled" :onAnalyze="()=>analyze(item)" :onDecision="(d,r,ack)=>decide(item,d,r,ack)"/>
    </template>
    <p v-if="!loading&&!error&&!items.length">{{ i18nT('Bu sayfada inceleme kaydı yok.') }}</p>
    <div class="row">
      <button v-if="cursor" class="button secondary" :disabled="loading" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
      <button v-if="next" class="button secondary" :disabled="loading" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
    </div>
  </template>
</template>
