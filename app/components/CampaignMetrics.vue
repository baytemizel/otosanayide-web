<script setup lang="ts">
import {ref} from 'vue';
import {Download} from '@lucide/vue';
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
  <section class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-g8 ds-wrap">
      <button class="ds-btn s" :disabled="busy" @click="get()">{{ t('Son 30 gün raporunu göster / yenile') }}</button>
      <button v-if="report" type="button" class="ds-btn s sm ds-passive" disabled aria-disabled="true" :title="t('Yakında')"><Download :size="15" aria-hidden="true"/>{{ t('CSV') }}</button>
    </div>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
    <template v-if="report">
      <h3>{{ t('Kampanya ölçümü · Son 30 gün') }}</h3>
      <p v-if="!report.enabled" class="ds-note warn">{{ t('Yeni ölçüm toplama kapalı. Gösterilen değerler yalnızca daha önce kaydedilmiş olaylardır.') }}</p>
      <p class="ds-small ds-muted">{{ t('Tarayıcı bildirimleridir; tekil kişi, kesin müşteri veya ücretlendirme verisi değildir. Engellenen ve ulaşmayan olaylar eksik sayılabilir.') }}</p>
      <div class="kpis">
        <div class="ds-kpi"><span class="ds-small ds-muted">{{ t('Gösterim') }}</span><div class="v">{{ report.views }}</div><span class="ds-xs ds-muted">{{ t('Kaydedilen görüntülenme') }}</span></div>
        <div class="ds-kpi ds-passive" aria-disabled="true" :title="t('Yakında')"><span class="ds-small ds-muted">{{ t('Görünür gösterim') }}</span><br/><span class="ds-badge neu">{{ t('Yakında') }}</span></div>
        <div class="ds-kpi"><span class="ds-small ds-muted">{{ t('Tıklama') }}</span><div class="v">{{ report.clicks }}</div><span class="ds-xs ds-muted">{{ t('Kaydedilen tıklama') }}</span></div>
        <div class="ds-kpi"><span class="ds-small ds-muted">{{ t('Tıklama / görüntülenme') }}</span><div class="v">{{ report.ctr===null?'—':`${report.ctr}%` }}</div></div>
        <div class="ds-kpi ds-passive" aria-disabled="true" :title="t('Yakında')"><span class="ds-small ds-muted">{{ t('Telefon düğmesi') }}</span><br/><span class="ds-badge neu">{{ t('Yakında') }}</span></div>
        <div class="ds-kpi ds-passive" aria-disabled="true" :title="t('Yakında')"><span class="ds-small ds-muted">{{ t('Yol tarifi') }}</span><br/><span class="ds-badge neu">{{ t('Yakında') }}</span></div>
      </div>
      <p class="ds-small ds-muted">{{ t('Tarihler reklam kartının sunulduğu Türkiye gününe göredir. Hızlı tıklamalar görüntülenmeden kaydedilebilir; oran %100 üzerinde olabilir.') }}</p>
      <div class="ds-card ds-table-wrap">
        <table class="ds-table">
          <caption class="cap">{{ t('Günlük kampanya ölçümü') }}</caption>
          <thead><tr><th>{{ t('Tarih') }}</th><th>{{ t('Görüntülenme') }}</th><th>{{ t('Tıklama') }}</th></tr></thead>
          <tbody><tr v-for="r in report.rows" :key="r.date"><td>{{ r.date }}</td><td>{{ r.views }}</td><td>{{ r.clicks }}</td></tr></tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:16px}
.ds-kpi .v{overflow-wrap:anywhere}
.ds-kpi>.ds-badge{margin-top:12px}
.cap{text-align:left;padding:20px;font-size:19px;font-weight:700;line-height:1.3}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
