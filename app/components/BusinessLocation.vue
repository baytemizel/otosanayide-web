<script setup lang="ts">
import {computed, ref} from 'vue';
import {MapPin, Pencil} from '@lucide/vue';
import {readBusinessDraft, saveBusinessLocation} from '@otosanayide/core/business-draft';
import {locationSchema, mapsLocationUrl, type ServiceLocation} from '@otosanayide/core/location';
import LocationMap from '~/components/LocationMap.vue';
import PlaceSearch from '~/components/PlaceSearch.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
const app = useApp();
const saved = ref<ServiceLocation | null>(null);
const editing = ref(false);
const address = ref('');
const lat = ref('');
const lng = ref('');
const message = ref('');
const error = ref('');

useClientEffect(() => [app.demo], () => {
  if (app.demo)
    try {
      const value = locationSchema.safeParse(readBusinessDraft(localStorage).location);
      if (value.success) saved.value = value.data;
    } catch {}
});

function open() {
  let existing = '';
  try {
    const draft = readBusinessDraft(localStorage);
    existing = typeof draft.address === 'string' ? draft.address : '';
  } catch {}
  address.value = saved.value?.address ?? existing;
  lat.value = saved.value ? String(saved.value.latitude) : '';
  lng.value = saved.value ? String(saved.value.longitude) : '';
  editing.value = true;
  error.value = '';
  message.value = '';
}
function choose(p: ServiceLocation) {
  address.value = p.address;
  lat.value = String(p.latitude);
  lng.value = String(p.longitude);
}
function moveTo(a: number, b: number) {
  lat.value = String(a);
  lng.value = String(b);
}
function save(e: Event) {
  e.preventDefault();
  if (!app.demo || !app.member) return;
  const result = locationSchema.safeParse({address: address.value, latitude: lat.value, longitude: lng.value});
  if (!result.success) {
    error.value = 'Açık adresi ve geçerli enlem (-90…90), boylam (-180…180) değerlerini gir.';
    return;
  }
  try {
    saveBusinessLocation(localStorage, result.data);
    window.dispatchEvent(new Event('business-draft-changed'));
    saved.value = result.data;
    editing.value = false;
    message.value = 'Konum taslağı kaydedildi. Halka açık işletme konumu değiştirilmedi.';
    error.value = '';
  } catch {
    error.value = 'Konum kaydedilemedi. Tekrar dene.';
  }
}
function cancel() {
  editing.value = false;
  error.value = '';
}

// The source re-subscribes every render only to see fresh state; refs are always fresh here.
useClientEffect(() => [], () => {
  function edit() {
    if (app.demo && app.member && !editing.value) open();
  }
  window.addEventListener('edit-business-location', edit);
  return () => window.removeEventListener('edit-business-location', edit);
});

const dirty = computed(() => editing.value && (address.value !== (saved.value?.address ?? '') || lat.value !== (saved.value ? String(saved.value.latitude) : '') || lng.value !== (saved.value ? String(saved.value.longitude) : '')));

useClientEffect(() => [dirty.value], () => {
  if (!dirty.value) return;
  function warn(e: BeforeUnloadEvent) {
    e.preventDefault();
    e.returnValue = '';
  }
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
});

const candidate = computed(() => locationSchema.safeParse({address: address.value, latitude: lat.value, longitude: lng.value}));
const addressSearchUrl = computed(() => `https://www.google.com/maps/search/?${new URLSearchParams({api: '1', query: address.value})}`);
</script>

<template>
  <section id="business-location" class="panel">
    <div class="row between"><h2 class="row"><MapPin :size="24"/>{{ i18nT("İşletme konumu") }}</h2><button v-if="!editing" class="button secondary compact" :disabled="!app.demo || !app.member" @click="open"><Pencil :size="16"/>{{ saved ? i18nT("Konumu düzenle") : i18nT("Konum ekle") }}</button></div>
    <form v-if="editing" class="stack" @submit="save">
      <PlaceSearch :onSelect="choose"/>
      <label>{{ i18nT("Açık adres / arama metni") }}<textarea v-model="address" required minlength="5" maxlength="500"/></label>
      <a v-if="address.trim()" class="text-link" target="_blank" rel="noreferrer" :href="addressSearchUrl">{{ i18nT("Bu adresi Google Maps’te ara ↗") }}</a>
      <div class="form-grid"><label>{{ i18nT("Enlem") }}<input required type="number" step="any" min="-90" max="90" :value="lat" @input="lat=($event.target as HTMLInputElement).value"/></label><label>{{ i18nT("Boylam") }}<input required type="number" step="any" min="-180" max="180" :value="lng" @input="lng=($event.target as HTMLInputElement).value"/></label></div>
      <LocationMap v-if="candidate.success" :latitude="candidate.data.latitude" :longitude="candidate.data.longitude" :onMove="moveTo"/>
      <p class="small muted">{{ i18nT("Adres ve konum birlikte kaydedilir. Arama sonucunu seç, ardından haritada noktayı kontrol et. Harita bağlıyken işareti sürükleyebilir veya haritaya dokunabilirsin. Noktayı taşımak açık adres metnini otomatik değiştirmez.") }}</p>
      <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
      <div class="row"><button class="button primary">{{ i18nT("Konumu kaydet") }}</button><button class="button secondary" type="button" @click="cancel">{{ i18nT("Vazgeç") }}</button></div>
    </form>
    <template v-else-if="saved">
      <p>{{ saved.address }}</p>
      <LocationMap :latitude="saved.latitude" :longitude="saved.longitude"/>
      <a class="button secondary full" :href="mapsLocationUrl(saved)" target="_blank" rel="noreferrer"><MapPin :size="18"/>{{ i18nT("Google Maps’te aç") }}</a>
      <p class="small muted">{{ i18nT("Konum taslağı · Henüz doğrulanmadı") }}</p>
    </template>
    <div v-else class="inline-empty"><MapPin :size="30"/><p>{{ i18nT("Henüz bağlı bir işletme konumu yok. Konum ekleyerek harita noktasını ve adresini birlikte kaydedebilirsin.") }}</p></div>
    <p v-if="message" role="status" class="notice">{{ i18nT(message) }}</p>
    <p class="small muted">{{ i18nT("Önizlemede yalnızca bu tarayıcıda saklanır. Canlı değişiklikler işletme yetkisi ve konum doğrulaması gerektirir.") }}</p>
  </section>
</template>
