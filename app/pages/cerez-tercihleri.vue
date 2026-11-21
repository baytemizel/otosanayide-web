<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Lock} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import {consentCookie, defaultConsent, readConsent} from '~/lib/consent';
import {useLocale} from '~/composables/useLocale';

// S07 · Çerez tercihleri (Figma 128:739). The choice stays in this browser only; optional ones default to off.
const {t} = useLocale();
useSeoMeta({title: () => t('Çerez tercihleri'), robots: 'noindex'});
const measurement = ref(false);
const adMeasurement = ref(false);
// Turkish source text of the status line; translated at render so it follows a language change.
const message = ref('');

onMounted(() => {
  const saved = readConsent(document.cookie) ?? defaultConsent();
  measurement.value = saved.measurement;
  adMeasurement.value = saved.adMeasurement;
});

function store(next: {measurement: boolean; adMeasurement: boolean}) {
  try {
    document.cookie = consentCookie({...next, savedAtMs: Date.now()}, location.protocol === 'https:');
    measurement.value = next.measurement;
    adMeasurement.value = next.adMeasurement;
    message.value = 'Çerez tercihlerin kaydedildi.';
  } catch {
    message.value = 'Tercih kaydedilemedi. Tarayıcı çerezlere izin vermiyor olabilir.';
  }
}
</script>

<template>
  <section class="page v2-wrap">
    <div class="card">
      <p class="t-mono-md t-eyebrow">{{ t('Çerezler') }}</p>
      <h1 class="t-h3">{{ t('Çerez tercihleri') }}</h1>
      <p class="t-body-md t-muted">{{ t('Zorunlu çerezler sitenin çalışması için gerekir. Diğerlerini sen seçersin; kapalı gelir.') }}</p>
      <hr class="divider">
      <div class="row">
        <div class="copy"><p class="name">{{ t('Zorunlu') }}</p><p class="t-body-sm t-muted">{{ t('Oturum, güvenlik, dil tercihi') }}</p></div>
        <span class="always"><Lock :size="13" aria-hidden="true"/>{{ t('Her zaman açık') }}</span>
      </div>
      <hr class="divider">
      <label class="row">
        <span class="copy"><span class="name">{{ t('Analitik') }}</span><span class="t-body-sm t-muted">{{ t('Anonim kullanım istatistikleri') }}</span></span>
        <input v-model="measurement" type="checkbox" role="switch" class="switch">
      </label>
      <hr class="divider">
      <label class="row">
        <span class="copy"><span class="name">{{ t('Reklam ölçümü') }}</span><span class="t-body-sm t-muted">{{ t('Sponsorlu alan gösterim ölçümü') }}</span></span>
        <input v-model="adMeasurement" type="checkbox" role="switch" class="switch">
      </label>
      <hr class="divider">
      <div class="actions">
        <p v-if="message" class="t-body-sm saved" role="status">{{ t(message) }}</p>
        <V2Button variant="outline" @click="store({measurement: false, adMeasurement: false})">{{ t('Yalnız zorunlu') }}</V2Button>
        <V2Button arrow @click="store({measurement, adMeasurement})">{{ t('Seçimleri kaydet') }}</V2Button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page{padding-top:64px;padding-bottom:112px;display:flex;justify-content:center}
.card{width:100%;max-width:720px;display:flex;flex-direction:column;gap:8px;padding:32px;background:var(--white);border:1px solid var(--cream-200);border-radius:32px;box-shadow:0 24px 30px rgba(10,20,36,.1)}
.row{display:flex;align-items:center;gap:16px;padding:14px 0;cursor:default}
label.row{cursor:pointer}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.name{font-weight:600;font-size:16px;line-height:1.2;color:var(--ink-900)}
.always{display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 9px;border-radius:999px;background:var(--cream-100);font-weight:600;font-size:13px;line-height:1.2;color:var(--ink-800)}
.actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:12px;padding-top:14px}
.saved{margin-right:auto;color:var(--green-500)}
@media (max-width:760px){.page{padding-top:32px;padding-bottom:64px}.card{padding:24px;border-radius:24px}}
</style>
