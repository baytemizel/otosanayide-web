<script setup lang="ts">
import {ref} from 'vue';
import type {AiModeration, LocalModeration} from '@otosanayide/core/content-moderation';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {ReviewView} from '~/lib/reviews-helpers';
import ReviewDecisionCard from '~/components/ReviewDecisionCard.vue';

type ReplyItem = {id: string; businessId: string; text: string; status: 'pending' | 'approved'; version: number; parent: ReviewView | null; automatic: {local: LocalModeration; ai: AiModeration}};

const {t: i18nT} = useLocale();
const app = useApp();
const items = ref<ReplyItem[]>([]);
const status = ref('pending');
const cursor = ref('');
const next = ref<string | null>(null);
const loading = ref(false);
const error = ref('');
const reload = ref(0);
const aiEnabled = ref(false);

useClientEffect(() => [app.user, app.demo, status.value, cursor.value, reload.value], () => {
  let cancel = false;
  items.value = [];
  next.value = null;
  const user = app.user;
  if (!user || app.demo) return;
  loading.value = true;
  error.value = '';
  const current = status.value, after = cursor.value;
  user.getIdToken()
    .then(token => apiFetch(`/api/admin/replies?status=${current}${after ? `&after=${encodeURIComponent(after)}` : ''}`, {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (!cancel) {
        items.value = d.replies;
        next.value = d.nextCursor;
        aiEnabled.value = d.aiEnabled;
      }
    })
    .catch(e => {
      if (!cancel) error.value = e.message;
    })
    .finally(() => {
      if (!cancel) loading.value = false;
    });
  return () => {
    cancel = true;
  };
});

async function request(path: string, method: string, data: unknown) {
  const r = await apiFetch(path, {method, headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify(data)});
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  return d;
}

function selectStatus(e: Event) {
  status.value = (e.target as HTMLSelectElement).value;
  cursor.value = '';
}

async function analyze(item: ReplyItem) {
  const d = await request('/api/admin/reviews/analyze', 'POST', {id: item.id, version: item.version, kind: 'reply'});
  items.value = items.value.map(v => (v.id === item.id ? {...v, automatic: d.automatic} : v));
}

async function decide(item: ReplyItem, decision: 'approve' | 'reject' | 'hide', reason: string, contentReviewed: boolean) {
  await request('/api/admin/replies', 'PATCH', {id: item.id, version: item.version, decision, reason, contentReviewed});
  items.value = items.value.filter(v => v.id !== item.id);
}
</script>

<template>
  <section v-if="app.demo" class="panel"><h2>{{ i18nT("İşletme yanıtı incelemeleri") }}</h2><p>{{ i18nT("İşletme yanıtları da kelime filtresi, isteğe bağlı AI ve gerekçeli yönetici incelemesinden geçer. Yanıt kararları müşteri puanını değiştirmez.") }}</p></section>
  <section v-else-if="app.user">
    <div class="row between"><h2>{{ i18nT("İşletme yanıtı incelemeleri") }}</h2><button class="button secondary" :disabled="loading" @click="reload++">{{ i18nT("Yenile") }}</button></div>
    <label>{{ i18nT("Yanıt durumu") }}<select :value="status" @change="selectStatus"><option value="pending">{{ i18nT("İnceleme bekleyenler") }}</option><option value="approved">{{ i18nT("Yayımlananlar") }}</option></select></label>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <p v-if="loading" role="status">{{ i18nT("Yükleniyor…") }}</p>
    <template v-else>
      <template v-for="item in items" :key="item.parent?`${item.id}-${item.version}`:item.id">
        <ReviewDecisionCard v-if="item.parent" :review="{...item.parent,id:item.id,businessId:item.businessId,version:item.version,status:item.status,automatic:item.automatic}" :replyText="item.text" :aiEnabled="aiEnabled" :onAnalyze="()=>analyze(item)" :onDecision="(decision,reason,contentReviewed)=>decide(item,decision,reason,contentReviewed)"/>
        <p v-else>{{ i18nT("İlgili yorum bulunamadı; kayıt inceleme gerektiriyor.") }}</p>
      </template>
    </template>
    <p v-if="!loading&&!error&&!items.length">{{ i18nT("Bu sayfada inceleme kaydı yok.") }}</p>
    <div class="row"><button v-if="cursor" class="button secondary" @click="cursor=''">{{ i18nT("İlk sayfa") }}</button><button v-if="next" class="button secondary" @click="cursor=next!">{{ i18nT("Sonraki sayfa") }}</button></div>
  </section>
</template>
