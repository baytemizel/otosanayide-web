<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight, CalendarDays, ChevronDown, ClipboardCheck, Info, List, LocateFixed, Map as MapIcon, MapPin, Search, ShieldCheck, SlidersHorizontal, Star, X} from '@lucide/vue';
import {brands, categories, cities, type Business} from '@otosanayide/core';
import {approximateDistance, areaReference, coverageCount, nearbySearchFields, referenceDistricts} from '@otosanayide/core/coverage';
import type {SavedCriteria} from '@otosanayide/core/discovery-tools';
import {searchSuggestions} from '@otosanayide/core/search-suggestions';
import type {SponsoredItem} from '@otosanayide/core/sponsored';
import BrandBanners from '~/components/BrandBanners.vue';
import BusinessCard from '~/components/BusinessCard.vue';
import BusinessVisual from '~/components/BusinessVisual.vue';
import CategoryPicker from '~/components/CategoryPicker.vue';
import DiscoveryTools from '~/components/DiscoveryTools.vue';
import MapPanel from '~/components/MapPanel.vue';
import NearbyControls from '~/components/NearbyControls.vue';
import OpenStatus from '~/components/OpenStatus.vue';
import PortalLink from '~/components/PortalLink.vue';
import SponsoredResults from '~/components/SponsoredResults.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {contractReady} from '~/lib/contract';
import {decodeSearchPage, type BusinessExtras} from '~/lib/search-response';
import provinceData from '~/data/provinces.json';
import CoverageWaitlist from '~/components/CoverageWaitlist.vue';

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
const extras = ref<Record<string, BusinessExtras>>({});
const total = ref<{value: number; exact: boolean} | null>(null);
const nextCursor = ref<string | null>(null);
/** Cursors of the pages before the current one; empty on the first page. */
const pages = ref<string[]>([]);
const cursor = ref('');
const sortOptions = [
  {value: 'recommended', label: 'Önerilen'},
  {value: 'nearest', label: 'En yakın'},
  {value: 'rating', label: 'En yüksek değerlendirme'},
  {value: 'most_reviewed', label: 'En çok değerlendirilen'},
] as const;
const sort = ref<(typeof sortOptions)[number]['value']>('recommended');
/** web-06: only the verified-owner filter was accepted; the other new filters stay passive. */
const verifiedOnly = ref(false);
/** Provinces outside coverage are offered only to join the waitlist (web-12); they are never searched. */
const uncoveredCities = (provinceData.provinces as string[]).filter(c => !cities.includes(c)).sort((a, b) => a.localeCompare(b, 'tr'));
const uncovered = computed(() => !!city.value && !cities.includes(city.value));
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
// Any change of criteria starts again from the first page.
useClientEffect(() => [submitted.value, city.value, district.value, category.value, service.value, brand.value, card.value, center.value, radius.value, sort.value, verifiedOnly.value], () => {
  pages.value = [];
  cursor.value = '';
});
useClientEffect(() => [submitted.value, city.value, district.value, category.value, service.value, brand.value, card.value, center.value, radius.value, sort.value, verifiedOnly.value, cursor.value], () => {
  if (uncovered.value) {
    items.value = [];
    loading.value = false;
    error.value = '';
    return;
  }
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
  // Search v2 (web-05): demo answers only the v1 shape, so the new keys go to the live API alone.
  if (contractReady.searchV2 && !app.demo) {
    params.set('v', '2');
    if (sort.value !== 'recommended' && !(sort.value === 'nearest' && !center.value)) params.set('sort', sort.value);
    if (verifiedOnly.value) params.set('verifiedOwner', 'true');
    if (cursor.value) params.set('cursor', cursor.value);
  }
  // An API that does not know v2 yet answers 400; the same search is then asked in the v1 shape.
  const v1 = new URLSearchParams(params);
  for (const key of ['v', 'sort', 'cursor', 'verifiedOwner']) v1.delete(key);
  apiFetch(`/api/search?${params}`, {signal: controller.signal}).then(r => (r.status === 400 && params.has('v') ? apiFetch(`/api/search?${v1}`, {signal: controller.signal}) : r)).then(async r => {
    let b: unknown = null;
    try {
      b = await r.json();
    } catch {
      /* A non-JSON body (proxy page) reads as unavailable below. */
    }
    if (!r.ok) throw Error(typeof (b as {error?: unknown})?.error === 'string' ? (b as {error: string}).error : 'Arama kullanılamıyor.');
    let page;
    try {
      page = decodeSearchPage(b, app.demo ? 'demo' : 'live');
    } catch {
      throw Error('Arama yanıtı okunamadı. Lütfen daha sonra tekrar dene.');
    }
    if (!controller.signal.aborted) {
      items.value = page.items;
      extras.value = page.extras;
      sponsored.value = page.sponsored;
      districts.value = page.districts;
      total.value = page.total;
      nextCursor.value = page.nextCursor;
    }
  }).catch(e => {
    if (e.name !== 'AbortError') error.value = e.message;
  }).finally(() => {
    if (!controller.signal.aborted) loading.value = false;
  });
  return () => controller.abort();
});
function nextPage() {
  if (!nextCursor.value) return;
  pages.value = [...pages.value, cursor.value];
  cursor.value = nextCursor.value;
}
function previousPage() {
  if (!pages.value.length) return;
  cursor.value = pages.value[pages.value.length - 1]!;
  pages.value = pages.value.slice(0, -1);
}
const paged = computed(() => !!nextCursor.value || pages.value.length > 0);

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
  verifiedOnly.value = false;
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
  ...(verifiedOnly.value ? [{label: 'Sadece doğrulanmış', clear: () => { verifiedOnly.value = false; }}] : []),
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

