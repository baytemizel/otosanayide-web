<script setup lang="ts">
import {ref} from 'vue';
import CatalogueHistoryList from '~/components/CatalogueHistoryList.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import type {Page} from '~/lib/catalogue-history-helpers';

const props = defineProps<{loadPage: (cursor: string) => Promise<Page>}>();
const {t: i18nT} = useLocale();
const open = ref(false);
const cursor = ref('');
const refresh = ref(0);
const page = ref<Page>({items: [], next: null});
const busy = ref(false);
const error = ref('');

useClientEffect(() => [open.value, cursor.value, refresh.value, props.loadPage], () => {
  if (!open.value) return;
  let cancelled = false;
  busy.value = true;
  error.value = '';
  page.value = {items: [], next: null};
  props.loadPage(cursor.value)
    .then(p => {
      if (!cancelled) page.value = p;
    })
    .catch(e => {
      if (!cancelled) error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
    })
    .finally(() => {
      if (!cancelled) busy.value = false;
    });
  return () => {
    cancelled = true;
  };
});
</script>

<template>
  <section class="stack">
    <button class="button secondary compact" :aria-expanded="open" @click="open=!open">{{ i18nT(open?'Karar geçmişini kapat':'Karar geçmişini göster') }}</button>
    <template v-if="open">
      <h4>{{ i18nT('İşletme karar geçmişi') }}</h4>
      <p class="small muted">{{ i18nT('En yeni kayıt önce gösterilir. Bu ekran salt okunurdur; yönetici kimlikleri ve ham belgeler gösterilmez.') }}</p>
      <button class="button secondary compact" :disabled="busy" @click="cursor='';refresh++">{{ i18nT('Yenile') }}</button>
      <p v-if="busy" role="status">{{ i18nT('Yükleniyor…') }}</p>
      <p v-else-if="error" role="alert">{{ i18nT(error) }}</p>
      <CatalogueHistoryList v-else-if="page.items.length" :items="page.items"/>
      <p v-else>{{ i18nT('Bu sayfada geçmiş kaydı bulunamadı.') }}</p>
      <div class="row">
        <button v-if="cursor" class="button secondary compact" :disabled="busy" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
        <button v-if="page.next" class="button secondary compact" :disabled="busy" @click="cursor=page.next!">{{ i18nT('Daha eski kayıtlar') }}</button>
      </div>
    </template>
  </section>
</template>
