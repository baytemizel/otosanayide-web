<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue';
import {AlertTriangle, Check, Map as MapIcon, Maximize2, Navigation, X} from '@lucide/vue';
import type {Business} from '@otosanayide/core';
import {locationSchema, mapsLocationUrl} from '@otosanayide/core/location';
import BusinessEmail from '~/components/BusinessEmail.vue';
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
  <section id="servis-konumu" class="ds-card slc">
    <h2 class="sr-only">{{ i18nT("Konum") }}</h2>
    <div v-if="verified" class="map-card-preview slc-map"><ServiceLocationMap :point="location" :sample="business.sample"/><button ref="trigger" type="button" class="map-expand" :aria-label="i18nT('Haritayı büyüt')" @click="expanded=true"><span><Maximize2 :size="17"/>{{ i18nT("Haritayı büyüt") }}</span></button></div>
    <div v-else class="ds-mapbg slc-map"><ServiceLocationMap :point="null" :sample="business.sample"/></div>
    <div class="slc-body">
      <span v-if="verified" class="ds-badge ok slc-badge"><Check :size="12"/>{{ i18nT("Koordinat doğrulandı") }}</span>
      <span v-else-if="!business.sample" class="ds-badge warn slc-badge"><AlertTriangle :size="12"/>{{ i18nT("Kesin konum doğrulanmadı · Adres araması") }}</span>
      <p class="ds-small slc-address">{{ business.address }}, {{ business.district }} / {{ business.city }}</p>
      <div v-if="route||!business.sample" class="ds-row ds-g8 ds-wrap">
        <a v-if="route&&mapsUrl" class="ds-btn s sm" :href="mapsUrl" target="_blank" rel="noreferrer"><MapIcon :size="15"/>{{ i18nT("Google Maps’te aç") }}</a>
        <a v-if="route" class="ds-btn s sm" :href="route" target="_blank" rel="noreferrer"><Navigation :size="15"/>{{ i18nT("Yol tarifi") }}</a>
        <a v-else class="ds-btn s sm" target="_blank" rel="noreferrer" :href="searchUrl"><MapIcon :size="15"/>{{ i18nT("Google Maps’te aç") }}</a>
      </div>
      <p v-else class="ds-small ds-muted">{{ i18nT("Bu örnek kayıt için rota oluşturulmaz.") }}</p>
      <BusinessEmail :address="business.contactEmail" :sample="business.sample"/>
    </div>
    <dialog v-if="expanded" ref="dialog" class="service-map-dialog" aria-labelledby="map-dialog-title" @cancel="expanded=false" @close="expanded=false" @click="onDialogClick">
      <div class="map-dialog-content">
        <header class="ds-row ds-sb ds-g12 slc-dialog-head"><div><h2 id="map-dialog-title">{{ business.name }}</h2><p>{{ business.address }}</p></div><button autofocus class="ds-iconbtn" :aria-label="i18nT('Haritayı kapat')" @click="expanded=false"><X :size="18"/></button></header>
        <ServiceLocationMap :point="location" :sample="business.sample"/>
        <div class="ds-row ds-g8 ds-wrap"><a v-if="route" class="ds-btn p" :href="route" target="_blank" rel="noreferrer"><Navigation :size="18"/>{{ i18nT("Yol tarifi al") }}</a><a v-if="verified" class="ds-btn s" :href="mapsUrl" target="_blank" rel="noreferrer">{{ i18nT("Google Maps’te aç ↗") }}</a></div>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.slc {overflow: hidden;}
.slc-map {height: 200px;}
.map-card-preview.slc-map {margin: 0;}
.slc-map :deep(.location-map), .slc-map :deep(.location-map-placeholder) {height: 200px; min-height: 0; margin: 0; border: 0; border-radius: 0;}
.slc-body {display: flex; flex-direction: column; gap: 10px; padding: 20px;}
.slc-badge {align-self: flex-start; height: auto; min-height: 24px; white-space: normal;}
.slc-address {margin: 0; overflow-wrap: anywhere;}
.slc-dialog-head {align-items: flex-start;}
.slc-dialog-head p {margin: 0;}
</style>
