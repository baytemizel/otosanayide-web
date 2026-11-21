<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from 'vue';
import type {LocationQuery} from 'vue-router';
import {Info, ListFilter, MapPin, Search, SlidersHorizontal, X} from '@lucide/vue';
import {cities} from '@otosanayide/core';
import type {AreaPoint} from '@otosanayide/core/coverage';
import V2Button from '~/components/v2/V2Button.vue';
import V2Select from '~/components/v2/V2Select.vue';
import V2ServiceCard from '~/components/v2/V2ServiceCard.vue';
import SearchCompareBar from '~/components/v2/search/SearchCompareBar.vue';
import SearchFilters from '~/components/v2/search/SearchFilters.vue';
import SearchMap from '~/components/v2/search/SearchMap.vue';
import SearchState from '~/components/v2/search/SearchState.vue';
import SearchStrip from '~/components/v2/search/SearchStrip.vue';
import SearchViewToggle from '~/components/v2/search/SearchViewToggle.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useMockCompare} from '~/composables/useMockCompare';
import {useMockSaved} from '~/composables/useMockSaved';
import {useCoverage, useLiveSearch, useSearchCards} from '~/composables/v2/useSearch';
import {
  allBrands, demoFilters, distanceSteps, emptyFilters, locative, matchesFilters, nearbyProvince, paymentLabels, readQuery, sameText,
  searchBusiness, searchBusinesses, sortBusinesses, sortLabels, trLower,
  type PaymentMethod, type SearchBusiness, type SearchFilters as Filters, type SearchSort,
} from '~/data/mock/search';
import {errorStatus} from '~/lib/api-read';
import {demoMode} from '~/lib/env';
import {waitlistApi} from '~/lib/member-api';
import {placeOnMap} from '~/lib/v2/business-card';
import {
  coveredName, isCovered, liveBrands, liveDistricts, livePrimaryBrands, livePrimaryServices, liveServices, nearbyCovered, readLiveQuery,
  resultCount, searchCenter,
} from '~/lib/v2/search';

// W02 Arama sonuçları · Liste (Figma 119:5), W03 · Harita (119:552), S03 Sonuç bulunamadı (128:261) and
// S02 Kapsam dışı il (128:138). The filter state lives in the URL.
// Demo: mock data only, the page filters `searchBusinesses`. Live: GET /api/search?v=2 (useLiveSearch);
// filters the API rejected (taksit, nakit, şu an açık, hafta sonu, counts, bbox) are passive.
useSeoMeta({title: 'Arama sonuçları'});
const demo = demoMode();
const app = useApp();
const searchCards = useSearchCards();
// Live: provinces in service, districts and their centres from GET /api/coverage (bundled list until it answers).
const coverage = useCoverage();

type View = 'liste' | 'harita';
const route = useRoute();
const router = useRouter();
const compare = useMockCompare();
const saved = useMockSaved();

// ---- URL <-> filter state -------------------------------------------------------------------------
const one = (value: LocationQuery[string]) => (Array.isArray(value) ? value[0] ?? '' : value ?? '').trim();
const list = (value: LocationQuery[string]) => one(value).split(',').map((item) => item.trim()).filter(Boolean);
const filterKeys = ['q', 'kategori', 'belirti', 'il', 'ilce', 'marka', 'hizmet', 'odeme', 'mesafe', 'alan', 'acik', 'haftasonu', 'dogrulanmis', 'siralama', 'metin'];
const read = demo ? readQuery : (text: string, base: Filters) => readLiveQuery(text, base, coverage.value);

