<script setup lang="ts">
import {ref} from 'vue';
import type {MetricReport} from '@otosanayide/core/ad-metrics';
import {useLocale} from '~/composables/useLocale';

const props=defineProps<{load:()=>Promise<MetricReport>}>();

const {t}=useLocale();
const report=ref<MetricReport|null>(null);
const busy=ref(false);
const error=ref('');
let lock=false;

async function get(){
  if(lock)return;
  lock=true;
  busy.value=true;
  error.value='';
  report.value=null;
  try{
    report.value=await props.load();
  }catch(e){
    error.value=e instanceof Error?e.message:'İşlem tamamlanamadı. Daha sonra tekrar deneyin.';
  }finally{
    lock=false;
    busy.value=false;
  }
}
</script>

<template>
  <section class="stack">
    <button class="button secondary" :disabled="busy" @click="get()">{{ t('Son 30 gün raporunu göster / yenile') }}</button>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <template v-if="report">
      <h3>{{ t('Kampanya ölçümü · Son 30 gün') }}</h3>
      <p v-if="!report.enabled" class="notice">{{ t('Yeni ölçüm toplama kapalı. Gösterilen değerler yalnızca daha önce kaydedilmiş olaylardır.') }}</p>
      <p class="small muted">{{ t('Tarayıcı bildirimleridir; tekil kişi, kesin müşteri veya ücretlendirme verisi değildir. Engellenen ve ulaşmayan olaylar eksik sayılabilir.') }}</p>
      <div class="form-grid">
        <div><strong>{{ report.views }}</strong><p>{{ t('Kaydedilen görüntülenme') }}</p></div>
        <div><strong>{{ report.clicks }}</strong><p>{{ t('Kaydedilen tıklama') }}</p></div>
        <div><strong>{{ report.ctr===null?'—':`${report.ctr}%` }}</strong><p>{{ t('Tıklama / görüntülenme') }}</p></div>
      </div>
      <p class="small muted">{{ t('Tarihler reklam kartının sunulduğu Türkiye gününe göredir. Hızlı tıklamalar görüntülenmeden kaydedilebilir; oran %100 üzerinde olabilir.') }}</p>
      <div :style="{overflowX:'auto'}">
        <table>
          <caption>{{ t('Günlük kampanya ölçümü') }}</caption>
          <thead><tr><th>{{ t('Tarih') }}</th><th>{{ t('Görüntülenme') }}</th><th>{{ t('Tıklama') }}</th></tr></thead>
          <tbody><tr v-for="r in report.rows" :key="r.date"><td>{{ r.date }}</td><td>{{ r.views }}</td><td>{{ r.clicks }}</td></tr></tbody>
        </table>
      </div>
    </template>
  </section>
</template>
