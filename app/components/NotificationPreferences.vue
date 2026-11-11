<script setup lang="ts">
import {computed, ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {errorStatus} from '~/lib/api-read';
import {PRODUCT_NEWS_TEXT_VERSION, preferencesApi, type PreferenceChanges, type Preferences} from '~/lib/member-api';

/**
 * web-09. Saving a switch records the choice only: delivery of request e-mails/push and of
 * product news is not built (`delivery: not_enabled`), and the screen says so. Product news
 * stays off until the member turns it on; that records consent with the text version.
 */
const app = useApp();
const {t: i18nT, localeTag} = useLocale();
const prefs = ref<Preferences | null>(null);
const loading = ref(false);
const busy = ref(false);
const error = ref('');
const saved = ref('');

useClientEffect(() => [app.user, app.demo], () => {
  const user = app.user;
  prefs.value = null;
  if (!user || app.demo) return;
  let cancelled = false;
  loading.value = true;
  preferencesApi.read(() => user.getIdToken()).then(v => {
    if (!cancelled) prefs.value = v;
  }).catch(e => {
    if (!cancelled) error.value = e instanceof Error ? e.message : 'Tercihler yüklenemedi.';
  }).finally(() => {
    if (!cancelled) loading.value = false;
  });
  return () => {
    cancelled = true;
  };
});

const rows = computed(() => {
  const p = prefs.value;
  if (!p) return [];
  return [
    {key: 'inApp', title: 'Talep güncellemeleri · uygulama içi', text: 'İşlem bildirimidir, kapatılamaz.', on: true, locked: true, delivery: ''},
    {key: 'requestUpdatesPush', title: 'Talep güncellemeleri · push', text: '', on: p.requestUpdates.push, locked: false, delivery: p.delivery.requestUpdatesPush},
    {key: 'requestUpdatesEmail', title: 'Talep güncellemeleri · e-posta', text: 'Doğrulanmış e-posta gerekir.', on: p.requestUpdates.email, locked: false, delivery: p.delivery.requestUpdatesEmail},
    {key: 'reminderEmail', title: 'Bakım hatırlatmaları e-postası', text: 'Kapalıyken hiçbir hatırlatma e-postası gönderilmez.', on: p.reminderEmail, locked: false, delivery: ''},
    {key: 'productNews', title: 'Ürün duyuruları', text: 'Pazarlama iletisidir; varsayılan kapalı. Açarsan onayın zaman ve metin sürümüyle kaydedilir.', on: p.productNews.enabled, locked: false, delivery: p.delivery.productNews},
  ] as const;
});

async function toggle(key: keyof PreferenceChanges, next: boolean) {
  const user = app.user, current = prefs.value;
  if (!user || !current || busy.value) return;
  busy.value = true;
  error.value = '';
  saved.value = '';
  try {
    prefs.value = await preferencesApi.change(() => user.getIdToken(), current.version, {[key]: next});
    saved.value = 'Tercihin kaydedildi.';
  } catch (e) {
    const status = errorStatus(e);
    error.value = status === 409 ? 'Tercihler başka bir yerde değişti. Sayfayı yenile.' : status === 403 ? 'Bu tercih için önce e-posta adresini doğrula.' : e instanceof Error ? e.message : 'Tercih kaydedilemedi.';
  } finally {
    busy.value = false;
  }
}
const consentAt = computed(() => prefs.value?.productNews.consentAtMs ? new Date(prefs.value.productNews.consentAtMs).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'}) : '');
</script>

<template>
  <section class="ds-card ds-pad24 ds-col ds-g12 prefs" :aria-busy="loading || busy">
    <h2>{{ i18nT("Bildirim ve iletişim tercihleri") }}</h2>
    <p v-if="app.demo" class="ds-small ds-muted">{{ i18nT('Önizleme hesabında tercih kaydedilmez.') }}</p>
    <p v-else-if="loading" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</p>
    <template v-else-if="prefs">
      <div v-for="row in rows" :key="row.key" class="ds-row ds-g12 preference">
        <div class="ds-f1 ds-col">
          <span class="ds-small ds-b">{{ i18nT(row.title) }}</span>
          <span v-if="row.text" class="ds-xs ds-muted">{{ i18nT(row.text) }}</span>
          <span v-if="row.delivery === 'not_enabled'" class="ds-xs ds-muted">{{ i18nT('Bu kanaldan gönderim henüz etkin değil; seçimin saklanır.') }}</span>
          <span v-if="row.key === 'productNews' && row.on && consentAt" class="ds-xs ds-muted">{{ i18nT('Onay: {0} · metin {1}', {'0': consentAt, '1': prefs.productNews.textVersion ?? PRODUCT_NEWS_TEXT_VERSION}) }}</span>
        </div>
        <button v-if="row.locked" type="button" class="ds-switch on" role="switch" aria-checked="true" disabled :aria-label="i18nT(row.title)"/>
        <button v-else type="button" class="ds-switch" :class="{on: row.on}" role="switch" :aria-checked="row.on" :aria-label="i18nT(row.title)" :disabled="busy" @click="toggle(row.key as keyof PreferenceChanges, !row.on)"/>
      </div>
      <p v-if="saved" class="ds-note ok" role="status">{{ i18nT(saved) }}</p>
    </template>
    <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>

<style scoped>
.prefs h2 {margin: 0; font: 700 19px/24.7px Arimo, Arial, sans-serif; letter-spacing: 0;}
.prefs p {margin: 0;}
.preference {padding: 8px 0; align-items: center;}
.ds-switch {border: 0; padding: 0; cursor: pointer;}
.ds-switch:disabled {cursor: default; opacity: .75;}
</style>
