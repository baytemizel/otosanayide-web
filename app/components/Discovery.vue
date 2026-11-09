<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight, List, LocateFixed, Map as MapIcon, MapPin, Search, SlidersHorizontal, X} from '@lucide/vue';
import {brands, categories, cities, type Business} from '@otosanayide/core';
import {areaReference, coverageCount, nearbySearchFields, referenceDistricts} from '@otosanayide/core/coverage';
import type {SavedCriteria} from '@otosanayide/core/discovery-tools';
import {searchSuggestions} from '@otosanayide/core/search-suggestions';
import type {SponsoredItem} from '@otosanayide/core/sponsored';
import BrandBanners from '~/components/BrandBanners.vue';
import BusinessCard from '~/components/BusinessCard.vue';
import CategoryPicker from '~/components/CategoryPicker.vue';
import DiscoveryTools from '~/components/DiscoveryTools.vue';
import MapPanel from '~/components/MapPanel.vue';
import NearbyControls from '~/components/NearbyControls.vue';
import SponsoredResults from '~/components/SponsoredResults.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

const {t: i18nT, locale} = useLocale();
const q = ref('');
const city = ref('');
const district = ref('');
const districts = ref<string[]>([]);
const category = ref('');
const service = ref('');
const brand = ref('');
const card = ref(false);
const filters = ref(false);
const view = ref('list');
const sponsored = ref<SponsoredItem[]>([]);
const items = ref<Business[]>([]);
const loading = ref(true);
const error = ref('');
const submitted = ref('');
const center = ref<{latitude: number; longitude: number} | undefined>();
const app = useApp();
const radius = ref(25);
const centerOrigin = ref<'device' | 'area'>('device');
const locating = ref(false);
const reference = computed(() => areaReference(city.value, district.value));
const districtOptions = computed(() => [...new Set([...referenceDistricts(city.value), ...districts.value])].sort((a, b) => a.localeCompare(b, 'tr')));

useClientEffect(() => [], () => {
  try {
    const saved = localStorage.getItem('otosanayide-city');
    if (saved && cities.includes(saved)) city.value = saved;
  } catch {}
});
useClientEffect(() => [city.value], () => {
  try {
    if (city.value) localStorage.setItem('otosanayide-city', city.value);
    else localStorage.removeItem('otosanayide-city');
  } catch {}
});
useClientEffect(() => [submitted.value, city.value, district.value, category.value, service.value, brand.value, card.value, center.value, radius.value], () => {
  const controller = new AbortController();
  loading.value = true;
  error.value = '';
  sponsored.value = [];
  const params = new URLSearchParams({q: submitted.value, ...nearbySearchFields(city.value, district.value, center.value), category: category.value, service: service.value, brand: brand.value, card: String(card.value)});
  if (center.value) {
    params.set('lat', String(center.value.latitude));
    params.set('lng', String(center.value.longitude));
    params.set('radius', String(radius.value));
  }
  apiFetch(`/api/search?${params}`, {signal: controller.signal}).then(async r => {
    const b = await r.json();
    if (!r.ok) throw Error(b.error ?? 'Arama kullanılamıyor.');
    if (!controller.signal.aborted) {
      items.value = b.items;
      sponsored.value = b.sponsored ?? [];
      districts.value = b.districts ?? [];
    }
  }).catch(e => {
    if (e.name !== 'AbortError') error.value = e.message;
  }).finally(() => {
    if (!controller.signal.aborted) loading.value = false;
  });
  return () => controller.abort();
});