// View-only state for the Figma layouts (W01 / W02 / W03 / S03); no request logic lives here.
const refining = computed(() => !!(submitted.value || category.value || service.value || brand.value || card.value || verifiedOnly.value || district.value || center.value));
const sideAuto = computed(() => refining.value && view.value !== 'map');
const sideShown = computed(() => sideAuto.value || filters.value);
const rows = computed(() => sideShown.value && view.value === 'list');
const noResults = computed(() => !loading.value && !error.value && !!(city.value || center.value) && view.value === 'list' && items.value.length === 0);
const unpinned = computed(() => items.value.filter(b => b.coordinateStatus !== 'verified' || b.latitude === undefined || b.longitude === undefined).length);
const heading = computed(() => {
  const place = district.value || city.value;
  const topic = service.value || categories.find(c => c.id === category.value)?.name || submitted.value;
  if (!center.value && place && topic) return `${place} · ${i18nT(topic)}`;
  return center.value ? (centerOrigin.value === 'area' ? i18nT('{0} çevresindeki işletmeler', {'0': district.value || city.value}) : i18nT('Yakınındaki işletmeler')) : city.value ? i18nT('{0} işletmelerini keşfet', {'0': district.value || city.value}) : i18nT('Şehrindeki işletmeleri keşfet');
});
const passivePayment = ['Taksit', 'Nakit'];
const passiveStatus = ['Şu an açık', 'Hafta sonu açık', 'Sanayi sitesi içinde'];
const passiveAmenities = ['Bekleme alanı', 'WC', 'Erişilebilir giriş'];
const guides = [
  {icon: ClipboardCheck, title: 'Ekspertizde nelere bakılır?', body: 'Kaporta, motor ve elektronik kontrol listesi.'},
  {icon: CalendarDays, title: 'Periyodik bakım ne zaman?', body: 'Kilometre ve süreye göre basit takvim.'},
  {icon: Star, title: 'Yorumları nasıl okumalı?', body: 'Az yorumlu 5,0 ile çok yorumlu 4,8 farkı.'},
];
</script>

