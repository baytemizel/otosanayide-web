<script setup lang="ts">
import {computed, ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {adminApi} from '~/lib/admin-api';

/** web-16 (1): queue counts the admin's role may see; no finance or revenue figures. */
const app = useApp();
const {t: i18nT, localeTag} = useLocale();
const queues = ref<Record<string, number> | null>(null);
const generatedAt = ref(0);
const error = ref('');
const labels: Record<string, string> = {claims: 'Sahiplik başvuruları', reviews: 'Yorumlar', reviewPhotos: 'Yorum fotoğrafları', replies: 'İşletme yanıtları', businessChanges: 'Profil değişiklikleri', reviewCases: 'Şikâyet ve itirazlar', businessPhotos: 'İşletme fotoğrafları', privacy: 'Silme talepleri', privacyExports: 'Veri kopyası talepleri', businessReports: 'Yanlış bilgi bildirimleri'};
const rows = computed(() => Object.entries(queues.value ?? {}).map(([key, value]) => ({key, label: labels[key] ?? key, value})));

useClientEffect(() => [app.user, app.demo], () => {
  const user = app.user;
  if (!user || app.demo) return;
  let cancelled = false;
  adminApi.overview(() => user.getIdToken()).then(v => {
    if (cancelled) return;
    queues.value = v.queues;
    generatedAt.value = v.generatedAtMs;
  }).catch(e => {
    if (!cancelled) error.value = e instanceof Error ? e.message : 'Özet yüklenemedi.';
  });
  return () => {
    cancelled = true;
  };
});
</script>

<template>
  <p v-if="app.demo" class="ds-note info">{{ i18nT('Önizlemede operasyon sayıları gösterilmez.') }}</p>
  <p v-else-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
  <template v-else-if="queues">
    <div class="kpis">
      <div v-for="r in rows" :key="r.key" class="ds-kpi"><div class="ds-small ds-muted">{{ i18nT(r.label) }}</div><div class="kpi-n">{{ r.value.toLocaleString(localeTag) }}</div></div>
    </div>
    <p class="ds-xs ds-muted">{{ i18nT('Bekleyen kayıt sayıları · {0}', {'0': new Date(generatedAt).toLocaleString(localeTag, {timeZone: 'Europe/Istanbul'})}) }}</p>
  </template>
  <p v-else class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</p>
</template>

<style scoped>
.kpis {display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;}
.kpi-n {font: 700 28px/34px Arimo, Arial, sans-serif; color: #10243a;}
p {margin: 0;}
</style>
