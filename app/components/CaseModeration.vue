<script setup lang="ts">
import {ref} from 'vue';
import CaseDecisionCard from '~/components/CaseDecisionCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {Item} from '~/lib/case-moderation-helpers';

const app = useApp();
const {t: i18nT} = useLocale();
const items = ref<Item[]>([]);
const cursor = ref('');
const next = ref<string | null>(null);
const reload = ref(0);
const loading = ref(false);
const error = ref('');

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
      const d = await r.json();
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
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  items.value = items.value.filter(v => v.id !== item.id);
}
</script>

<template>
  <section class="panel">
    <h2>{{ i18nT('Şikâyet ve itirazlar') }}</h2>
    <p v-if="app.demo">{{ i18nT('Önizlemede gerçek başvuru oluşturulmaz.') }}</p>
    <p v-else-if="!app.user">{{ i18nT('İnceleme için yönetici hesabıyla giriş yap.') }}</p>
    <template v-else>
      <button class="button secondary" :disabled="loading" @click="reload++">{{ i18nT('Yenile') }}</button>
      <p v-if="loading" role="status">{{ i18nT('Yükleniyor…') }}</p>
      <template v-else>
        <CaseDecisionCard v-for="item in items" :key="item.id" :item="item" :onDecision="(decision: string, reason: string) => decide(item, decision, reason)"/>
      </template>
      <p v-if="!loading&&!items.length&&!error">{{ i18nT('Bu sayfada başvuru yok.') }}</p>
      <div class="row">
        <button v-if="cursor" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
        <button v-if="next" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
      </div>
    </template>
    <p v-if="error" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>
