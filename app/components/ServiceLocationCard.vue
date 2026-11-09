<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue';
import {MapPin, Maximize2, Navigation, X} from '@lucide/vue';
import type {Business} from '@otosanayide/core';
import {locationSchema, mapsLocationUrl} from '@otosanayide/core/location';
import ServiceLocationMap from '~/components/ServiceLocationMap.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';

const props = defineProps<{business: Business}>();
const {t: i18nT} = useLocale();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const trigger = useTemplateRef<HTMLButtonElement>('trigger');
const expanded = ref(false);

const point = computed(() => locationSchema.safeParse({latitude: props.business.latitude, longitude: props.business.longitude, address: props.business.address}));
const verified = computed(() => !props.business.sample && props.business.coordinateStatus === 'verified' && point.value.success);
const location = computed(() => (verified.value && point.value.success ? point.value.data : null));
const route = computed(() => (location.value ? `https://www.google.com/maps/dir/?${new URLSearchParams({api: '1', destination: `${location.value.latitude},${location.value.longitude}`})}` : null));
const searchUrl = computed(() => `https://www.google.com/maps/search/?${new URLSearchParams({api: '1', query: [props.business.name, props.business.address, props.business.district, props.business.city].join(' ')})}`);
const mapsUrl = computed(() => (location.value ? mapsLocationUrl(location.value) : undefined));

useClientEffect(() => [expanded.value], () => {
  if (!expanded.value) return;
  const old = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  dialog.value?.showModal();
  return () => {
    document.body.style.overflow = old;
    trigger.value?.focus({preventScroll: true});
  };
});

function onDialogClick(e: MouseEvent) {
  if (e.target === e.currentTarget) expanded.value = false;
}
</script>

<template>
  <section id="servis-konumu" class="service-map-card">
    <div class="row between"><h2>{{ i18nT("Konum") }}</h2><MapPin :size="20"/></div>
    <div v-if="verified" class="map-card-preview"><ServiceLocationMap :point="location" :sample="business.sample"/><button ref="trigger" type="button" class="map-expand" :aria-label="i18nT('Haritayı büyüt')" @click="expanded=true"><span><Maximize2 :size="17"/>{{ i18nT("Haritayı büyüt") }}</span></button></div>
    <ServiceLocationMap v-else :point="null" :sample="business.sample"/>
    <p class="map-address">{{ business.address }}<br/><span class="muted">{{ business.district }} / {{ business.city }}</span></p>
    <a v-if="route" class="button primary full" :href="route" target="_blank" rel="noreferrer"><Navigation :size="18"/>{{ i18nT("Yol tarifi al") }}</a>
    <a v-else-if="!business.sample" class="button secondary full" target="_blank" rel="noreferrer" :href="searchUrl">{{ i18nT("Adresi Google Maps’te ara ↗") }}</a>
    <p v-else class="small muted">{{ i18nT("Bu örnek kayıt için rota oluşturulmaz.") }}</p>
    <dialog v-if="expanded" ref="dialog" class="service-map-dialog" aria-labelledby="map-dialog-title" @cancel="expanded=false" @close="expanded=false" @click="onDialogClick">
      <div class="map-dialog-content">
        <header class="row between"><div><h2 id="map-dialog-title">{{ business.name }}</h2><p>{{ business.address }}</p></div><button autofocus class="button secondary" :aria-label="i18nT('Haritayı kapat')" @click="expanded=false"><X :size="22"/></button></header>
        <ServiceLocationMap :point="location" :sample="business.sample"/>
        <div class="row"><a v-if="route" class="button primary" :href="route" target="_blank" rel="noreferrer"><Navigation :size="18"/>{{ i18nT("Yol tarifi al") }}</a><a v-if="verified" class="button secondary" :href="mapsUrl" target="_blank" rel="noreferrer">{{ i18nT("Google Maps’te aç ↗") }}</a></div>
      </div>
    </dialog>
  </section>
</template>