function selectCategory(id: string) {
  category.value = id;
  service.value = '';
}
function clearFilters() {
  service.value = '';
  if (!center.value) district.value = '';
  category.value = '';
  brand.value = '';
  card.value = false;
  q.value = '';
  submitted.value = '';
}
const activeFilters = computed(() => [
  ...(service.value ? [{label: i18nT('Hizmet: {0}', {'0': i18nT(service.value)}), clear: () => { service.value = ''; }}] : []),
  ...(district.value && !center.value ? [{label: i18nT('İlçe: {0}', {'0': district.value}), clear: () => { district.value = ''; }}] : []),
  ...(submitted.value ? [{label: i18nT('Arama: {0}', {'0': submitted.value}), clear: () => { q.value = ''; submitted.value = ''; }}] : []),
  ...(category.value ? [{label: categories.find(c => c.id === category.value)?.name ?? category.value, clear: () => selectCategory('')}] : []),
  ...(brand.value ? [{label: brand.value, clear: () => { brand.value = ''; }}] : []),
  ...(card.value ? [{label: 'Kartla ödeme', clear: () => { card.value = false; }}] : []),
]);
function locate() {
  if (locating.value) return;
  if (!navigator.geolocation) {
    app.notify('Konum desteklenmiyor. İl seçerek devam edebilirsin.');
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(p => {
    center.value = {latitude: p.coords.latitude, longitude: p.coords.longitude};
    centerOrigin.value = 'device';
    city.value = '';
    district.value = '';
    districts.value = [];
    locating.value = false;
    app.notify('Yakınlık araması açıldı; yalnızca doğrulanmış konumlar gösterilir.');
  }, () => {
    locating.value = false;
    app.notify('Konum alınamadı. İl seçerek aramaya devam edebilirsin.');
  }, {timeout: 10000, maximumAge: 60000});
}
function includeSurroundings() {
  // A fresh point on each press, as the source recomputes the reference every render.
  const anchor = areaReference(city.value, district.value);
  if (!anchor) return;
  center.value = anchor;
  centerOrigin.value = 'area';
}
function applySaved(v: SavedCriteria) {
  const anchor = v.areaMode === 'nearby' ? areaReference(v.city, v.district) : null;
  if (v.areaMode === 'nearby' && !anchor) {
    app.notify('Bu yer için referans konum yok. Konumunu kullanarak yakınlık araması yapabilirsin.');
    return;
  }
  q.value = v.q;
  submitted.value = v.q;
  city.value = v.city;
  district.value = v.district;
  category.value = v.category;
  service.value = v.service;
  brand.value = v.brand;
  card.value = v.card;
  center.value = anchor ?? undefined;
  centerOrigin.value = 'area';
  radius.value = v.radius ?? 25;
  districts.value = [];
}
function search(e: Event) {
  e.preventDefault();
  submitted.value = q.value;
}
function changeCity(e: Event) {
  city.value = (e.target as HTMLSelectElement).value;
  district.value = '';
  districts.value = [];
  center.value = undefined;
}
function changeDistrict(e: Event) {
  district.value = (e.target as HTMLSelectElement).value;
  center.value = undefined;
}
function cityOnly() {
  center.value = undefined;
}
function setRadius(value: number) {
  radius.value = value;
}
const criteria = computed<SavedCriteria>(() => ({q: submitted.value, city: city.value, district: district.value, category: category.value, service: service.value, brand: brand.value, card: card.value, ...(center.value && centerOrigin.value === 'area' ? {areaMode: 'nearby' as const, radius: radius.value} : {})}));
</script>

<template>
  <div class="container" id="content">
    <section class="hero">
      <div>
        <h1>{{ i18nT('Aracına iyi gelecek') }}<br/>{{ i18nT('bir yer bul.') }}</h1>
        <p>{{ i18nT('Özel servislerden detaylı bakıma.') }}<br class="mobile-only"/>{{ i18nT(' Şimdilik {0} ilde.',{'0':coverageCount}) }}</p>
      </div>
      <img class="hero-photo" src="/workshop.png" :alt="i18nT('Otosanayide için hazırlanmış örnek oto atölyesi görseli')"/>
    </section>
    <form class="search-bar" @submit="search">
      <Search :size="25"/>
      <label class="query-label">
        <span>{{ i18nT('Hangi hizmeti arıyorsun?') }}</span>
        <input v-model="q" list="service-search-suggestions" autocomplete="off" :placeholder="i18nT('Örn. motor bakımı, oto kuaför, lastik değişimi')" :aria-label="i18nT('Hizmet veya işletme ara')" maxlength="150"/>
        <datalist id="service-search-suggestions">
          <option v-for="label in searchSuggestions(q,locale)" :key="label" :value="label"/>
        </datalist>
      </label>
      <div class="location-select">
        <MapPin :size="23"/>
        <select :aria-label="i18nT('İl')" :value="city" @change="changeCity">
          <option value="">{{ i18nT('Şehrini seç') }}</option>
          <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <button class="button primary" type="submit">{{ i18nT('Servis bul ') }}<ArrowRight :size="20"/></button>
    </form>
    <NearbyControls :city="city" :district="district" :active="!!center" :origin="centerOrigin" :radius="radius" :referenceAvailable="!!reference" :locating="locating" :onReference="includeSurroundings" :onCityOnly="cityOnly" :onDevice="locate" :onRadius="setRadius"/>
    <CategoryPicker :value="category" :onChange="selectCategory"/>
    <section v-if="category" class="service-refinement" :aria-label="i18nT('Hizmet ayrıntısı')">
      <div>
        <h3>{{ i18nT('Hangi hizmete ihtiyacın var?') }}</h3>
        <p>{{ i18nT('İstersen seçtiğin kategoriyi daralt.') }}</p>
      </div>
      <label class="sr-only" for="service-search">{{ i18nT('Hizmet ayrıntısı') }}</label>
      <select id="service-search" v-model="service" :aria-label="i18nT('Hizmet ayrıntısı')">
        <option value="">{{ i18nT('Bu kategorideki tüm hizmetler') }}</option>
        <option v-for="s in categories.find(c=>c.id===category)?.services" :key="s" :value="s">{{ i18nT(s) }}</option>
      </select>
    </section>
    <BrandBanners :city="city" :category="category"/>
    <section class="results">
      <DiscoveryTools :items="items" :criteria="criteria" :onApply="applySaved"/>
      <div class="results-heading">
        <h2>{{ center?(centerOrigin==='area'?i18nT('{0} çevresindeki işletmeler',{'0':district||city}):i18nT('Yakınındaki işletmeler')):city?i18nT('{0} işletmelerini keşfet',{'0':district||city}):i18nT('Şehrindeki işletmeleri keşfet') }}</h2>
        <div class="row">
          <button class="button secondary compact" :aria-expanded="filters" @click="filters=!filters"><SlidersHorizontal :size="17"/>{{ i18nT('Filtreler') }}</button>
          <button :class="`button secondary compact ${view==='list'?'is-active':''}`" :aria-pressed="view==='list'" @click="view='list'"><List :size="18"/><span>{{ i18nT('Liste') }}</span></button>
          <button :class="`button secondary compact ${view==='map'?'is-active':''}`" :aria-pressed="view==='map'" @click="view='map'"><MapIcon :size="18"/><span>{{ i18nT('Harita') }}</span></button>
        </div>
      </div>
      <div v-if="city" class="district-filter">
        <label for="district-search">{{ i18nT('İlçe') }}<select id="district-search" :aria-label="i18nT('İlçe')" :value="district" :disabled="loading&&!districts.length" @change="changeDistrict">
          <option value="">{{ i18nT('Tüm ilçeler') }}</option>
          <option v-for="d in districtOptions" :key="d" :value="d">{{ d }}</option>
        </select></label>
        <p class="small muted">{{ i18nT('İlçeler resmî yerleşim listesinden gelir; sonuçlar veri kapsamına bağlıdır.') }}</p>
      </div>
      <div v-if="filters" class="filter-panel">
        <label>{{ i18nT('Marka') }}<select v-model="brand">
          <option value="">{{ i18nT('Tüm markalar') }}</option>
          <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
        </select></label>
        <label class="check"><input v-model="card" type="checkbox"/>{{ i18nT('Kart kabul ettiği bilinen') }}</label>
        <button class="button secondary" @click="locate"><LocateFixed :size="18"/>{{ i18nT('Yakınımdakileri bul') }}</button>
        <button class="text-button" @click="clearFilters">{{ i18nT('Filtreleri temizle') }}</button>
      </div>
      <div v-if="activeFilters.length>0" class="active-search-filters" :aria-label="i18nT('Seçili arama filtreleri')">
        <button v-for="f in activeFilters" :key="f.label" class="filter-chip" :aria-label="i18nT('{0} filtresini kaldır',{'0':f.label})" @click="f.clear">{{ i18nT(f.label) }}<X :size="15"/></button>
        <button class="text-button" @click="clearFilters">{{ i18nT('Tümünü temizle') }}</button>
      </div>
      <p v-if="(city||center)&&!loading&&!error" class="small muted" role="status">{{ i18nT(app.demo?(items.length===1?'{0} işletme bulundu · Örnek kayıt':'{0} işletme bulundu · Örnek kayıtlar'):'{0} işletme gösteriliyor',{'0':items.length}) }}</p>
      <SponsoredResults v-if="!loading&&!error&&view==='list'" :items="sponsored"/>{{ ' ' }}<div v-if="!city&&!center" class="empty">
        <MapPin :size="34"/>
        <h3>{{ i18nT('Şehrini seç, çevrendeki işletmeleri keşfet.') }}</h3>
        <p>{{ i18nT('Konumunu paylaşabilir veya yukarıdan ilini seçebilirsin. Seçtiğin şehri sonraki ziyaretinde hatırlayacağız.') }}</p>
        <button class="button primary" @click="locate"><LocateFixed :size="18"/>{{ i18nT('Konumumu kullan') }}</button>
      </div>
      <div v-else-if="error" class="empty" role="alert">
        <h3>{{ i18nT('Arama şu anda kullanılamıyor') }}</h3>
        <p>{{ i18nT(error) }}</p>
      </div>
      <div v-else-if="loading" class="skeleton-grid" :aria-label="i18nT('Sonuçlar yükleniyor')">
        <div v-for="n in [1,2,3]" :key="n"/>
      </div>
      <MapPanel v-else-if="view==='map'" :items="items"/>
      <div v-else-if="items.length" class="business-grid">
        <BusinessCard v-for="b in items" :key="b.id" :business="b"/>
      </div>
      <div v-else class="empty">
        <Search :size="32"/>
        <h3>{{ i18nT('Bu filtrelerle sonuç bulunamadı.') }}</h3>
        <p>{{ i18nT(app.demo?'Farklı bir hizmet veya il seçebilirsin. Önizlemede sınırlı örnek işletmeler bulunuyor.':'Farklı bir hizmet veya il seçebilirsin.') }}</p>
        <button class="button secondary" @click="clearFilters">{{ i18nT('Hizmet filtrelerini temizle') }}</button>
      </div>
    </section>
  </div>
</template>
