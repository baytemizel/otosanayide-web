<script setup lang="ts">
import {computed, ref} from 'vue';
import CaseDecisionCard from '~/components/CaseDecisionCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import type {Item} from '~/lib/case-moderation-helpers';

const app = useApp();
const {t: i18nT} = useLocale();
const items = ref<Item[]>([]);
const cursor = ref('');
const next = ref<string | null>(null);
const reload = ref(0);
const loading = ref(false);
const error = ref('');
const selected = ref('');
const active = computed(() => items.value.find(v => v.id === selected.value)?.id ?? items.value[0]?.id ?? '');

useClientEffect(() => [app.user, app.demo, cursor.value, reload.value], () => {
  let cancelled = false;
  items.value = [];
  next.value = null;
  error.value = '';
  const user = app.user;
  const after = cursor.value;
  if (!user || app.demo) return;
  loading.value = true;
  user.getIdToken()
    .then(token => apiFetch(`/api/admin/review-cases?after=${encodeURIComponent(after)}`, {headers: {Authorization: `Bearer ${token}`}}))
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
      if (!cancelled) loading.value = false;
    });
  return () => {
    cancelled = true;
  };
});

async function decide(item: Item, decision: string, reason: string) {
  const r = await apiFetch('/api/admin/review-cases', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify({id: item.id, decision, reason, reviewed: true})});
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error);
  items.value = items.value.filter(v => v.id !== item.id);
}
</script>

<template>
  <section class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3 style="margin:0">{{ i18nT('Şikâyet ve itirazlar') }}</h3>
      <button v-if="!app.demo&&app.user" class="ds-btn s sm" :disabled="loading" @click="reload++">{{ i18nT('Yenile') }}</button>
    </div>
    <div v-if="app.demo" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('Önizlemede gerçek başvuru oluşturulmaz.') }}</div>
    <div v-else-if="!app.user" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('İnceleme için yönetici hesabıyla giriş yap.') }}</div>
    <template v-else>
      <div v-if="loading" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</div>
      <div v-else-if="items.length" class="queue">
        <div class="ds-card q-list">
          <button v-for="item in items" :key="item.id" type="button" class="q-row" :class="{on:active===item.id}" :aria-pressed="active===item.id" @click="selected=item.id">
            <span class="ds-badge" :class="item.kind==='report'?'warn':'err'">{{ i18nT(item.kind==='report'?'Yorumu bildir':'Karara itiraz et') }}</span>
            <span class="ds-col ds-f1"><span class="ds-small ds-b clip">{{ item.text }}</span><span class="ds-xs ds-muted clip">{{ item.businessId }}</span></span>
          </button>
        </div>
        <div class="ds-f1">
          <CaseDecisionCard v-for="item in items" v-show="active===item.id" :key="item.id" :item="item" :onDecision="(decision: string, reason: string) => decide(item, decision, reason)"/>
        </div>
      </div>
      <div v-if="!loading&&!items.length&&!error" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('Bu sayfada başvuru yok.') }}</div>
      <div class="ds-row ds-wrap ds-g10">
        <button v-if="cursor" class="ds-btn s sm" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
        <button v-if="next" class="ds-btn s sm" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
      </div>
    </template>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
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
