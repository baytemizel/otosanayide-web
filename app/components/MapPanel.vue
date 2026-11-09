<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue';
import {MapPin} from '@lucide/vue';
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
  <div v-if="!key || !valid.length || error" class="empty map-empty"><MapPin :size="36"/><h3>{{ error || (!key ? 'Harita bağlantısı hazırlanıyor' : 'Gösterilecek doğrulanmış konum yok') }}</h3><p>{{ !key ? i18nT("Google Maps anahtarı tanımlandığında doğrulanmış işletme noktaları burada açılacak.") : i18nT("Kesin olmayan noktaları haritada göstermiyoruz. Liste görünümünden devam edebilirsin.") }}</p></div>
  <div v-else ref="mapEl" class="google-map" :aria-label="i18nT('İşletme haritası')"/>
</template>
