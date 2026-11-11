<script setup lang="ts">
import {computed, ref} from 'vue';
import type {AiModeration, LocalModeration} from '@otosanayide/core/content-moderation';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
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
const selected = ref('');
const active = computed(() => items.value.find(v => v.id === selected.value)?.id ?? items.value[0]?.id ?? '');

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
      const d = await responseJson(r);
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
  const d = await responseJson(r);
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
  <section v-if="app.demo" class="ds-card ds-pad24 ds-col ds-g8"><h3 style="margin:0">{{ i18nT("İşletme yanıtı incelemeleri") }}</h3><div class="ds-small ds-muted">{{ i18nT("İşletme yanıtları da kelime filtresi, isteğe bağlı AI ve gerekçeli yönetici incelemesinden geçer. Yanıt kararları müşteri puanını değiştirmez.") }}</div></section>
  <section v-else-if="app.user" class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12"><h3 style="margin:0">{{ i18nT("İşletme yanıtı incelemeleri") }}</h3><button class="ds-btn s sm" :disabled="loading" @click="reload++">{{ i18nT("Yenile") }}</button></div>
    <label class="ds-col" style="max-width:320px"><span class="ds-label">{{ i18nT("Yanıt durumu") }}</span><select class="ds-field" :value="status" @change="selectStatus"><option value="pending">{{ i18nT("İnceleme bekleyenler") }}</option><option value="approved">{{ i18nT("Yayımlananlar") }}</option></select></label>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
    <div v-if="loading" role="status" class="ds-small ds-muted">{{ i18nT("Yükleniyor…") }}</div>
    <div v-else-if="items.length" class="queue">
      <div class="ds-card q-list">
        <button v-for="item in items" :key="item.id" type="button" class="q-row" :class="{on:active===item.id}" :aria-pressed="active===item.id" @click="selected=item.id">
          <span class="ds-badge neu">{{ i18nT("Yanıt") }}</span>
          <span class="ds-col ds-f1"><span class="ds-small ds-b clip">{{ item.text }}</span><span class="ds-xs ds-muted clip">{{ item.businessId }}</span></span>
        </button>
      </div>
      <div class="ds-f1">
        <template v-for="item in items" :key="item.parent?`${item.id}-${item.version}`:item.id">
          <ReviewDecisionCard v-if="item.parent" v-show="active===item.id" :review="{...item.parent,id:item.id,businessId:item.businessId,version:item.version,status:item.status,automatic:item.automatic}" :replyText="item.text" :aiEnabled="aiEnabled" :onAnalyze="()=>analyze(item)" :onDecision="(decision,reason,contentReviewed)=>decide(item,decision,reason,contentReviewed)"/>
          <div v-else v-show="active===item.id" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT("İlgili yorum bulunamadı; kayıt inceleme gerektiriyor.") }}</div>
        </template>
      </div>
    </div>
    <div v-if="!loading&&!error&&!items.length" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT("Bu sayfada inceleme kaydı yok.") }}</div>
    <div class="ds-row ds-wrap ds-g10"><button v-if="cursor" class="ds-btn s sm" @click="cursor=''">{{ i18nT("İlk sayfa") }}</button><button v-if="next" class="ds-btn s sm" @click="cursor=next!">{{ i18nT("Sonraki sayfa") }}</button></div>
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
