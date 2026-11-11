<script setup lang="ts">
import {ref, useTemplateRef} from 'vue';
import {MapPin} from '@lucide/vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {publicEnv} from '~/lib/env';
import {loadMaps} from '~/lib/map-panel-helpers';

const props = defineProps<{latitude: number; longitude: number; onMove?: (lat: number, lng: number) => void}>();
const {t: i18nT} = useLocale();
const mapEl = useTemplateRef<HTMLDivElement>('mapEl');
const error = ref('');
const key = publicEnv().googleMapsKey;

useClientEffect(() => [props.latitude, props.longitude, key], () => {
  let cancelled = false;
  let marker: any;
  const listeners: any[] = [];
  if (!key) return;
  error.value = '';
  const latitude = props.latitude;
  const longitude = props.longitude;
  loadMaps(key)
    .then(() => {
      if (cancelled || !mapEl.value) return;
      const g = window.google.maps;
      const position = {lat: latitude, lng: longitude};
      const map = new g.Map(mapEl.value, {center: position, zoom: 16, mapTypeControl: false, streetViewControl: false});
      marker = new g.Marker({map, position, draggable: !!props.onMove, title: 'İşletme konumu'});
      if (props.onMove) {
        const move = (e: any) => {
          if (e.latLng) props.onMove?.(e.latLng.lat(), e.latLng.lng());
        };
        listeners.push(marker.addListener('dragend', move), map.addListener('click', move));
      }
    })
    .catch(() => {
      if (!cancelled) error.value = 'Google haritası yüklenemedi. Dış harita bağlantısını kullanabilirsin.';
    });
  return () => {
    cancelled = true;
    listeners.forEach(l => l.remove());
    marker?.setMap(null);
  };
});
</script>

<template>
  <div v-if="!key || error" class="location-map-placeholder map-ph"><MapPin :size="30"/><strong>{{ error || i18nT("Sayfa içi harita bağlantısı hazırlanıyor") }}</strong><span class="ds-small">{{ latitude.toFixed(6) }}, {{ longitude.toFixed(6) }}</span><small class="ds-xs ds-muted">{{ i18nT("Google Maps bağlantısıyla bu noktayı açabilirsin.") }}</small></div>
  <div v-else ref="mapEl" class="location-map" role="region" :aria-label="onMove?i18nT('İşletme konumunu haritada seç'):i18nT('İşletme konumu haritası')"/>
</template>

<style scoped>
.map-ph {background: #e8eef2; border-color: #dfe5eb; border-radius: 14px;}
.map-ph svg {color: #c4460b;}
</style>
