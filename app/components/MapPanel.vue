<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue';
import {MapPin, Search} from '@lucide/vue';
import type {Business} from '@otosanayide/core';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {publicEnv} from '~/lib/env';
import {loadMaps} from '~/lib/map-panel-helpers';

const props = defineProps<{items: Business[]}>();
const {t: i18nT} = useLocale();
const mapEl = useTemplateRef<HTMLDivElement>('mapEl');
const error = ref('');
const key = publicEnv().googleMapsKey;
const valid = computed(() => props.items.filter(x => x.coordinateStatus === 'verified' && x.latitude !== undefined && x.longitude !== undefined) as (Business & {latitude: number; longitude: number})[]);

useClientEffect(() => [key, props.items], () => {
  let cancel = false;
  const markers: any[] = [];
  const points = valid.value;
  if (key && points.length)
    loadMaps(key)
      .then(() => {
        if (cancel || !mapEl.value) return;
        const g = window.google.maps;
        const map = new g.Map(mapEl.value, {center: {lat: points[0].latitude, lng: points[0].longitude}, zoom: 12, mapTypeControl: false});
        const bounds = new g.LatLngBounds();
        points.forEach(b => {
          const position = {lat: b.latitude, lng: b.longitude};
          bounds.extend(position);
          const m = new g.Marker({map, position, title: b.name});
          m.addListener('click', () => {
            window.location.href = `/servis/${encodeURIComponent(b.id)}`;
          });
          markers.push(m);
        });
        if (points.length > 1) map.fitBounds(bounds);
      })
      .catch(e => {
        error.value = e.message;
      });
  return () => {
    cancel = true;
    markers.forEach(m => m.setMap(null));
  };
});
</script>

<template>
  <div v-if="!key || !valid.length || error" class="map-state"><span class="map-icon"><MapPin :size="36"/></span><h3>{{ error || (!key ? i18nT('Harita bağlantısı hazırlanıyor') : i18nT('Gösterilecek doğrulanmış konum yok')) }}</h3><p>{{ !key ? i18nT("Google Maps anahtarı tanımlandığında doğrulanmış işletme noktaları burada açılacak.") : i18nT("Kesin olmayan noktaları haritada göstermiyoruz. Liste görünümünden devam edebilirsin.") }}</p></div>
  <div v-else class="map-wrap">
    <div ref="mapEl" class="google-map map-canvas" :aria-label="i18nT('İşletme haritası')"/>
    <button class="ds-btn n map-here ds-passive" type="button" disabled aria-disabled="true" :title="i18nT('Yakında')"><Search :size="16"/>{{ i18nT('Bu bölgede ara') }}</button>
    <span class="map-note">{{ i18nT('Yalnız doğrulanmış koordinatlar pinlenir') }}</span>
  </div>
</template>

<style scoped>
.map-state {display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: 480px; padding: 48px 24px; text-align: center; background: #e8eef2; color: #10243a;}
.map-state h3, .map-state p {margin: 0;}
.map-state p {max-width: 460px; font-size: 14px; color: #586879;}
.map-icon {display: flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 36px; background: #fff; color: #c4460b;}
.map-wrap {position: relative; min-width: 0;}
.map-canvas {height: min(820px, 76vh); min-height: 440px; border-radius: 0; background: #e8eef2;}
.map-here {position: absolute; left: 50%; top: 20px; transform: translateX(-50%);}
.map-note {position: absolute; left: 12px; bottom: 12px; max-width: calc(100% - 24px); padding: 3px 8px; border-radius: 6px; background: rgba(255, 255, 255, .85); font-size: 12px; color: #10243a;}
@media (max-width: 760px) {
  .map-canvas {height: 440px;}
}
</style>