<template>
  <div class="dsc" :class="{refining}" id="content">
    <section v-if="!refining" class="dsc-hero">
      <div class="dsc-hero-copy">
        <span class="ds-chip o dsc-hero-tag"><ShieldCheck :size="14"/>{{ i18nT('Ücretsiz keşif · Üyelik gerekmez') }}</span>
        <h1>{{ i18nT('Aracına iyi gelecek') }}{{ ' ' }}<br/>{{ i18nT('bir yer bul.') }}</h1>
        <p>{{ i18nT('Özel servislerden detaylı bakıma.') }}{{ i18nT(' Şimdilik {0} ilde.',{'0':coverageCount}) }}</p>
        <NuxtLink class="dsc-hero-link" to="/hakkinda">{{ i18nT('Kapsamdaki {0} ili gör',{'0':coverageCount}) }}</NuxtLink>
      </div>
      <div class="dsc-hero-media">
        <img src="/figma/discovery/hero.webp" :alt="i18nT('Otosanayide için hazırlanmış örnek oto atölyesi görseli')"/>
        <span>{{ i18nT('Tanıtım görseli') }}</span>
      </div>
    </section>

    <div class="dsc-searchwrap">
      <form class="dsc-search" @submit="search">
        <label class="dsc-search-q">
          <Search :size="22"/>
          <span class="sr-only">{{ i18nT('Hangi hizmeti arıyorsun?') }}</span>
          <input v-model="q" list="service-search-suggestions" autocomplete="off" :placeholder="i18nT('Örn. BMW bakım, göçük, turbo tamiri')" :aria-label="i18nT('Hizmet veya işletme ara')" maxlength="150"/>
          <datalist id="service-search-suggestions">
            <option v-for="label in searchSuggestions(q,locale)" :key="label" :value="label"/>
          </datalist>
        </label>
        <div class="dsc-search-place">
          <MapPin :size="18"/>
          <select :aria-label="i18nT('İl')" :value="city" @change="changeCity">
            <option value="">{{ i18nT('Şehrini seç') }}</option>
            <optgroup :label="i18nT('Yayındaki iller')">
              <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
            </optgroup>
            <optgroup v-if="contractReady.accountExtras" :label="i18nT('Henüz yayında olmayan iller')">
              <option v-for="c in uncoveredCities" :key="c" :value="c">{{ c }}</option>
            </optgroup>
          </select>
          <ChevronDown class="dsc-chev" :size="16"/>
        </div>
        <div class="dsc-search-place">
          <select id="district-search" :aria-label="i18nT('İlçe')" :value="district" :disabled="!city||(loading&&!districts.length)" @change="changeDistrict">
            <option value="">{{ i18nT('Tüm ilçeler') }}</option>
            <option v-for="d in districtOptions" :key="d" :value="d">{{ d }}</option>
          </select>
          <ChevronDown class="dsc-chev" :size="16"/>
        </div>
        <button class="ds-btn p lg dsc-search-go" type="submit">{{ i18nT('Servis bul ') }}<ArrowRight :size="18"/></button>
      </form>
      <div v-if="!refining" class="dsc-meta">
        <span class="ds-row ds-g6 ds-small ds-muted"><ShieldCheck :size="16"/>{{ i18nT('Telefon, yol tarifi ve yorum okuma ücretsiz') }}</span>
        <button class="dsc-near" type="button" @click="locate"><LocateFixed :size="17"/>{{ i18nT('Yakınımdakileri bul') }}</button>
      </div>
    </div>

    <CategoryPicker :value="category" :onChange="selectCategory"/>

    <section class="dsc-results" :class="{'with-side':sideShown}">
      <aside v-if="sideShown" class="dsc-side" :class="{open:filters}" :aria-label="i18nT('Filtreler')">
        <div class="ds-row ds-sb">
          <h3>{{ i18nT('Filtreler') }}</h3>
          <button class="dsc-clear" type="button" @click="clearFilters">{{ i18nT('Temizle') }}</button>
        </div>
        <NearbyControls :city="city" :district="district" :active="!!center" :origin="centerOrigin" :radius="radius" :referenceAvailable="!!reference" :locating="locating" :onReference="includeSurroundings" :onCityOnly="cityOnly" :onDevice="locate" :onRadius="setRadius"/>
        <template v-if="category">
          <div class="ds-divider"/>
          <fieldset class="dsc-group">
            <legend>{{ i18nT('Hizmet') }}</legend>
            <label v-for="s in categories.find(c=>c.id===category)?.services" :key="s"><input type="checkbox" class="ds-check" :checked="service===s" @change="service=service===s?'':s"/><span>{{ i18nT(s) }}</span></label>
          </fieldset>
        </template>
        <div class="ds-divider"/>
        <div class="dsc-group">
          <label class="dsc-group-title" for="brand-search">{{ i18nT('Marka uzmanlığı') }}</label>
          <select id="brand-search" v-model="brand" class="ds-field">
            <option value="">{{ i18nT('Tüm markalar') }}</option>
            <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
        <div class="ds-divider"/>
        <fieldset class="dsc-group">
          <legend>{{ i18nT('Ödeme') }}</legend>
          <label><input v-model="card" type="checkbox" class="ds-check"/><span>{{ i18nT('Kart kabul ediyor') }}</span></label>
          <label v-for="x in passivePayment" :key="x" class="ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><input type="checkbox" class="ds-check" disabled aria-disabled="true"/><span>{{ i18nT(x) }}</span></label>
        </fieldset>
        <div class="ds-divider"/>
        <fieldset class="dsc-group">
          <legend>{{ i18nT('Durum') }}</legend>
          <label v-if="contractReady.searchV2&&!app.demo"><input v-model="verifiedOnly" type="checkbox" class="ds-check"/><span>{{ i18nT('Sadece doğrulanmış') }}</span></label>
          <label v-else class="ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><input type="checkbox" class="ds-check" disabled aria-disabled="true"/><span>{{ i18nT('Sadece doğrulanmış') }}</span></label>
          <label v-for="x in passiveStatus" :key="x" class="ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><input type="checkbox" class="ds-check" disabled aria-disabled="true"/><span>{{ i18nT(x) }}</span></label>
        </fieldset>
        <div class="ds-divider"/>
        <fieldset class="dsc-group">
          <legend>{{ i18nT('Olanaklar') }}</legend>
          <label v-for="x in passiveAmenities" :key="x" class="ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><input type="checkbox" class="ds-check" disabled aria-disabled="true"/><span>{{ i18nT(x) }}</span></label>
        </fieldset>
        <div class="ds-divider"/>
        <p v-if="city" class="ds-xs ds-muted">{{ i18nT('İlçeler resmî yerleşim listesinden gelir; sonuçlar veri kapsamına bağlıdır.') }}</p>
        <p class="ds-xs ds-muted">{{ i18nT('Bilinmeyen bilgi “var” sayılmaz. Değerler işletme beyanı veya kullanıcı katkısıdır, güncelleme tarihiyle gösterilir.') }}</p>
      </aside>

      <div class="dsc-main">
        <div class="dsc-head">
          <div class="ds-f1">
            <h2>{{ heading }}</h2>
            <p v-if="(city||center)&&!loading&&!error" class="ds-small ds-muted" role="status">{{ i18nT(app.demo?(items.length===1?'{0} işletme bulundu · Örnek kayıt':'{0} işletme bulundu · Örnek kayıtlar'):'{0} işletme gösteriliyor',{'0':items.length}) }}<template v-if="total&&!app.demo"> · {{ i18nT(total.exact?'toplam {0}':'en az {0}',{'0':total.value}) }}</template><template v-if="center"> · {{ i18nT('Mesafeler kuş uçuşudur') }}</template> · {{ i18nT('Sponsorlu kartlar etiketlidir') }}</p>
          </div>
          <div class="dsc-tools">
            <button class="ds-btn s sm dsc-filter-toggle" :class="{auto:sideAuto}" type="button" :aria-expanded="filters" @click="filters=!filters"><SlidersHorizontal :size="16"/>{{ i18nT('Filtreler') }}</button>
            <label v-if="rows&&contractReady.searchV2&&!app.demo" class="dsc-sort">
              <span class="sr-only">{{ i18nT('Sıralama') }}</span>
              <select v-model="sort" :aria-label="i18nT('Sıralama')">
                <option v-for="o in sortOptions" :key="o.value" :value="o.value" :disabled="o.value==='nearest'&&!center">{{ i18nT('Sırala: {0}',{'0':i18nT(o.label)}) }}</option>
              </select>
              <ChevronDown :size="16" aria-hidden="true"/>
            </label>
            <button v-else-if="rows" class="dsc-sort ds-passive" type="button" disabled aria-disabled="true" :title="i18nT('Yakında')"><span>{{ i18nT('Sırala: Önerilen') }}</span><ChevronDown :size="16"/></button>
            <div class="ds-seg">
              <button type="button" :class="view==='list'?'on':''" :aria-pressed="view==='list'" @click="view='list'"><List :size="16"/><span>{{ i18nT('Liste') }}</span></button>
              <button type="button" :class="view==='map'?'on':''" :aria-pressed="view==='map'" @click="view='map'"><MapIcon :size="16"/><span>{{ i18nT('Harita') }}</span></button>
            </div>
          </div>
        </div>

        <div v-if="activeFilters.length>0&&!noResults" class="dsc-chips" :aria-label="i18nT('Seçili arama filtreleri')">
          <span class="ds-small ds-muted">{{ i18nT('Anladığımız:') }}</span>
          <button v-for="f in activeFilters" :key="f.label" class="ds-chip o" type="button" :aria-label="i18nT('{0} filtresini kaldır',{'0':f.label})" @click="f.clear">{{ i18nT(f.label) }}<X :size="13"/></button>
          <button class="dsc-clear-all" type="button" @click="clearFilters">{{ i18nT('Tümünü temizle') }}</button>
        </div>

        <SponsoredResults v-if="!loading&&!error&&view==='list'" :items="sponsored"/>

        <div v-if="city&&!cities.includes(city)" class="dsc-state">
          <span class="dsc-state-icon o"><MapPin :size="44"/></span>
          <h2>{{ i18nT('Bu ilde henüz yayında değiliz') }}</h2>
          <p>{{ i18nT('Şimdilik {0} ilde hizmet veriyoruz. Açıldığında haber vermemizi ister misin?',{'0':coverageCount}) }}</p>
          <div class="ds-row ds-g12 ds-wrap dsc-state-actions">
            <CoverageWaitlist :city="city"/>
            <button class="ds-btn s ds-passive" type="button" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Yakındaki ili gör') }}</button>
          </div>
          <p class="ds-xs ds-muted">{{ i18nT('Yakındaki il sonuçları ancak sen seçersen açılır.') }}</p>
        </div>
        <div v-else-if="!city&&!center" class="dsc-state">
          <span class="dsc-state-icon o"><MapPin :size="44"/></span>
          <h2>{{ i18nT('Şehrini seç, çevrendeki işletmeleri keşfet.') }}</h2>
          <p>{{ i18nT('Konumunu paylaşabilir veya yukarıdan ilini seçebilirsin. Seçtiğin şehri sonraki ziyaretinde hatırlayacağız.') }}</p>
          <button class="ds-btn p" type="button" @click="locate"><LocateFixed :size="18"/>{{ i18nT('Konumumu kullan') }}</button>
        </div>
        <div v-else-if="error" class="dsc-state" role="alert">
          <h2>{{ i18nT('Arama şu anda kullanılamıyor') }}</h2>
          <p>{{ i18nT(error) }}</p>
        </div>
        <div v-else-if="loading" class="skeleton-grid" :aria-label="i18nT('Sonuçlar yükleniyor')">
          <div v-for="n in [1,2,3]" :key="n"/>
        </div>
        <div v-else-if="view==='map'" class="dsc-split">
          <div class="dsc-split-list">
            <div v-if="unpinned" class="ds-note warn"><Info :size="16"/><span>{{ i18nT('{0} işletmenin konumu doğrulanmadığı için haritada pin yerine listede gösteriliyor.',{'0':unpinned}) }}</span></div>
            <NuxtLink v-for="b in items" :key="b.id" class="dsc-mini" :to="`/servis/${b.id}`">
              <span class="dsc-mini-img"><BusinessVisual :business="b"/></span>
              <span class="ds-col ds-g4 ds-f1">
                <strong>{{ b.name }}</strong>
                <span class="ds-small ds-muted">{{ b.district }}, {{ b.city }}<template v-if="b.distance!==undefined"> · {{ approximateDistance(b.distance,locale) }}</template></span>
                <OpenStatus class="dsc-mini-hours" :openingHours="extras[b.id]?.openingHours" :hours="b.hours"/>
              </span>
            </NuxtLink>
          </div>
          <MapPanel :items="items"/>
        </div>
        <template v-else-if="items.length">
          <div class="business-grid" :class="{'ds-biz-rows':rows}">
            <BusinessCard v-for="b in items" :key="b.id" :business="b" :extras="extras[b.id]"/>
          </div>
          <nav v-if="paged" class="dsc-pager" :aria-label="i18nT('Sayfalama')">
            <button class="ds-btn s sm" type="button" :disabled="!pages.length||loading" @click="previousPage">{{ i18nT('Önceki') }}</button>
            <span class="dsc-pager-now" aria-current="page">{{ pages.length+1 }}</span>
            <button class="ds-btn s sm" type="button" :disabled="!nextCursor||loading" @click="nextPage">{{ i18nT('Sonraki') }}</button>
          </nav>
          <nav v-else-if="rows" class="dsc-pager" :aria-label="i18nT('Sayfalama')">
            <button class="ds-btn s sm ds-passive" type="button" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Önceki') }}</button>
            <span class="dsc-pager-now ds-passive" aria-disabled="true" :title="i18nT('Yakında')">1</span>
            <button class="ds-btn s sm ds-passive" type="button" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Sonraki') }}</button>
          </nav>
        </template>
        <div v-else class="dsc-state">
          <span class="dsc-state-icon"><SlidersHorizontal :size="44"/></span>
          <h2>{{ submitted?i18nT('“{0}” için sonuç yok',{'0':submitted}):i18nT('Bu filtrelerle sonuç bulunamadı.') }}</h2>
          <p>{{ i18nT(app.demo?'Farklı bir hizmet veya il seçebilirsin. Önizlemede sınırlı örnek işletmeler bulunuyor.':'Filtrelerin çok dar olabilir. Marka filtresini kaldırmayı veya ilçeyi genişletmeyi dene.') }}</p>
          <div class="ds-row ds-g12 ds-wrap dsc-state-actions">
            <button class="ds-btn p" type="button" @click="clearFilters">{{ i18nT('Filtreleri temizle') }}</button>
            <button v-if="city&&district" class="ds-btn s" type="button" @click="district=''">{{ i18nT('Tüm {0} genelinde ara',{'0':city}) }}</button>
          </div>
          <div v-if="activeFilters.length>0" class="ds-row ds-g8 ds-wrap dsc-state-actions" :aria-label="i18nT('Seçili arama filtreleri')">
            <button v-for="f in activeFilters" :key="f.label" class="ds-chip o" type="button" :aria-label="i18nT('{0} filtresini kaldır',{'0':f.label})" @click="f.clear">{{ i18nT(f.label) }}<X :size="13"/></button>
          </div>
        </div>

        <DiscoveryTools :items="items" :criteria="criteria" :onApply="applySaved"/>
      </div>
    </section>

    <BrandBanners :city="city" :category="category"/>

    <template v-if="!refining">
      <section class="dsc-guides">
        <h2>{{ i18nT('Doğru servisi seçme rehberleri') }}</h2>
        <div class="dsc-guide-grid">
          <article v-for="g in guides" :key="g.title" class="ds-card dsc-guide">
            <span class="dsc-guide-icon"><component :is="g.icon" :size="22"/></span>
            <h3>{{ i18nT(g.title) }}</h3>
            <p class="ds-small ds-muted">{{ i18nT(g.body) }}</p>
            <span class="ds-passive dsc-guide-link" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Oku') }}<ArrowRight :size="15"/></span>
          </article>
        </div>
      </section>
      <section class="dsc-cta">
        <div class="ds-col ds-g8 ds-f1">
          <h2>{{ i18nT('İşletmen listede mi?') }}</h2>
          <p>{{ i18nT('Profilini ücretsiz sahiplen, bilgilerini güncelle ve yorumlara yanıt ver. Sahiplik rozeti hizmet kalitesi garantisi değildir.') }}</p>
        </div>
        <div class="ds-row ds-g12 ds-wrap">
          <PortalLink class="ds-btn s lg" target="claim">{{ i18nT('Bu işletme benim') }}</PortalLink>
          <PortalLink class="ds-btn n lg" target="newBusiness">{{ i18nT('Yeni işletme ekle') }}</PortalLink>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.dsc {max-width: 1440px; margin: 0 auto; padding: 0 56px 56px;}
