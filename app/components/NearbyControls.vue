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
  <section class="nearby-controls" :aria-label="t('Arama alanı')">
    <div class="nearby-actions">
      <div v-if="city" class="nearby-scope" role="group" :aria-label="t('İl sınırı tercihi')">
        <button type="button" :class="`button compact ${active?'secondary':'primary'}`" :aria-pressed="!active" @click="onCityOnly">{{ t('Yalnız seçili il / ilçe') }}</button>
        <button type="button" :class="`button compact ${active&&origin==='area'?'primary':'secondary'}`" :aria-pressed="active&&origin==='area'" :disabled="!referenceAvailable" @click="onReference">{{ t('Çevreyi de dahil et') }}</button>
      </div>
      <button type="button" class="button secondary compact" :disabled="locating" :aria-busy="locating" @click="onDevice"><LocateFixed :size="18"/>{{ t(locating?'Konum alınıyor…':'Konumumu kullan') }}</button>
    </div>
    <template v-if="active">
      <p class="small" role="status">{{ origin==='area'?t('{0} çevresinde, il sınırı olmadan aranıyor.',{'0':district||city}):t('Konumunun çevresinde, il sınırı olmadan aranıyor.') }}</p>
      <fieldset class="nearby-radii">
        <legend>{{ t('Arama mesafesi') }}</legend>
        <div>
          <label v-for="option in nearbyRadii" :key="option" :class="radius===option?'is-selected':''"><input type="radio" :name="name" :value="option" :checked="radius===option" @change="onRadius(option)"/>{{ option }} km</label>
        </div>
      </fieldset>
      <p class="small muted">{{ t('Mesafeler kuş uçuşudur. Gerçek yol ve yolculuk süresi farklı olabilir.') }}{{ origin==='area'?' '+t('Arama merkezi seçilen yerin yaklaşık idari referansıdır.'):'' }}</p>
    </template>
    <p v-else-if="city" class="small muted">{{ t('Yalnız seçtiğin il ve ilçe içinde aranıyor. Yakın komşu iller için çevreyi dahil edebilirsin.') }}</p>
    <p v-else class="small muted">{{ t('Bir il seç veya konumunu paylaşarak il sınırı olmadan yakınındaki işletmeleri bul.') }}</p>
    <p v-if="city&&!referenceAvailable" class="small muted">{{ t('Bu yer için referans konum yok. Konumunu kullanarak yakınlık araması yapabilirsin.') }}</p>
  </section>
</template>
