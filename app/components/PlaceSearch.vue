<script setup lang="ts">
import {ref, useTemplateRef} from 'vue';
import type {ServiceLocation} from '@otosanayide/core/location';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {publicEnv} from '~/lib/env';
import {loadMaps} from '~/lib/map-panel-helpers';

const props = defineProps<{onSelect: (location: ServiceLocation) => void}>();

const {t: i18nT} = useLocale();
const container = useTemplateRef<HTMLDivElement>('container');
const error = ref('');
const key = publicEnv().googleMapsKey;

useClientEffect(() => [key], () => {
  let cancelled = false, widget: any;
  let sequence = 0;
  const selected = async (e: any) => {
    const ticket = ++sequence;
    try {
      const place = e.placePrediction.toPlace();
      await place.fetchFields({fields: ['formattedAddress', 'location']});
      if (cancelled || ticket !== sequence) return;
      if (!place.location) throw Error();
      props.onSelect({address: place.formattedAddress ?? '', latitude: place.location.lat(), longitude: place.location.lng()});
      error.value = '';
    } catch {
      if (!cancelled) error.value = 'Adresin konumu alınamadı. Başka sonuç seçebilir veya koordinat girebilirsin.';
    }
  };
  const failed = () => {
    error.value = 'Google adres araması kullanılamıyor. API yetkisini ve bağlantıyı kontrol edin.';
  };
  if (key) loadMaps(key).then(() => (window as any).google.maps.importLibrary('places')).then(({PlaceAutocompleteElement}: any) => {
    if (cancelled || !container.value) return;
    widget = new PlaceAutocompleteElement({includedRegionCodes: ['tr']});
    widget.setAttribute('aria-label', 'Google Maps ile adres veya işletme ara');
    widget.addEventListener('gmp-select', selected);
    widget.addEventListener('gmp-error', failed);
    container.value.appendChild(widget);
  }).catch(() => {
    if (!cancelled) failed();
  });
  return () => {
    cancelled = true;
    widget?.removeEventListener('gmp-select', selected);
    widget?.removeEventListener('gmp-error', failed);
    widget?.remove();
  };
});
</script>

<template>
  <div class="stack">
    <strong>{{ i18nT('Google Maps ile adres veya işletme ara') }}</strong>
    <p v-if="!key" class="small muted">{{ i18nT('Adres önerileri için Google Maps / Places API anahtarı henüz bağlı değil. Şimdilik Google Maps’te arayıp noktanın enlem ve boylamını aşağıya girebilirsin.') }}</p>
    <div v-else ref="container"/>{{ ' ' }}<p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
  </div>
</template>
