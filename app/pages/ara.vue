<script setup lang="ts">
import {computed, nextTick, reactive, ref, watch} from 'vue';
import type {LocationQuery} from 'vue-router';
import {ChevronDown, Info, ListFilter, MapPin, Search, SlidersHorizontal, X} from '@lucide/vue';
import {cities} from '@otosanayide/core';
import V2Button from '~/components/v2/V2Button.vue';
import V2ServiceCard from '~/components/v2/V2ServiceCard.vue';
import SearchCompareBar from '~/components/v2/search/SearchCompareBar.vue';
import SearchFilters from '~/components/v2/search/SearchFilters.vue';
import SearchMap from '~/components/v2/search/SearchMap.vue';
import SearchState from '~/components/v2/search/SearchState.vue';
import SearchStrip from '~/components/v2/search/SearchStrip.vue';
import SearchViewToggle from '~/components/v2/search/SearchViewToggle.vue';
import {useMockCompare} from '~/composables/useMockCompare';
import {useMockSaved} from '~/composables/useMockSaved';
import {
  allBrands, demoFilters, distanceSteps, emptyFilters, locative, matchesFilters, nearbyProvince, paymentLabels, readQuery, sameText,
  searchBusiness, searchBusinesses, sortBusinesses, sortLabels, trLower,
  type PaymentMethod, type SearchBusiness, type SearchFilters as Filters, type SearchSort,
} from '~/data/mock/search';

// W02 Arama sonuçları · Liste (Figma 119:5), W03 · Harita (119:552), S03 Sonuç bulunamadı (128:261) and
// S02 Kapsam dışı il (128:138). Mock data only: the filter state lives in the URL and filters `searchBusinesses`.
useSeoMeta({title: 'Arama sonuçları'});

type View = 'liste' | 'harita';
const route = useRoute();
const router = useRouter();
const compare = useMockCompare();
const saved = useMockSaved();

// ---- URL <-> filter state -------------------------------------------------------------------------
const one = (value: LocationQuery[string]) => (Array.isArray(value) ? value[0] ?? '' : value ?? '').trim();
const list = (value: LocationQuery[string]) => one(value).split(',').map((item) => item.trim()).filter(Boolean);
const filterKeys = ['q', 'kategori', 'belirti', 'il', 'ilce', 'marka', 'hizmet', 'odeme', 'mesafe', 'alan', 'acik', 'haftasonu', 'dogrulanmis', 'siralama', 'metin'];

function fromQuery(query: LocationQuery): Filters {
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
  Object.assign(filters, readQuery(text, filters), {area});
}
function clearFilters() {
  Object.assign(filters, {...emptyFilters(filters.il), ilce: filters.ilce, area: filters.area, km: filters.km, sort: filters.sort});
}

// ---- Results --------------------------------------------------------------------------------------
const results = computed(() => sortBusinesses(searchBusinesses.filter((b) => matchesFilters(b, filters)), filters.sort));
const outOfScope = computed(() => !cities.some((city) => sameText(city, filters.il)));
const place2 = computed(() => filters.ilce || filters.il);

