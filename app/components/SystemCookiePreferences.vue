<script setup lang="ts">
import {onMounted, ref, useId, useTemplateRef} from 'vue';
import {X} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {consentCookie, defaultConsent, readConsent, type Consent} from '~/lib/consent';
import {trapFocus} from '~/lib/focus';

const props = defineProps<{onClose: () => void}>();
const {t: i18nT} = useLocale();
const app = useApp();
const titleId = useId();
const dialog = useTemplateRef<HTMLElement>('dialog');
const closeButton = useTemplateRef<HTMLButtonElement>('closeBtn');
const choice = ref<Consent>(defaultConsent());
const saved = ref(false);
let opener: Element | null = null;

onMounted(() => {
  opener = document.activeElement;
  choice.value = readConsent(document.cookie) ?? defaultConsent();
  saved.value = choice.value.savedAtMs > 0;
  closeButton.value?.focus();
});

function close() {
  props.onClose();
  if (opener instanceof HTMLElement) opener.focus();
}

/** Only this browser keeps the choice; nothing optional is set today, so nothing else changes. */
function store(next: Pick<Consent, 'measurement' | 'adMeasurement'>) {
  const value = {...next, savedAtMs: Date.now()};
  try {
    document.cookie = consentCookie(value, location.protocol === 'https:');
    choice.value = value;
    app.notify('Çerez tercihlerin kaydedildi.');
    close();
  } catch {
    app.notify('Tercih kaydedilemedi. Tarayıcı çerezlere izin vermiyor olabilir.');
  }
}

const rows = [
  {key: 'essential', title: 'Zorunlu', text: 'Oturum, güvenlik, dil tercihi'},
  {key: 'measurement', title: 'Ölçüm', text: 'Anonim kullanım istatistikleri'},
  {key: 'adMeasurement', title: 'Reklam ölçümü', text: 'Sponsorlu alan gösterim ölçümü'},
] as const;

function toggle(key: 'measurement' | 'adMeasurement') {
  choice.value = {...choice.value, [key]: !choice.value[key]};
}
</script>

<template>
  <div class="ds-modal-scrim" @keydown.esc="close()">
    <div ref="dialog" class="ds-modal cookie" role="dialog" aria-modal="true" :aria-labelledby="titleId" @keydown.tab="trapFocus($event, dialog)">
      <div class="ds-row ds-sb ds-g12">
        <h2 :id="titleId">{{ i18nT('Çerez tercihleri') }}</h2>
        <button ref="closeBtn" type="button" class="ds-iconbtn" :aria-label="i18nT('Kapat')" @click="close()"><X :size="18"/></button>
      </div>
      <p class="ds-small ds-muted">{{ i18nT('Zorunlu çerezler hizmet için gereklidir. Diğerleri yalnız onay verirsen kullanılır.') }}</p>
      <div v-for="row in rows" :key="row.key" class="cookie-row">
        <div class="ds-f1 ds-col">
          <span class="ds-small ds-b">{{ i18nT(row.title) }}</span>
          <span class="ds-xs ds-muted">{{ i18nT(row.text) }}</span>
        </div>
        <button v-if="row.key === 'essential'" type="button" class="ds-switch on" role="switch" aria-checked="true" disabled :aria-label="i18nT(row.title)" :title="i18nT('Her zaman açık')"/>
        <button v-else type="button" class="ds-switch" :class="{on: choice[row.key]}" role="switch" :aria-checked="choice[row.key]" :aria-label="i18nT(row.title)" @click="toggle(row.key)"/>
      </div>
      <p class="ds-xs ds-muted">{{ i18nT('Bu sürümde zorunlu olmayan çerez kullanılmıyor. Seçimin yalnız bu tarayıcıda saklanır ve böyle bir çerez eklenirse uygulanır.') }}</p>
      <p v-if="saved" class="ds-xs ds-muted">{{ i18nT('Son kayıtlı seçimin gösteriliyor.') }}</p>
      <div class="ds-row ds-g10 ds-wrap cookie-actions">
        <button type="button" class="ds-btn s" @click="store({measurement: false, adMeasurement: false})">{{ i18nT('Yalnız zorunlu') }}</button>
        <button type="button" class="ds-btn s" @click="store(choice)">{{ i18nT('Seçimleri kaydet') }}</button>
        <button type="button" class="ds-btn n" @click="store({measurement: true, adMeasurement: true})">{{ i18nT('Tümünü kabul et') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cookie {max-width: 840px; display: flex; flex-direction: column; gap: 16px; padding: 28px;}
h2 {margin: 0; font: 700 19px/24.7px Arimo, Arial, sans-serif; letter-spacing: 0;}
p {margin: 0;}
.cookie-row {display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #dfe5eb; border-radius: 10px;}
.ds-switch {border: 0; padding: 0; cursor: pointer;}
.ds-switch:disabled {cursor: default; opacity: .7;}
.cookie-actions {justify-content: flex-end;}
@media (max-width: 480px) {
  .cookie {padding: 20px;}
  .cookie-actions .ds-btn {width: 100%;}
}
</style>