.dsc.refining {padding-bottom: 72px;}
.dsc h1, .dsc h2 {margin: 0; color: #10243a;}

.dsc-hero {display: flex; align-items: center; gap: 40px; padding: 48px 0 28px;}
.dsc-hero-copy {flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 16px;}
.dsc-hero-tag {height: 30px;}
.dsc-hero h1 {font-size: 60px; line-height: 1.05;}
.dsc-hero p {margin: 0; font-size: 19px; color: #586879;}
.dsc-hero-link {font-size: 13px; font-weight: 700; color: #10243a; text-decoration: underline; text-underline-offset: 3px;}
.dsc-hero-media {position: relative; flex: 0 1 700px; min-width: 0; height: 320px; border-radius: 18px; overflow: hidden;}
.dsc-hero-media img {width: 100%; height: 100%; object-fit: cover;}
.dsc-hero-media span {position: absolute; left: 12px; bottom: 12px; padding: 3px 8px; border-radius: 6px; background: rgba(16, 36, 58, .7); color: #fff; font-size: 12px;}

.dsc-searchwrap {display: flex; flex-direction: column; gap: 12px;}
.dsc.refining .dsc-searchwrap {padding-top: 16px;}
.dsc-search {display: flex; align-items: center; gap: 16px; height: 76px; padding: 0 10px 0 22px; background: #fff; border: 1px solid #dfe5eb; border-radius: 14px; box-shadow: 0 10px 15px rgba(16, 36, 58, .08);}
.dsc.refining .dsc-search {height: 60px; padding-right: 4px;}
.dsc-search-q {flex: 1; min-width: 0; display: flex; align-items: center; gap: 16px; color: #10243a;}
.dsc-search-q input {flex: 1; min-width: 0; border: 0; padding: 0; min-height: 40px; font-size: 16px; background: transparent; border-radius: 6px;}
.dsc-search-q input::placeholder {color: #586879;}
.dsc-search-place {position: relative; flex: 0 0 186px; display: flex; align-items: center; gap: 8px; height: 36px; padding-left: 16px; border-left: 1px solid #dfe5eb; color: #10243a;}
.dsc-search-place select {flex: 1; min-width: 0; appearance: none; border: 0; padding: 0 22px 0 0; min-height: 36px; font-size: 15px; background: transparent; cursor: pointer; border-radius: 6px;}
.dsc-search-place select:disabled {color: #8a97a6; cursor: not-allowed;}
.dsc-chev {position: absolute; right: 0; top: 10px; pointer-events: none;}
.dsc-meta {display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;}
.dsc-near {display: inline-flex; align-items: center; gap: 6px; padding: 4px 0; border: 0; background: none; font-size: 13px; font-weight: 700; color: #10243a;}

.dsc-results {padding-top: 28px;}
.dsc-results.with-side {display: flex; align-items: flex-start; gap: 32px;}
.dsc-main {flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px;}
.dsc-side {flex: 0 0 300px; width: 300px; display: flex; flex-direction: column; gap: 16px;}
.dsc-side h3 {margin: 0; font-size: 19px;}
.dsc-side p {margin: 0;}
.dsc-clear, .dsc-clear-all {border: 0; background: none; padding: 2px 0; font-size: 13px; font-weight: 700; color: #c4460b;}
.dsc-clear-all {color: #10243a; text-decoration: underline; text-underline-offset: 3px;}
.dsc-group {display: flex; flex-direction: column; gap: 10px; border: 0; margin: 0; padding: 0; min-width: 0;}
.dsc-group legend, .dsc-group-title {padding: 0; margin-bottom: 10px; font-size: 14px; font-weight: 700; color: #10243a;}
.dsc-group-title {margin-bottom: 0;}
.dsc-group label:not(.dsc-group-title) {display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 400; color: #10243a; cursor: pointer;}
.dsc-group label.ds-passive {cursor: not-allowed;}
.dsc-group .ds-check:focus-visible, .ds-field:focus-visible {outline: 2px solid #2459b4; outline-offset: 2px;}

.dsc-head {display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;}
.dsc-head h2 {font-size: 34px; line-height: 1.12;}
.dsc.refining .dsc-head h2 {font-size: 30px;}
.dsc-head p {margin: 2px 0 0;}
.dsc-tools {display: flex; align-items: center; gap: 12px; flex-wrap: wrap;}
.dsc-filter-toggle.auto {display: none;}
.dsc-sort {display: inline-flex; align-items: center; justify-content: space-between; gap: 10px; width: 220px; height: 40px; padding: 0 14px; border: 1px solid #c9d2dc; border-radius: 10px; background: #fff; font-size: 15px; color: #10243a;}
.dsc-chips {display: flex; align-items: center; gap: 8px; flex-wrap: wrap;}
.dsc-chips .ds-chip, .dsc-state .ds-chip {cursor: pointer;}

.dsc-state {display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 110px 16px 120px; text-align: center;}
.dsc-state h2 {font-size: 34px; line-height: 1.12;}
.dsc-state p {margin: 0; font-size: 15px; color: #586879; max-width: 620px;}
.dsc-state p.ds-xs {font-size: 12px;}
.dsc-state-icon {display: flex; align-items: center; justify-content: center; width: 96px; height: 96px; border-radius: 48px; background: #f4f6f8; color: #10243a;}
.dsc-state-icon.o {background: #fff3ec; color: #c4460b;}
.dsc-state-actions {justify-content: center;}

.dsc-pager {display: flex; align-items: center; justify-content: center; gap: 8px; padding-top: 8px;}
.dsc-pager-now {display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 9px; background: #10243a; color: #fff; font-size: 14px; font-weight: 700;}

.dsc-split {display: grid; grid-template-columns: minmax(320px, 3fr) minmax(0, 5fr); border-top: 1px solid #edf0f3;}
.dsc-split-list {display: flex; flex-direction: column; padding: 16px 28px 16px 0; max-height: 820px; overflow-y: auto; gap: 0;}
.dsc-split-list .ds-note {margin-bottom: 4px;}
.dsc-split-list .ds-note :first-child {flex: none;}
.dsc-mini {display: flex; align-items: flex-start; gap: 12px; padding: 14px 0; border-bottom: 1px solid #edf0f3; color: #10243a; text-decoration: none;}
.dsc-mini strong {font-size: 16px; line-height: 1.35; overflow-wrap: anywhere;}
.dsc-mini-img {flex: none; width: 96px; height: 76px; border-radius: 10px; overflow: hidden;}
.dsc-mini-img :deep(img) {width: 100%; height: 100%; object-fit: cover;}
.dsc-mini-img :deep(.visual-initials), .dsc-mini-img :deep(.visual-caption) {display: none;}
.dsc-mini-img :deep(.visual-symbol) {width: 40px; height: 40px; margin: 0; background: none;}
.dsc-mini-img :deep(.visual-symbol svg) {width: 26px; height: 26px;}
.dsc-mini-hours {align-self: flex-start; max-width: 100%; white-space: normal; height: auto; min-height: 24px; padding: 3px 9px;}

.dsc-guides {padding-top: 48px;}
.dsc-guides h2 {font-size: 28px; line-height: 1.15;}
.dsc-guide-grid {display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-top: 18px;}
.dsc-guide {display: flex; flex-direction: column; gap: 10px; padding: 24px;}
.dsc-guide h3, .dsc-guide p {margin: 0;}
.dsc-guide-icon {display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: #fff3ec; color: #c4460b;}
.dsc-guide-link {display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #10243a;}
.dsc-cta {display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-top: 48px; padding: 36px 40px; border-radius: 18px; background: #f4f6f8;}
.dsc-cta h2 {font-size: 28px; line-height: 1.15;}
.dsc-cta p {margin: 0; font-size: 15px; color: #586879;}

@media (min-width: 761px) {
  .ds-biz-rows {display: flex; flex-direction: column; gap: 16px;}
}
@media (max-width: 1100px) {
  .dsc {padding-left: 24px; padding-right: 24px;}
  .dsc-hero h1 {font-size: 48px;}
  .dsc-hero-media {flex-basis: 44%; height: 265px;}
  .dsc-search {flex-wrap: wrap; height: auto; padding: 8px 10px 10px 16px; gap: 8px 12px;}
  .dsc.refining .dsc-search {height: auto; padding: 8px 10px 10px 16px;}
  .dsc-search-q {flex-basis: 100%;}
  .dsc-search-place {flex: 1 1 150px;}
  .dsc-search-place:first-of-type {padding-left: 0; border-left: 0;}
  .dsc-results.with-side {display: block;}
  .dsc-filter-toggle.auto {display: inline-flex;}
  .dsc-side {width: 100%; margin-bottom: 24px;}
  .dsc-side:not(.open) {display: none;}
  .dsc-split {grid-template-columns: 1fr; gap: 16px;}
  .dsc-split-list {padding-right: 0; max-height: none;}
  .dsc-guide-grid {grid-template-columns: repeat(2, minmax(0, 1fr));}
}
@media (max-width: 760px) {
  .dsc {padding-left: 16px; padding-right: 16px; padding-bottom: 32px;}
  .dsc-hero {display: block; padding: 24px 0 12px;}
  .dsc-hero-tag, .dsc-hero-link, .dsc-hero-media {display: none;}
  .dsc-hero-copy {gap: 12px;}
  .dsc-hero h1 {font-size: 36px;}
  .dsc-hero h1 br {display: none;}
  .dsc-hero p {font-size: 15px;}
  .dsc-search {display: block; padding: 0;}
  .dsc.refining .dsc-search {padding: 0;}
  .dsc-search-q {height: 54px; padding: 0 14px; gap: 10px; border-bottom: 1px solid #edf0f3;}
  .dsc-search-q input {font-size: 15px;}
  .dsc-search-place {height: 50px; padding: 0 14px; gap: 10px; border-left: 0;}
  .dsc-search-place + .dsc-search-place {border-top: 1px solid #edf0f3;}
  .dsc-chev {right: 14px; top: 17px;}
  .dsc-search-go {width: calc(100% - 20px); margin: 0 10px 10px;}
  .dsc-meta > span {display: none;}
  .dsc-head h2, .dsc.refining .dsc-head h2 {font-size: 24px;}
  .dsc-results {padding-top: 18px;}
  .dsc-tools {width: 100%;}
  .dsc-sort {flex: 1; width: auto; min-width: 0;}
  .dsc-state {padding: 48px 8px;}
  .dsc-state h2 {font-size: 26px;}
  .dsc-guide-grid {grid-template-columns: 1fr;}
  .dsc-cta {padding: 24px;}
}
@media (max-width: 480px) {
  .dsc-state-actions .ds-btn, .dsc-cta .ds-btn {flex: 1 1 100%;}
}
</style>
