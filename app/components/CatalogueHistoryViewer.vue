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
  <section class="ds-col ds-g12">
    <div><button class="ds-btn s sm" :aria-expanded="open" @click="open=!open">{{ i18nT(open?'Karar geçmişini kapat':'Karar geçmişini göster') }}</button></div>
    <template v-if="open">
      <div class="ds-row ds-sb ds-wrap ds-g12">
        <h4 style="font-size:16px;margin:0">{{ i18nT('İşletme karar geçmişi') }}</h4>
        <button class="ds-btn s sm" :disabled="busy" @click="cursor='';refresh++">{{ i18nT('Yenile') }}</button>
      </div>
      <div class="ds-xs ds-muted">{{ i18nT('En yeni kayıt önce gösterilir. Bu ekran salt okunurdur; yönetici kimlikleri ve ham belgeler gösterilmez.') }}</div>
      <div v-if="busy" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</div>
      <div v-else-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
      <CatalogueHistoryList v-else-if="page.items.length" :items="page.items"/>
      <div v-else class="ds-small ds-muted">{{ i18nT('Bu sayfada geçmiş kaydı bulunamadı.') }}</div>
      <div class="ds-row ds-wrap ds-g10">
        <button v-if="cursor" class="ds-btn s sm" :disabled="busy" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
        <button v-if="page.next" class="ds-btn s sm" :disabled="busy" @click="cursor=page.next!">{{ i18nT('Daha eski kayıtlar') }}</button>
      </div>
    </template>
  </section>
</template>
