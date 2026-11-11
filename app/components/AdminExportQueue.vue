<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {adminApi, type AdminExport} from '~/lib/admin-api';
import {errorStatus} from '~/lib/api-read';

/** web-10 admin side: an operator marks progress; the copy is delivered outside this product. */
const app = useApp();
const {t: i18nT, localeTag} = useLocale();
const status = ref<'submitted' | 'in_progress'>('submitted');
const items = ref<AdminExport[]>([]);
const reload = ref(0);
const loading = ref(false);
const error = ref('');
const saving = ref('');
const rejectReason = ref<Record<string, string>>({});
const reasons = ['identity_unverified', 'duplicate', 'legal_hold', 'other'] as const;
const reasonLabels: Record<string, string> = {identity_unverified: 'Kimlik doğrulanamadı', duplicate: 'Mükerrer talep', legal_hold: 'Yasal saklama', other: 'Diğer'};

useClientEffect(() => [app.user, app.demo, status.value, reload.value], () => {
  const user = app.user;
  items.value = [];
  if (!user || app.demo) return;
  let cancelled = false;
  loading.value = true;
  error.value = '';
  adminApi.exports(() => user.getIdToken(), status.value).then(page => {
    if (!cancelled) items.value = page.items;
  }).catch(e => {
    if (!cancelled) error.value = e instanceof Error ? e.message : 'Talepler yüklenemedi.';
  }).finally(() => {
    if (!cancelled) loading.value = false;
  });
  return () => {
    cancelled = true;
  };
});

async function act(item: AdminExport, action: 'start' | 'deliver' | 'reject') {
  const user = app.user;
  if (!user) return;
  const reason = action === 'reject' ? rejectReason.value[item.id] : undefined;
  if (action === 'reject' && !reason) return;
  saving.value = item.id;
  error.value = '';
  try {
    await adminApi.decideExport(() => user.getIdToken(), {requestId: item.id, expectedVersion: item.version, action, ...(reason ? {reason} : {})});
    reload.value++;
  } catch (e) {
    error.value = errorStatus(e) === 409 ? 'Kayıt değişti. Listeyi yenile.' : e instanceof Error ? e.message : 'İşlem kaydedilemedi.';
  } finally {
    saving.value = '';
  }
}
const time = (v: number) => new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'});
</script>

<template>
  <section class="ds-col ds-g12">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3 style="margin:0">{{ i18nT('Veri kopyası talepleri') }}</h3>
      <select v-model="status" class="ds-field" :aria-label="i18nT('Durum')">
        <option value="submitted">{{ i18nT('Bekleyen') }}</option>
        <option value="in_progress">{{ i18nT('Hazırlanıyor') }}</option>
      </select>
    </div>
    <p class="ds-small ds-muted">{{ i18nT('Kopya elle hazırlanır ve ürün dışından teslim edilir. “Teslim edildi” yalnız bu teslimin kaydıdır.') }}</p>
    <p v-if="loading" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</p>
    <p v-if="!loading&&!error&&!app.demo&&!items.length" class="ds-small ds-muted">{{ i18nT('Bu durumda talep yok.') }}</p>
    <article v-for="item in items" :key="item.id" class="ds-card ds-pad ds-row ds-sb ds-wrap ds-g8">
      <span class="ds-small"><b>{{ item.ownerUid }}</b> · {{ time(item.createdAtMs) }}</span>
      <div class="ds-row ds-g8 ds-wrap">
        <button v-if="item.status==='submitted'" type="button" class="ds-btn s sm" :disabled="saving===item.id" @click="act(item,'start')">{{ i18nT('Hazırlamaya başla') }}</button>
        <button v-if="item.status==='in_progress'" type="button" class="ds-btn p sm" :disabled="saving===item.id" @click="act(item,'deliver')">{{ i18nT('Teslim edildi') }}</button>
        <select v-model="rejectReason[item.id]" class="ds-field sm" :aria-label="i18nT('Ret gerekçesi')"><option value="">{{ i18nT('Ret gerekçesi') }}</option><option v-for="r in reasons" :key="r" :value="r">{{ i18nT(reasonLabels[r]) }}</option></select>
        <button type="button" class="ds-btn g sm" :disabled="saving===item.id||!rejectReason[item.id]" @click="act(item,'reject')">{{ i18nT('Reddet') }}</button>
      </div>
    </article>
    <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>

<style scoped>
p {margin: 0;}
</style>
