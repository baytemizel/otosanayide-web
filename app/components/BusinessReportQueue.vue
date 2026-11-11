<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {adminApi, type BusinessReport} from '~/lib/admin-api';
import {errorStatus} from '~/lib/api-read';
import {reportReasonLabels} from '~/lib/business-report';

/** web-04 admin side. A decision never edits the profile; corrections go through catalogue and changes. */
const app = useApp();
const {t: i18nT, localeTag} = useLocale();
const status = ref<'submitted' | 'resolved' | 'dismissed'>('submitted');
const items = ref<BusinessReport[]>([]);
const cursor = ref('');
const next = ref<string | null>(null);
const reload = ref(0);
const loading = ref(false);
const error = ref('');
const notes = ref<Record<string, string>>({});
const saving = ref('');

useClientEffect(() => [app.user, app.demo, status.value, cursor.value, reload.value], () => {
  const user = app.user;
  items.value = [];
  if (!user || app.demo) return;
  let cancelled = false;
  loading.value = true;
  error.value = '';
  adminApi.reports(() => user.getIdToken(), status.value, cursor.value).then(page => {
    if (cancelled) return;
    items.value = page.items;
    next.value = page.next;
  }).catch(e => {
    if (!cancelled) error.value = e instanceof Error ? e.message : 'Bildirimler yüklenemedi.';
  }).finally(() => {
    if (!cancelled) loading.value = false;
  });
  return () => {
    cancelled = true;
  };
});

async function decide(item: BusinessReport, decision: 'resolved' | 'dismissed') {
  const user = app.user, resolution = (notes.value[item.id] ?? '').trim();
  if (!user || resolution.length < 10) return;
  saving.value = item.id;
  error.value = '';
  try {
    await adminApi.decideReport(() => user.getIdToken(), {id: item.id, expectedVersion: item.version, decision, resolution});
    items.value = items.value.filter(i => i.id !== item.id);
  } catch (e) {
    const code = errorStatus(e);
    error.value = code === 409 ? 'Kayıt değişti. Listeyi yenile.' : code === 403 ? 'Kendi bildirimine karar veremezsin.' : e instanceof Error ? e.message : 'Karar kaydedilemedi.';
  } finally {
    saving.value = '';
  }
}
const time = (v: number) => new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'});
</script>

<template>
  <section class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3 style="margin:0">{{ i18nT('Yanlış bilgi bildirimleri') }}</h3>
      <div class="ds-row ds-g8">
        <select v-model="status" class="ds-field" :aria-label="i18nT('Durum')" @change="cursor=''">
          <option value="submitted">{{ i18nT('Bekleyen') }}</option>
          <option value="resolved">{{ i18nT('Çözüldü') }}</option>
          <option value="dismissed">{{ i18nT('Reddedildi') }}</option>
        </select>
        <button type="button" class="ds-btn s sm" :disabled="loading" @click="reload++">{{ i18nT('Yenile') }}</button>
      </div>
    </div>
    <p class="ds-small ds-muted">{{ i18nT('Karar profili değiştirmez; düzeltme katalog ve profil değişikliği akışından yapılır. Bildirenin kimliği gösterilmez.') }}</p>
    <p v-if="app.demo" class="ds-note info">{{ i18nT('Önizlemede gerçek bildirim yok.') }}</p>
    <p v-if="loading" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</p>
    <p v-if="!loading&&!error&&!app.demo&&!items.length" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('Bu durumda bildirim yok.') }}</p>
    <article v-for="item in items" :key="item.id" class="ds-card ds-pad24 ds-col ds-g8">
      <div class="ds-row ds-sb ds-wrap ds-g8">
        <NuxtLink class="ds-b" :to="`/servis/${encodeURIComponent(item.businessId)}`" target="_blank">{{ item.businessName || item.businessId }}</NuxtLink>
        <span class="ds-badge warn">{{ i18nT(reportReasonLabels[item.reason]) }}</span>
      </div>
      <p v-if="item.note" class="review-text ds-small">{{ item.note }}</p>
      <p class="ds-xs ds-muted">{{ time(item.createdAtMs) }}</p>
      <p v-if="item.resolution" class="ds-small"><b>{{ i18nT('Karar notu') }}:</b> {{ item.resolution }}</p>
      <template v-if="item.status === 'submitted'">
        <label class="ds-col ds-g4"><span class="ds-label">{{ i18nT('Karar notu (en az 10 karakter)') }}</span><textarea v-model="notes[item.id]" class="ds-field" minlength="10" maxlength="1000"/></label>
        <div class="ds-row ds-g8 ds-wrap">
          <button type="button" class="ds-btn p sm" :disabled="saving===item.id||(notes[item.id]??'').trim().length<10" @click="decide(item,'resolved')">{{ i18nT('Çözüldü') }}</button>
          <button type="button" class="ds-btn s sm" :disabled="saving===item.id||(notes[item.id]??'').trim().length<10" @click="decide(item,'dismissed')">{{ i18nT('Reddet') }}</button>
        </div>
      </template>
    </article>
    <div v-if="cursor||next" class="ds-row ds-g10"><button v-if="cursor" type="button" class="ds-btn s sm" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button><button v-if="next" type="button" class="ds-btn s sm" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button></div>
    <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>

<style scoped>
p {margin: 0;}
</style>