function fromQuery(query: LocationQuery): Filters {
  if (!demo) return liveFromQuery(query);
  if (!filterKeys.some((key) => one(query[key]))) return demoFilters();
  let f = emptyFilters(one(query.il) || 'İstanbul');
  if (one(query.q)) f = readQuery(one(query.q), f);
  if (one(query.il)) f.il = one(query.il);
  if (query.ilce !== undefined) f.ilce = one(query.ilce);
  const area = one(query.alan);
  f.area = area === 'cevre' || area === 'konum' ? area : 'ilce';
  const km = Number(one(query.mesafe));
  f.km = distanceSteps.includes(km) ? km : 50;
  f.services = [...new Set([...f.services, ...list(query.hizmet), ...list(query.kategori)])];
  f.brands = [...new Set([...f.brands, ...list(query.marka).map((brand) => allBrands.find((b) => sameText(b, brand)) ?? brand)])];
  f.payments = [...new Set([...f.payments, ...list(query.odeme).map(trLower).filter((p): p is PaymentMethod => p in paymentLabels)])];
  f.symptom = one(query.belirti);
  if (one(query.metin)) f.text = one(query.metin);
  f.openNow = one(query.acik) === '1';
  f.weekend = one(query.haftasonu) === '1';
  f.verifiedOnly = one(query.dogrulanmis) === '1';
  const sort = one(query.siralama);
  f.sort = sort in sortLabels ? sort as SearchSort : 'onerilen';
  return f;
}

/** Live: the same URL keys, folded to what the API takes (one service, one brand, "kart", no open/weekend). */
function liveFromQuery(query: LocationQuery): Filters {
  let f = emptyFilters(coveredName(one(query.il) || 'İstanbul', coverage.value));
  if (one(query.q)) f = readLiveQuery(one(query.q), f, coverage.value);
  if (one(query.il)) f.il = coveredName(one(query.il), coverage.value);
  if (query.ilce !== undefined) f.ilce = one(query.ilce);
  const area = one(query.alan);
  f.area = area === 'cevre' || area === 'konum' ? area : one(query.yakinimda) === '1' ? 'konum' : 'ilce';
  const km = Number(one(query.mesafe));
  f.km = distanceSteps.includes(km) ? km : 50;
  f.services = [...new Set([...list(query.hizmet), ...list(query.kategori), ...f.services])].slice(0, 1);
  f.brands = [...new Set([...list(query.marka).map((brand) => liveBrands.find((b) => sameText(b, brand)) ?? brand), ...f.brands])].slice(0, 1);
  f.payments = list(query.odeme).some((p) => sameText(p, 'kart')) || f.payments.includes('kart') ? ['kart'] : [];
  f.symptom = one(query.belirti);
  if (one(query.metin)) f.text = one(query.metin);
  f.verifiedOnly = one(query.dogrulanmis) === '1';
  const sort = one(query.siralama);
  f.sort = sort in sortLabels ? sort as SearchSort : 'onerilen';
  return f;
}

function toQuery(f: Filters, v: View): Record<string, string> {
  const query: Record<string, string> = {};
  const set = (key: string, value: string | false) => { if (value) query[key] = value; };
  set('q', f.q);
  set('il', f.il);
  set('ilce', f.ilce);
  set('alan', f.area !== 'ilce' && f.area);
  set('mesafe', f.km !== 50 && String(f.km));
  set('hizmet', f.services.join(','));
  set('marka', f.brands.join(','));
  set('odeme', f.payments.join(','));
  set('belirti', f.symptom);
  set('metin', f.text);
  set('acik', f.openNow && '1');
  set('haftasonu', f.weekend && '1');
  set('dogrulanmis', f.verifiedOnly && '1');
  set('siralama', f.sort !== 'onerilen' && f.sort);
  set('gorunum', v === 'harita' && 'harita');
  return query;
}
const key = (query: Record<string, unknown>) => JSON.stringify(Object.entries(query).map(([k, v]) => [k, String(v)]).sort());

const filters = reactive<Filters>(fromQuery(route.query));
const view = ref<View>(one(route.query.gorunum) === 'harita' ? 'harita' : 'liste');

watch([filters, view], () => {
  const next = toQuery(filters, view.value);
  if (key(next) !== key(route.query)) void router.replace({query: next});
}, {deep: true});
watch(() => route.query, (query) => {
  if (key(toQuery(filters, view.value)) === key(query)) return;
  Object.assign(filters, fromQuery(query));
  view.value = one(query.gorunum) === 'harita' ? 'harita' : 'liste';
});

function patch(change: Partial<Filters>) {
  Object.assign(filters, change);
}
function place(il: string, ilce: string) {
  patch({il, ilce, area: ilce && filters.area === 'cevre' ? 'cevre' : filters.area});
}
function submit(text: string) {
  const area = filters.area;
  Object.assign(filters, read(text, filters), {area});
}
function clearFilters() {
  Object.assign(filters, {...emptyFilters(filters.il), ilce: filters.ilce, area: filters.area, km: filters.km, sort: filters.sort});
}

