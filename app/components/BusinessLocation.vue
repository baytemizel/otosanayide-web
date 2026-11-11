<script setup lang="ts">
import {computed, ref} from 'vue';
import {MapPin, Pencil, ShieldCheck, TriangleAlert} from '@lucide/vue';
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
const pointMoved = computed(() => editing.value && !!saved.value && address.value === saved.value.address && (lat.value !== String(saved.value.latitude) || lng.value !== String(saved.value.longitude)));
const addressSearchUrl = computed(() => `https://www.google.com/maps/search/?${new URLSearchParams({api: '1', query: address.value})}`);
</script>

<template>
  <section id="business-location" class="ds-col ds-g20">
    <div class="ds-tabs">
      <button type="button" class="on" aria-pressed="true">{{ i18nT("Konum") }}</button>
      <button type="button" class="ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Çalışma saatleri") }}</button>
      <button type="button" class="ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Tatil ve izinler") }}</button>
    </div>
    <form v-if="editing" class="loc-grid" @submit="save">
      <div class="ds-col ds-g12 loc-map">
        <PlaceSearch :onSelect="choose"/>
        <LocationMap v-if="candidate.success" :latitude="candidate.data.latitude" :longitude="candidate.data.longitude" :onMove="moveTo"/>
        <div v-else class="ds-mapbg loc-placeholder" aria-hidden="true"/>
      </div>
      <div class="ds-card ds-pad24 stack">
        <h3>{{ i18nT("Adres ve koordinat") }}</h3>
        <label>{{ i18nT("Adres metni") }}<textarea v-model="address" class="ds-field" required minlength="5" maxlength="500"/></label>
        <a v-if="address.trim()" class="text-link" target="_blank" rel="noreferrer" :href="addressSearchUrl">{{ i18nT("Bu adresi Google Maps’te ara ↗") }}</a>
        <div class="form-grid"><label>{{ i18nT("Enlem") }}<input class="ds-field" required type="number" step="any" min="-90" max="90" :value="lat" @input="lat=($event.target as HTMLInputElement).value"/></label><label>{{ i18nT("Boylam") }}<input class="ds-field" required type="number" step="any" min="-180" max="180" :value="lng" @input="lng=($event.target as HTMLInputElement).value"/></label></div>
        <div v-if="pointMoved" class="ds-note warn"><TriangleAlert :size="16" class="ds-i"/><span>{{ i18nT("İşaret taşındı. Adres metni otomatik değişmez; ikisini kontrol edip kaydet.") }}</span></div>
        <div class="ds-note"><ShieldCheck :size="16" class="ds-i"/><span>{{ i18nT("Adres ve konum birlikte kaydedilir. Arama sonucunu seç, ardından haritada noktayı kontrol et. Harita bağlıyken işareti sürükleyebilir veya haritaya dokunabilirsin. Noktayı taşımak açık adres metnini otomatik değiştirmez.") }}</span></div>
        <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
        <div class="ds-row ds-g10 ds-wrap"><button class="ds-btn p">{{ i18nT("Konumu kaydet") }}</button><button class="ds-btn s" type="button" @click="cancel">{{ i18nT("Vazgeç") }}</button></div>
      </div>
    </form>
    <div v-else-if="saved" class="loc-grid">
      <div class="loc-map"><LocationMap :latitude="saved.latitude" :longitude="saved.longitude"/></div>
      <div class="ds-card ds-pad24 ds-col ds-g16">
        <div class="ds-row ds-sb ds-g12 ds-wrap"><h3>{{ i18nT("Adres ve koordinat") }}</h3><button class="ds-btn s sm" :disabled="!app.demo || !app.member" @click="open"><Pencil :size="15"/>{{ i18nT("Konumu düzenle") }}</button></div>
        <p class="ds-small">{{ saved.address }}</p>
        <a class="ds-btn s" :href="mapsLocationUrl(saved)" target="_blank" rel="noreferrer"><MapPin :size="18"/>{{ i18nT("Google Maps’te aç") }}</a>
        <p class="ds-xs ds-muted">{{ i18nT("Konum taslağı · Henüz doğrulanmadı") }}</p>
      </div>
    </div>
    <div v-else class="ds-card ds-pad24 loc-empty">
      <MapPin :size="30" class="ds-i"/>
      <p class="ds-small ds-muted">{{ i18nT("Henüz bağlı bir işletme konumu yok. Konum ekleyerek harita noktasını ve adresini birlikte kaydedebilirsin.") }}</p>
      <button class="ds-btn s sm" :disabled="!app.demo || !app.member" @click="open"><Pencil :size="15"/>{{ i18nT("Konum ekle") }}</button>
    </div>
    <div v-if="message" role="status" class="ds-note ok">{{ i18nT(message) }}</div>
    <p class="ds-xs ds-muted">{{ i18nT("Önizlemede yalnızca bu tarayıcıda saklanır. Canlı değişiklikler işletme yetkisi ve konum doğrulaması gerektirir.") }}</p>
  </section>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
.ds-card.stack label {font-weight: 700;}
.loc-grid {display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 20px; align-items: start;}
.loc-map {min-width: 0;}
.loc-map :deep(.location-map) {height: 460px; margin: 0; border-radius: 14px;}
.loc-placeholder {min-height: 460px; border-radius: 14px;}
.loc-empty {display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 24px; text-align: center;}
@media (max-width: 1100px) {
  .loc-grid {grid-template-columns: minmax(0, 1fr);}
  .loc-map :deep(.location-map), .loc-placeholder {height: 320px; min-height: 320px;}
}
</style>