const counts = computed(() => {
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

const title = computed(() => `${place2.value} · ${filters.services.join(', ') || filters.symptom || filters.text || 'Tüm hizmetler'}`);
const scope = computed(() => {
  if (filters.area === 'konum') return `Konumuna ${filters.km} km, il sınırı olmadan`;
  if (filters.area === 'cevre' && sameText(filters.il, 'İstanbul')) return `${place2.value} çevresi ${filters.km} km, il sınırı olmadan`;
  return filters.ilce && filters.area === 'ilce' ? `Yalnız ${filters.ilce}` : `Tüm ${filters.il}`;
});
const scopeShort = computed(() => (filters.area === 'ilce' || (filters.area === 'cevre' && !sameText(filters.il, 'İstanbul')) ? place2.value : `${filters.km} km çevre`));

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
  ...(filters.openNow ? [{key: 'openNow', label: 'Şu an açık'}] : []),
  ...(filters.weekend ? [{key: 'weekend', label: 'Hafta sonu açık'}] : []),
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
const visible = computed(() => (showAll.value ? results.value : results.value.slice(0, pageSize)));
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
const compareItems = computed(() => compare.ids.value.map((id) => searchBusiness(id)).filter((b): b is SearchBusiness => !!b));

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
watch(() => filters.il, () => { notified.value = false; });
const nearby = computed(() => nearbyProvince[trLower(filters.il)] ?? 'İstanbul');
function widen() {
  if (filters.ilce) patch({ilce: '', area: 'ilce'});
  else patch({area: sameText(filters.il, 'İstanbul') ? 'cevre' : 'ilce', km: 200});
}
</script>

<template>
  <div class="search-page">
    <SearchState v-if="outOfScope" :icon="MapPin" eyebrow="Kapsam dışı" title="Bu ilde henüz yokuz."
                 text="Şimdilik 41 ilde hizmet veriyoruz. Seçtiğin il kapsama girdiğinde sana haber verebiliriz.">
      <V2Button size="lg" arrow @click="patch({il: nearby, ilce: '', area: 'ilce'})">Yakındaki ili gör</V2Button>
      <V2Button variant="outline" :disabled="notified" @click="notified = true">{{ notified ? 'Haber vereceğiz' : 'Haber ver' }}</V2Button>
      <template #after>
        <p v-if="notified" class="t-body-sm done">{{ filters.il }} kapsama girdiğinde bildirim alacaksın.</p>
        <p class="t-body-sm t-muted foot"><Info :size="16" aria-hidden="true"/>Yakındaki il sonuçları ancak sen seçersen açılır.</p>
      </template>
    </SearchState>

    <SearchState v-else-if="!results.length" :icon="Search" eyebrow="Sonuç yok" title="Bu filtrelerle sonuç çıkmadı."
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
      <SearchStrip :filters="filters" :chips="stripChips" @submit="submit" @place="place" @remove="removeChip" @fix="openFilters"/>

      <SearchMap v-if="view === 'harita'" :results="results" :total="results.length" :scope="scopeShort" @view="view = $event"/>

      <div v-else class="content v2-wrap">
        <aside class="filters" :class="{open: filtersOpen}" aria-label="Filtreler">
          <SearchFilters :filters="filters" :counts="counts" :total="results.length" @patch="patch" @clear="clearFilters" @show="showResults"/>
        </aside>

        <section id="sonuclar" class="results" aria-labelledby="sonuc-baslik">
          <div class="results-head">
            <div class="heading">
              <h1 id="sonuc-baslik" class="t-h3">{{ title }}</h1>
              <p class="t-body-sm t-muted">{{ results.length }} işletme · {{ scope }}</p>
            </div>
            <div class="tools">
              <button type="button" class="filter-toggle t-label-sm" :aria-expanded="filtersOpen" @click="filtersOpen ? (filtersOpen = false) : openFilters()">
                <ListFilter :size="16" aria-hidden="true"/>Filtreler
              </button>
              <span class="sort">
                <SlidersHorizontal :size="16" aria-hidden="true"/>
                <span class="t-label-sm">{{ sortLabels[filters.sort] }}</span>
                <ChevronDown :size="16" aria-hidden="true"/>
                <select :value="filters.sort" aria-label="Sıralama" @change="patch({sort: ($event.target as HTMLSelectElement).value as SearchSort})">
                  <option v-for="(label, value) in sortLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </span>
              <SearchViewToggle :view="view" @change="view = $event"/>
            </div>
          </div>

          <p v-if="compareNotice" class="notice t-body-sm" role="status">{{ compareNotice }}</p>

          <ul class="cards">
            <li v-for="b in visible" :key="`${b.id}-${cardKeys[b.id] ?? 0}`">
              <V2ServiceCard :business="b" :compared="compare.has(b.id)" :saved="saved.has(b.id)"
                             @update:compared="onCompare(b.id, $event)" @update:saved="saved.toggle(b.id, $event)"/>
            </li>
          </ul>

          <div class="more">
            <V2Button v-if="remaining > 0" variant="outline" @click="showAll = true">{{ remaining }} işletme daha göster</V2Button>
            <p class="t-body-sm t-muted">{{ remaining > 0 ? `${results.length} sonuçtan ${ofCount(visible.length)} gösteriliyor` : `${results.length} sonucun tamamı gösteriliyor` }}</p>
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
.sort select{position:absolute;inset:0;width:100%;opacity:0;cursor:pointer;font-size:16px}
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
@media (max-width:1080px){
  .content{grid-template-columns:minmax(0,1fr);gap:20px;padding-top:24px;padding-bottom:120px}
  .filters{display:none;order:0}
  .filters.open{display:block}
  .filter-toggle{display:inline-flex}
}
</style>
