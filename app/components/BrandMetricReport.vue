<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {brandMetricResponse, readAdResponse} from '~/lib/ads-client';
import {apiFetch} from '~/lib/api';
import type {MetricReport} from '@otosanayide/core/ad-metrics';

const props = withDefaults(defineProps<{campaignId?: string; demo?: boolean}>(), {demo: false});
const app = useApp();
const {t, localeTag} = useLocale();
const report = ref<MetricReport | null>(null);
const busy = ref(false);
const error = ref('');
let lock = false;

async function load() {
  const campaignId = props.campaignId;
  if (props.demo || !campaignId || lock) return;
  lock = true;
  busy.value = true;
  report.value = null;
  error.value = '';
  try {
    const r = await apiFetch('/api/admin/brand-metrics?' + new URLSearchParams({campaignId}), {headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`}, cache: 'no-store'}), d = await readAdResponse(r, raw => brandMetricResponse.parse(raw));
    if (d.campaignId !== campaignId) throw Error('Kayıt değişti. Sayfayı yenile.');
    report.value = d;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı. Daha sonra tekrar deneyin.';
  } finally {
    lock = false;
    busy.value = false;
  }
}

const number = (n: number) => new Intl.NumberFormat(localeTag.value).format(n);
</script>

<template>
  <section class="sec ds-col ds-g12">
    <h4>{{ t('Marka Reklamı Performansı') }}</h4>
    <p>{{ t('Son 30 gün · İstanbul saati. Aynı sunumun tekrarlanan bildirimleri bir kez sayılır; benzersiz kişi sayısı değildir.') }}</p>
    <p v-if="demo||!campaignId">{{ t('Performansı görmek için kayıtlı gerçek kampanyayı yükle.') }}</p>
    <button v-else class="ds-btn s" :disabled="busy" @click="void load()">{{ t('Marka performansını yenile') }}</button>
    <template v-if="report">
      <p v-if="!report.enabled" class="ds-note warn ds-col">{{ t('Yeni ölçüm kaydı kapalı. Geçmiş sonuçlar gösteriliyor.') }}</p>
      <div class="kpis">
        <div class="ds-kpi"><span class="ds-small ds-muted">{{ t('Gösterim') }}</span><div class="v">{{ number(report.views) }}</div></div>
        <div class="ds-kpi"><span class="ds-small ds-muted">{{ t('Tıklama') }}</span><div class="v">{{ number(report.clicks) }}</div></div>
        <div class="ds-kpi"><span class="ds-small ds-muted">{{ t('Tıklama oranı') }}</span><div class="v">{{ report.ctr===null?t('Bilgi yok'):number(report.ctr)+'%' }}</div></div>
      </div>
      <div class="ds-table-wrap">
        <table class="ds-table">
          <thead><tr><th>{{ t('Tarih') }}</th><th>{{ t('Gösterim') }}</th><th>{{ t('Tıklama') }}</th></tr></thead>
          <tbody><tr v-for="row in report.rows" :key="row.date"><td>{{ row.date }}</td><td>{{ number(row.views) }}</td><td>{{ number(row.clicks) }}</td></tr></tbody>
        </table>
      </div>
      <small class="ds-xs ds-muted">{{ t('İstemci bildirimlerine dayalı operasyonel ölçümdür; faturalama veya bağımsız görünürlük denetimi değildir.') }}</small>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.sec{border-top:1px solid #edf0f3;padding-top:20px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:16px}
.ds-kpi .v{overflow-wrap:anywhere}
.ds-kpi>.ds-badge{margin-top:12px}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
