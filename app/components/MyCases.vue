<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {CaseItem} from '~/lib/review-cases-helpers';
import CaseStatusCard from '~/components/CaseStatusCard.vue';

const app = useApp();
const {t: i18nT} = useLocale();
const items = ref<CaseItem[]>([]);
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
  if (!user || app.demo) return;
  loading.value = true;
  const after = cursor.value;
  user.getIdToken()
    .then(token => apiFetch(`/api/review-cases?after=${encodeURIComponent(after)}`, {headers: {Authorization: `Bearer ${token}`}}))
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
</script>

<template>
  <section class="section">
    <h1>{{ i18nT('Başvurularım') }}</h1>
    <p>{{ i18nT('Şikâyet ve itirazlarının durumunu ve karar gerekçelerini burada takip et.') }}</p>
    <p v-if="app.demo">{{ i18nT('Önizlemede gerçek başvuru oluşturulmaz.') }}</p>
    <NuxtLink v-else-if="!app.user" to="/giris">{{ i18nT('Giriş yap') }}</NuxtLink>
    <template v-else>
      <button class="button secondary" :disabled="loading" @click="reload++">{{ i18nT('Yenile') }}</button>
      <p v-if="loading" role="status">{{ i18nT('Yükleniyor…') }}</p>
      <template v-else><CaseStatusCard v-for="item in items" :key="item.id" :item="item"/></template>
      <p v-if="!loading&&!items.length&&!error">{{ i18nT('Bu sayfada başvuru yok.') }}</p>
      <div class="row"><button v-if="cursor" class="button secondary" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button><button v-if="next" class="button secondary" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button></div>
    </template>
    <p v-if="error" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>
