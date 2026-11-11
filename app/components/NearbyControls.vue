<script setup lang="ts">
import {useId} from 'vue';
import {LocateFixed} from '@lucide/vue';
import {nearbyRadii} from '@otosanayide/core/coverage';
import {useLocale} from '~/composables/useLocale';

defineProps<{city: string; district: string; active: boolean; origin: 'device' | 'area'; radius: number; referenceAvailable: boolean; locating: boolean; onReference: () => void; onCityOnly: () => void; onDevice: () => void; onRadius: (radius: number) => void}>();

const {t} = useLocale();
const name = useId();
</script>

<template>
  <section class="near" :aria-label="t('Arama alanı')">
    <div class="near-title"><LocateFixed :size="18"/><span>{{ t('Arama alanı') }}</span></div>
    <div v-if="city" class="near-chips" role="group" :aria-label="t('İl sınırı tercihi')">
      <button type="button" :class="`ds-chip ${active?'line':'on'}`" :aria-pressed="!active" @click="onCityOnly">{{ t('Yalnız seçili il / ilçe') }}</button>
      <button type="button" :class="`ds-chip ${active&&origin==='area'?'on':'line'}`" :aria-pressed="active&&origin==='area'" :disabled="!referenceAvailable" @click="onReference">{{ t('{0} çevresi',{'0':district||city}) }}</button>
    </div>
    <button type="button" class="ds-btn s sm near-device" :disabled="locating" :aria-busy="locating" @click="onDevice">{{ t(locating?'Konum alınıyor…':'Konumumu kullan') }}</button>
    <template v-if="active">
      <p class="near-text" role="status">{{ origin==='area'?t('{0} çevresinde, il sınırı olmadan aranıyor.',{'0':district||city}):t('Konumunun çevresinde, il sınırı olmadan aranıyor.') }}</p>
      <fieldset class="near-radii">
        <legend>{{ t('Arama mesafesi') }}</legend>
        <div class="near-chips">
          <label v-for="option in nearbyRadii" :key="option" :class="`ds-chip ${radius===option?'on':'line'}`"><input class="sr-only" type="radio" :name="name" :value="option" :checked="radius===option" @change="onRadius(option)"/>{{ option }} km</label>
        </div>
      </fieldset>
      <p class="near-help">{{ t('Mesafeler kuş uçuşudur. Gerçek yol ve yolculuk süresi farklı olabilir.') }}{{ origin==='area'?' '+t('Arama merkezi seçilen yerin yaklaşık idari referansıdır.'):'' }}</p>
    </template>
    <p v-else-if="city" class="near-text muted">{{ t('Yalnız seçtiğin il ve ilçe içinde aranıyor. Yakın komşu iller için çevreyi dahil edebilirsin.') }}</p>
    <p v-else class="near-text muted">{{ t('Bir il seç veya konumunu paylaşarak il sınırı olmadan yakınındaki işletmeleri bul.') }}</p>
    <p v-if="city&&!referenceAvailable" class="near-text muted">{{ t('Bu yer için referans konum yok. Konumunu kullanarak yakınlık araması yapabilirsin.') }}</p>
  </section>
</template>

<style scoped>
.near {display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 16px; background: #f4f6f8; border: 1px solid #dfe5eb; border-radius: 12px;}
.near-title {display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; line-height: 1.5; color: #172b40;}
.near-chips {display: flex; flex-wrap: wrap; gap: 8px;}
.near .ds-chip {height: 32px; border-radius: 16px; font-size: 13px; cursor: pointer;}
.near .ds-chip.line {background: #fff; color: #10243a;}
.near button.ds-chip {border: 0;}
.near button.ds-chip.line {border: 1px solid #dfe5eb;}
.near button.ds-chip:disabled {opacity: .55; cursor: not-allowed;}
.near label.ds-chip:has(input:focus-visible) {outline: 2px solid #2459b4; outline-offset: 2px;}
.near-device {background: #fff; border-color: #dfe5eb;}
.near-text {margin: 0; font-size: 13px; line-height: 1.45; color: #172b40;}
.near-text.muted {color: #586879;}
.near-radii {border: 0; margin: 0; padding: 0; min-width: 0; width: 100%;}
.near-radii legend {padding: 0; margin-bottom: 12px; font-size: 15px; font-weight: 700; line-height: 1.5; color: #172b40;}
.near-help {margin: 0; font-size: 12px; line-height: 1.4; color: #586879;}
</style>
