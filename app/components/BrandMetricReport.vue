<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
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
    const r = await apiFetch('/api/admin/brand-metrics?' + new URLSearchParams({campaignId}), {headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`}, cache: 'no-store'}), d = await r.json();
    if (!r.ok) throw Error(d.error);
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
  <section class="panel stack">
    <h4>{{ t('Marka Reklamı Performansı') }}</h4>
    <p>{{ t('Son 30 gün · İstanbul saati. Aynı sunumun tekrarlanan bildirimleri bir kez sayılır; benzersiz kişi sayısı değildir.') }}</p>
    <p v-if="demo||!campaignId">{{ t('Performansı görmek için kayıtlı gerçek kampanyayı yükle.') }}</p>
    <button v-else class="button secondary" :disabled="busy" @click="void load()">{{ t('Marka performansını yenile') }}</button>
    <template v-if="report">
      <p v-if="!report.enabled" class="notice">{{ t('Yeni ölçüm kaydı kapalı. Geçmiş sonuçlar gösteriliyor.') }}</p>
      <div class="form-grid">
        <p>{{ t('Gösterim') }}: <strong>{{ number(report.views) }}</strong></p>
        <p>{{ t('Tıklama') }}: <strong>{{ number(report.clicks) }}</strong></p>
        <p>{{ t('Tıklama oranı') }}: <strong>{{ report.ctr===null?t('Bilgi yok'):number(report.ctr)+'%' }}</strong></p>
      </div>
      <div :style="{overflowX:'auto'}">
        <table>
          <thead><tr><th>{{ t('Tarih') }}</th><th>{{ t('Gösterim') }}</th><th>{{ t('Tıklama') }}</th></tr></thead>
          <tbody><tr v-for="row in report.rows" :key="row.date"><td>{{ row.date }}</td><td>{{ number(row.views) }}</td><td>{{ number(row.clicks) }}</td></tr></tbody>
        </table>
      </div>
      <small>{{ t('İstemci bildirimlerine dayalı operasyonel ölçümdür; faturalama veya bağımsız görünürlük denetimi değildir.') }}</small>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
  </section>
</template>