// ---- Results --------------------------------------------------------------------------------------
const sortOptions = computed(() => (Object.keys(sortLabels) as SearchSort[]).map((value) => {
  const off = !demo && value === 'yakin' && filters.area === 'ilce';
  return {value, label: sortLabels[value], disabled: off, hint: off ? 'Çevre ya da konum seç' : undefined};
}));
const demoResults = computed(() => (demo ? sortBusinesses(searchBusinesses.filter((b) => matchesFilters(b, filters)), filters.sort) : []));
const outOfScope = computed(() => (demo ? !cities.some((city) => sameText(city, filters.il)) : !isCovered(filters.il, coverage.value)));
const place2 = computed(() => filters.ilce || filters.il);

// Live: the device point for "Konumumu kullan" (asked once per choice; never stored).
const device = ref<AreaPoint | null>(null);
const locating = ref(false);
function askDevice() {
  if (locating.value) return;
  if (!navigator.geolocation) {
    app.notify('Tarayıcın konum desteklemiyor. İl ya da ilçe seçerek arayabilirsin.');
    patch({area: 'ilce'});
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition((p) => {
    device.value = {latitude: p.coords.latitude, longitude: p.coords.longitude};
    locating.value = false;
  }, () => {
    locating.value = false;
    app.notify('Konum alınamadı. İl ya da ilçe seçerek arayabilirsin.');
    patch({area: 'ilce'});
  }, {timeout: 10000, maximumAge: 60000});
}
useClientEffect(() => [filters.area], () => {
  if (!demo && filters.area === 'konum' && !device.value) askDevice();
});

const live = useLiveSearch(() => {
  if (demo || outOfScope.value || (filters.area === 'konum' && !device.value)) return null;
  const f: Filters = {...filters, services: [...filters.services], brands: [...filters.brands], payments: [...filters.payments]};
  return {filters: f, center: searchCenter(f, device.value, coverage.value)};
});
const liveCards = computed(() => placeOnMap(live.cards.value));
const results = computed(() => (demo ? demoResults.value : liveCards.value));
const liveBusy = computed(() => !demo && (live.loading.value || locating.value || (filters.area === 'konum' && !device.value)));
const noResults = computed(() => (demo ? !results.value.length : live.loaded.value && !live.cards.value.length));
const resultLine = computed(() => (demo ? `${results.value.length} işletme` : resultCount(live.total.value, live.cards.value.length)));
const mapTotal = computed(() => (demo ? results.value.length : live.total.value?.exact ? live.total.value.value : live.cards.value.length));
const liveFilterOptions = {services: liveServices, primaryServices: livePrimaryServices, brands: liveBrands, primaryBrands: livePrimaryBrands};
const districtOptions = computed(() => (demo ? undefined : liveDistricts(filters.il, live.districts.value, coverage.value)));

const counts = computed(() => {
  if (!demo) return null;
  // Facet count: how many results this option alone would give, keeping the other filter groups.
  const tally = (patchFor: (value: string) => Partial<Filters>, values: string[]) =>
    Object.fromEntries(values.map((value) => [value, searchBusinesses.filter((b) => matchesFilters(b, {...filters, ...patchFor(value)})).length]));
  const services = [...new Set(searchBusinesses.flatMap((b) => [...b.services, b.category, ...filters.services]))];
  const brands = [...new Set([...allBrands, ...filters.brands])];
  return {
    services: tally((s) => ({services: [s]}), services),
    brands: tally((b) => ({brands: [b]}), brands),
    payments: tally((p) => ({payments: [p as PaymentMethod]}), ['kart', 'taksit', 'nakit']) as Record<PaymentMethod, number>,
  };
});

const coveredList = computed(() => (demo ? undefined : coverage.value.cities));
const title = computed(() => `${place2.value} · ${filters.services.join(', ') || filters.symptom || filters.text || 'Tüm hizmetler'}`);
const scope = computed(() => {
  if (!demo && filters.area === 'cevre') return `${place2.value} çevresi ${filters.km} km, il sınırı olmadan`;
  if (filters.area === 'konum') return `Konumuna ${filters.km} km, il sınırı olmadan`;
  if (filters.area === 'cevre' && sameText(filters.il, 'İstanbul')) return `${place2.value} çevresi ${filters.km} km, il sınırı olmadan`;
  return filters.ilce && filters.area === 'ilce' ? `Yalnız ${filters.ilce}` : `Tüm ${filters.il}`;
});
const scopeShort = computed(() => (filters.area === 'ilce' || (demo && filters.area === 'cevre' && !sameText(filters.il, 'İstanbul')) ? place2.value : `${filters.km} km çevre`));

// "Anladığımız" chips (strip) and the removable chips of S03.
type Chip = {key: string; label: string};
const facetChips = computed<Chip[]>(() => [
  ...filters.services.map((s) => ({key: `service:${s}`, label: `Hizmet: ${s}`})),
  ...filters.brands.map((b) => ({key: `brand:${b}`, label: `Marka: ${b}`})),
  ...filters.payments.map((p) => ({key: `payment:${p}`, label: `Ödeme: ${paymentLabels[p].chip}`})),
  ...(filters.symptom ? [{key: 'symptom', label: `Belirti: ${filters.symptom}`}] : []),
  ...(filters.text ? [{key: 'text', label: `Arama: ${filters.text}`}] : []),
]);
const stripChips = computed<Chip[]>(() => [...(filters.ilce ? [{key: 'ilce', label: `Konum: ${filters.ilce}`}] : []), ...facetChips.value]);
const emptyChips = computed<Chip[]>(() => [
  ...facetChips.value,
  ...(filters.ilce && filters.area === 'ilce' ? [{key: 'ilce', label: `İlçe: ${filters.ilce}`}] : []),
  ...(demo && filters.openNow ? [{key: 'openNow', label: 'Şu an açık'}] : []),
  ...(demo && filters.weekend ? [{key: 'weekend', label: 'Hafta sonu açık'}] : []),
  ...(filters.verifiedOnly ? [{key: 'verifiedOnly', label: 'Sadece doğrulanmış'}] : []),
]);
function removeChip(chipKey: string) {
  const [kind, value = ''] = chipKey.split(/:(.*)/s);
  if (kind === 'service') filters.services = filters.services.filter((s) => s !== value);
  else if (kind === 'brand') filters.brands = filters.brands.filter((b) => b !== value);
  else if (kind === 'payment') filters.payments = filters.payments.filter((p) => p !== value);
  else if (kind === 'symptom') filters.symptom = '';
  else if (kind === 'text') filters.text = '';
  else if (kind === 'ilce') filters.ilce = '';
  else if (kind === 'openNow' || kind === 'weekend' || kind === 'verifiedOnly') filters[kind] = false;
}

// ---- Paging, compare, saved -----------------------------------------------------------------------
const pageSize = 4;
const showAll = ref(false);
watch(() => key(toQuery(filters, 'liste')), () => { showAll.value = false; });
// Demo pages the mock list locally; live shows every loaded card and asks for the next page with the cursor.
const visible = computed(() => (!demo || showAll.value ? results.value : results.value.slice(0, pageSize)));
const remaining = computed(() => results.value.length - visible.value.length);
// Accusative suffix after a numeral: 4’ü, 6’sı, 10’u, 40’ı.
function ofCount(n: number) {
  const ones = ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
  const tens = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
  const suffix = n % 10 ? ones[n % 10] : n % 100 ? tens[(n % 100) / 10] : 'ü';
  return `${n}’${suffix}`;
}

const compareNotice = ref('');
const cardKeys = reactive<Record<string, number>>({});
function onCompare(id: string, on: boolean) {
  compareNotice.value = '';
  if (on && !compare.has(id) && compare.ids.value.length >= compare.max) {
    compareNotice.value = `En fazla ${compare.max} işletme karşılaştırabilirsin. Önce birini çıkar.`;
    cardKeys[id] = (cardKeys[id] ?? 0) + 1; // re-render so the checkbox shows the real (unticked) state
    return;
  }
  compare.toggle(id, on);
}
const compareItems = computed(() => (demo
  ? compare.ids.value.map((id) => searchBusiness(id)).filter((b): b is SearchBusiness => !!b)
  : compare.ids.value.map((id) => searchCards.cards.value[id] ?? {id, name: 'Seçili işletme'})));

// ---- Mobile filter drawer and "Yanlış anladıysak düzelt" -------------------------------------------
const filtersOpen = ref(false);
async function openFilters() {
  if (view.value === 'harita') view.value = 'liste';
  filtersOpen.value = true;
  await nextTick();
  const heading = document.getElementById('filtreler');
  heading?.scrollIntoView({behavior: 'smooth', block: 'start'});
  heading?.focus({preventScroll: true});
}
function showResults() {
  filtersOpen.value = false;
  document.getElementById('sonuclar')?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

// ---- S02 / S03 actions --------------------------------------------------------------------------------
const notified = ref(false);
watch(() => filters.il, () => { notified.value = false; waitMessage.value = null; });
const nearby = computed(() => (demo ? nearbyProvince[trLower(filters.il)] ?? 'İstanbul' : nearbyCovered(filters.il, coverage.value)));
function widen() {
  if (filters.ilce) patch({ilce: '', area: 'ilce'});
  else patch({area: demo ? (sameText(filters.il, 'İstanbul') ? 'cevre' : 'ilce') : 'cevre', km: 200});
}

// Live S02 "Haber ver" (web-12): verified members join the coverage waitlist; a guest is sent to sign in.
// Nothing is delivered yet (the API has no sending job), so the screen does not promise a notification.
const waitlisted = ref<string[]>([]);
const waitBusy = ref(false);
const waitMessage = ref<{tone: 'ok' | 'err'; text: string} | null>(null);
const joined = computed(() => waitlisted.value.some((city) => sameText(city, filters.il)));
useClientEffect(() => [demo ? null : app.user, outOfScope.value], () => {
  const user = app.user;
  if (demo || !user || !user.emailVerified || !outOfScope.value) return;
  let cancelled = false;
  waitlistApi.read(() => user.getIdToken()).then((items) => {
    if (!cancelled) waitlisted.value = items.map((i) => i.city);
  }).catch(() => { /* the button still works; the joined state is shown after a join */ });
  return () => { cancelled = true; };
});
async function notifyMe() {
  if (demo) {
    notified.value = true;
    return;
  }
  const user = app.user;
  if (!app.member || !user) {
    await navigateTo({path: '/giris', query: {donus: route.fullPath}});
    return;
  }
  if (!user.emailVerified) {
    waitMessage.value = {tone: 'err', text: 'Haber almak için önce e-posta adresini doğrula (Hesabım → Güvenlik).'};
    return;
  }
  if (waitBusy.value) return;
  waitBusy.value = true;
  waitMessage.value = null;
  try {
    const item = await waitlistApi.join(() => user.getIdToken(), coveredName(filters.il));
    waitlisted.value = [...new Set([...waitlisted.value, item.city])];
    waitMessage.value = {tone: 'ok', text: `${item.city} bekleme listesine eklendin. Bildirim gönderimi henüz etkin değil; il açıldığında hesabında duyurulacak.`};
  } catch (e) {
    const status = errorStatus(e);
    waitMessage.value = {tone: 'err', text: status === 409 ? 'En fazla 5 il için bekleme listesine katılabilirsin.'
      : status === 403 ? 'Haber almak için önce e-posta adresini doğrula.'
        : status === 401 ? 'Oturumun kapanmış. Tekrar giriş yap.'
          : e instanceof Error && e.message ? e.message : 'İşlem tamamlanamadı. Tekrar dene.'};
  } finally {
    waitBusy.value = false;
  }
}
async function leaveWaitlist() {
  const user = app.user;
  if (demo || !user || waitBusy.value) return;
  waitBusy.value = true;
  waitMessage.value = null;
  try {
    const city = waitlisted.value.find((c) => sameText(c, filters.il)) ?? coveredName(filters.il);
    await waitlistApi.leave(() => user.getIdToken(), city);
    waitlisted.value = waitlisted.value.filter((c) => !sameText(c, city));
    waitMessage.value = {tone: 'ok', text: 'Bekleme listesinden çıktın.'};
  } catch (e) {
    waitMessage.value = {tone: 'err', text: e instanceof Error && e.message ? e.message : 'İşlem tamamlanamadı. Tekrar dene.'};
  } finally {
    waitBusy.value = false;
  }
}
</script>

<template>
  <div class="search-page">
    <SearchState v-if="outOfScope" :icon="MapPin" eyebrow="Kapsam dışı" title="Bu ilde henüz yokuz."
                 :text="`Şimdilik ${coverage.cityCount} ilde hizmet veriyoruz. Seçtiğin il kapsama girdiğinde sana haber verebiliriz.`">
      <V2Button size="lg" arrow @click="patch({il: nearby, ilce: '', area: 'ilce'})">Yakındaki ili gör</V2Button>
      <V2Button v-if="demo" variant="outline" :disabled="notified" @click="notifyMe">{{ notified ? 'Haber vereceğiz' : 'Haber ver' }}</V2Button>
      <template v-else-if="joined">
        <V2Button variant="outline" disabled>Bekleme listesindesin</V2Button>
        <V2Button variant="ghost" :disabled="waitBusy" @click="leaveWaitlist">Listeden çık</V2Button>
      </template>
      <V2Button v-else variant="outline" :disabled="waitBusy" @click="notifyMe">{{ waitBusy ? 'Kaydediliyor…' : app.member ? 'Haber ver' : 'Giriş yap, haber ver' }}</V2Button>
      <template #after>
        <p v-if="demo && notified" class="t-body-sm done">{{ filters.il }} kapsama girdiğinde bildirim alacaksın.</p>
        <p v-if="waitMessage" class="t-body-sm" :class="waitMessage.tone === 'ok' ? 'done' : 'fail'" :role="waitMessage.tone === 'err' ? 'alert' : 'status'">{{ waitMessage.text }}</p>
        <p class="t-body-sm t-muted foot"><Info :size="16" aria-hidden="true"/>Yakındaki il sonuçları ancak sen seçersen açılır.</p>
      </template>
    </SearchState>

    <SearchState v-else-if="noResults" :icon="Search" eyebrow="Sonuç yok" title="Bu filtrelerle sonuç çıkmadı."
                 text="Filtreleri gevşetmeyi ya da aramayı genişletmeyi dene.">
      <template #chips>
        <ul v-if="emptyChips.length" class="empty-chips">
          <li v-for="chip in emptyChips" :key="chip.key">
            <button type="button" class="read-chip t-label-sm" :aria-label="`Kaldır: ${chip.label}`" @click="removeChip(chip.key)">{{ chip.label }}<X :size="13" aria-hidden="true"/></button>
          </li>
        </ul>
      </template>
      <V2Button size="lg" arrow @click="widen">{{ filters.ilce ? `Tüm ${locative(filters.il)} ara` : 'Aramayı genişlet' }}</V2Button>
      <V2Button variant="outline" @click="clearFilters">Filtreleri temizle</V2Button>
    </SearchState>

    <template v-else>
      <SearchStrip :filters="filters" :chips="stripChips" :districts="districtOptions" :covered="coveredList" @submit="submit" @place="place" @remove="removeChip" @fix="openFilters"/>

      <SearchMap v-if="view === 'harita' && !liveBusy && !live.error.value" :results="results" :total="mapTotal" :scope="scopeShort" :live="!demo" @view="view = $event"/>

      <div v-else class="content v2-wrap">
        <aside class="filters" :class="{open: filtersOpen}" aria-label="Filtreler">
          <SearchFilters :filters="filters" :counts="counts" :total="demo ? results.length : live.total.value?.exact ? live.total.value.value : null"
                         :live="demo ? undefined : liveFilterOptions" @patch="patch" @clear="clearFilters" @show="showResults"/>
        </aside>

        <section id="sonuclar" class="results" aria-labelledby="sonuc-baslik">
          <div class="results-head">
            <div class="heading">
              <h1 id="sonuc-baslik" class="t-h3">{{ title }}</h1>
              <p class="t-body-sm t-muted">{{ liveBusy ? 'Aranıyor…' : resultLine }} · {{ scope }}</p>
            </div>
            <div class="tools">
              <button type="button" class="filter-toggle t-label-sm" :aria-expanded="filtersOpen" @click="filtersOpen ? (filtersOpen = false) : openFilters()">
                <ListFilter :size="16" aria-hidden="true"/>Filtreler
              </button>
              <span class="sort">
                <SlidersHorizontal :size="16" aria-hidden="true"/>
                <V2Select :model-value="filters.sort" :options="sortOptions" variant="bare" anchor=".sort" stretch :match-width="false" class="t-label-sm" aria-label="Sıralama" @change="patch({sort: $event})"/>
              </span>
              <SearchViewToggle :view="view" @change="view = $event"/>
            </div>
          </div>

          <p v-if="compareNotice" class="notice t-body-sm" role="status">{{ compareNotice }}</p>
          <p v-if="!demo && liveBusy" class="t-body-md t-muted" role="status">{{ locating ? 'Konumun alınıyor…' : 'Sonuçlar yükleniyor…' }}</p>
          <div v-else-if="!demo && live.error.value" class="notice error t-body-sm" role="alert">
            <span>{{ live.error.value }}</span>
            <V2Button variant="outline" size="sm" @click="live.retry()">Tekrar dene</V2Button>
          </div>

          <ul class="cards">
            <li v-for="b in visible" :key="`${b.id}-${cardKeys[b.id] ?? 0}`">
              <V2ServiceCard :business="b" :compared="compare.has(b.id)" :saved="saved.has(b.id)"
                             @update:compared="onCompare(b.id, $event)" @update:saved="saved.toggle(b.id, $event)"/>
            </li>
          </ul>

          <div v-if="demo" class="more">
            <V2Button v-if="remaining > 0" variant="outline" @click="showAll = true">{{ remaining }} işletme daha göster</V2Button>
            <p class="t-body-sm t-muted">{{ remaining > 0 ? `${results.length} sonuçtan ${ofCount(visible.length)} gösteriliyor` : `${results.length} sonucun tamamı gösteriliyor` }}</p>
          </div>
          <div v-else-if="live.loaded.value && results.length" class="more">
            <V2Button v-if="live.nextCursor.value" variant="outline" :disabled="live.loadingMore.value" @click="live.more()">{{ live.loadingMore.value ? 'Yükleniyor…' : 'Daha fazla göster' }}</V2Button>
            <p class="t-body-sm t-muted">{{ live.nextCursor.value
              ? (live.total.value?.exact ? `${live.total.value.value} sonuçtan ${ofCount(results.length)} gösteriliyor` : `${results.length} sonuç gösteriliyor, devamı var`)
              : `${results.length} sonucun tamamı gösteriliyor` }}</p>
            <p v-if="live.moreError.value" class="fail t-body-sm" role="alert">{{ live.moreError.value }}</p>
          </div>
        </section>
      </div>
    </template>

    <SearchCompareBar v-if="compareItems.length >= 2 && !outOfScope" :items="compareItems" :href="compare.href.value" :max="compare.max"
                      @remove="compare.toggle($event, false)" @clear="compare.clear()"/>
  </div>
</template>

<style scoped>
.search-page{padding-bottom:0}
.content{display:grid;grid-template-columns:300px minmax(0,1fr);gap:32px;align-items:start;padding-top:36px;padding-bottom:96px}
.results{display:flex;flex-direction:column;gap:20px;scroll-margin-top:110px}
.results-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap}
.heading{display:flex;flex-direction:column;gap:6px;min-width:0}
.tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sort,.filter-toggle{position:relative;display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:var(--white);border:1px solid var(--cream-200);border-radius:999px;color:var(--ink-800)}
.sort:focus-within{border-color:var(--ink-900)}
.filter-toggle{display:none}
.filters{scroll-margin-top:110px}
.cards{display:flex;flex-direction:column;gap:20px}
.more{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:16px;padding-top:8px}
.notice{padding:12px 16px;border-radius:16px;background:var(--orange-100);color:var(--ink-800)}
.empty-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.read-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 10px 7px 12px;border-radius:999px;background:var(--lime-100);color:var(--ink-800)}
.read-chip:hover{background:var(--lime-400)}
.foot{display:inline-flex;align-items:center;gap:8px}
.done{color:var(--green-500);font-weight:600}
.fail{color:var(--red-500);font-weight:600}
.notice.error{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--cream-100)}
@media (max-width:1080px){
  .content{grid-template-columns:minmax(0,1fr);gap:20px;padding-top:24px;padding-bottom:120px}
  .filters{display:none;order:0}
  .filters.open{display:block}
  .filter-toggle{display:inline-flex}
}
</style>
