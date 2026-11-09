<script setup lang="ts">
import {MapPin} from '@lucide/vue';
import LocationMap from '~/components/LocationMap.vue';
import {useLocale} from '~/composables/useLocale';

defineProps<{point: {latitude: number; longitude: number} | null; sample?: boolean}>();
const {t: i18nT} = useLocale();
</script>

<template>
  <LocationMap v-if="point" :latitude="point.latitude" :longitude="point.longitude"/>
  <div v-else class="map-unavailable"><MapPin :size="34"/><strong>{{ sample ? i18nT("Örnek işletme · Konum eklenmedi") : i18nT("Harita noktası doğrulanıyor") }}</strong><span>{{ sample ? i18nT("Gerçek adres ve koordinatlar bağlandığında harita burada görünecek.") : i18nT("Doğrulanmış konum eklendiğinde harita burada görünecek.") }}</span></div>
</template>
