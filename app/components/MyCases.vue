<script setup lang="ts">
import {ref} from 'vue';
import {RefreshCw} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
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
</script>

<template>
  <section class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h1 class="ds-serif">{{ i18nT('Başvurularım') }}</h1>
      <button v-if="app.user&&!app.demo" type="button" class="ds-btn s sm" :disabled="loading" @click="reload++"><RefreshCw :size="15"/>{{ i18nT('Yenile') }}</button>
    </div>
    <p class="ds-small ds-muted">{{ i18nT('Şikâyet ve itirazlarının durumunu ve karar gerekçelerini burada takip et.') }}</p>
    <p v-if="app.demo" class="ds-note info">{{ i18nT('Önizlemede gerçek başvuru oluşturulmaz.') }}</p>
    <NuxtLink v-else-if="!app.user" class="ds-btn p cases-login" to="/giris">{{ i18nT('Giriş yap') }}</NuxtLink>
    <template v-else>
      <p v-if="loading" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</p>
      <template v-else><CaseStatusCard v-for="item in items" :key="item.id" :item="item"/></template>
      <p v-if="!loading&&!items.length&&!error" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('Bu sayfada başvuru yok.') }}</p>
      <div v-if="cursor||next" class="ds-row ds-g10"><button v-if="cursor" type="button" class="ds-btn s sm" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button><button v-if="next" type="button" class="ds-btn s sm" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button></div>
    </template>
    <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>

<style scoped>
h1 {margin: 0; font-size: 34px; line-height: 38px;}
p {margin: 0;}
.cases-login {align-self: flex-start;}
@media (max-width: 480px) {
  h1 {font-size: 28px; line-height: 32px;}
}
</style>
