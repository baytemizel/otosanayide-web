<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue';
import {ChevronDown, Columns2, List, Map as MapIcon, SlidersVertical} from '@lucide/vue';
import V2ServiceCard from '~/components/v2/V2ServiceCard.vue';
import HomeCompareBar from '~/components/v2/home/HomeCompareBar.vue';
import HomeMockMap from '~/components/v2/home/HomeMockMap.vue';
import HomeSectionHead from '~/components/v2/home/HomeSectionHead.vue';
import {useMockCompare} from '~/composables/useMockCompare';
import {useMockSaved} from '~/composables/useMockSaved';
import {useLiveSearch} from '~/composables/v2/useSearch';
import {mockBusinesses, type MockBusiness} from '~/data/mock/businesses';
import {emptyFilters, type SearchSort} from '~/data/mock/search';
import {demoMode} from '~/lib/env';
import {placeOnMap, type CardBusiness} from '~/lib/v2/business-card';
import {homeLiveCity, resultCount} from '~/lib/v2/search';
import {
  homeBookable, homeDiscoveryArea, homeDiscoveryFilters, homeDiscoveryOrder, homeDiscoverySorts, homeListPhotos,
  type HomeDiscoveryFilter, type HomeDiscoverySort,
} from '~/data/mock/home';

// Figma 111:104 "Keşif · liste + harita". Hovering a card highlights its pin, clicking a pin brings its card
// forward, ticking services shows the floating compare bar (111:372).
// Live: the first page of GET /api/search?v=2 for a default city (homeLiveCity). Only "Doğrulanmış" is a
// search filter; the others are not in the API and stay passive. "En yakın" needs a point, so it is off.
const demo = demoMode();
const compare = useMockCompare();
const saved = useMockSaved();

type View = 'split' | 'list' | 'map';
const views: {id: View; label: string; icon: unknown}[] = [
  {id: 'split', label: 'Liste + Harita', icon: Columns2},
  {id: 'list', label: 'Liste', icon: List},
  {id: 'map', label: 'Harita', icon: MapIcon},
];
const view = ref<View>('split');
const filters = ref<HomeDiscoveryFilter[]>(demo ? ['open'] : []);
const sort = ref<HomeDiscoverySort>('recommended');
const selectedId = ref<string | null>(demo ? 'ornek-teknik-garaj' : null);
const liveFilters: HomeDiscoveryFilter[] = ['verified'];
const filterOff = (id: HomeDiscoveryFilter) => !demo && !liveFilters.includes(id);
const sortOff = (id: HomeDiscoverySort) => !demo && id === 'distance';
const liveSort: Record<HomeDiscoverySort, SearchSort> = {recommended: 'onerilen', distance: 'yakin', rating: 'puan'};
const live = useLiveSearch(() => (demo ? null : {
  filters: {...emptyFilters(homeLiveCity), verifiedOnly: filters.value.includes('verified'), sort: liveSort[sort.value]},
  center: null,
}));
const liveCards = computed(() => placeOnMap(live.cards.value));
watch(liveCards, (list) => {
  if (!list.some((b) => b.id === selectedId.value)) selectedId.value = list.find((b) => b.coords)?.id ?? list[0]?.id ?? null;
});
const searchHref = `/ara?il=${encodeURIComponent(homeLiveCity)}`;
const hoverId = ref<string | null>(null);
const listEl = ref<HTMLElement | null>(null);
const cardKey = ref(0);

const checks: Record<HomeDiscoveryFilter, (b: MockBusiness) => boolean> = {
  open: (b) => b.open,
  verified: (b) => b.verified,
  rating: (b) => b.rating >= 4.5,
  booking: (b) => homeBookable.includes(b.id),
  photo: (b) => b.photo !== null,
};
function toggleFilter(id: HomeDiscoveryFilter) {
  if (filterOff(id)) return;
  filters.value = filters.value.includes(id) ? filters.value.filter((f) => f !== id) : [...filters.value, id];
}

const results = computed<(MockBusiness & Pick<CardBusiness, 'hoursKnown' | 'coords' | 'source' | 'extras'>)[]>(() => {
  if (!demo) return liveCards.value;
  const list = mockBusinesses.filter((b) => filters.value.every((f) => checks[f](b)));
  const rank = (b: MockBusiness) => homeDiscoveryOrder.indexOf(b.id);
  if (sort.value === 'distance') return list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  if (sort.value === 'rating') return list.sort((a, b) => b.rating - a.rating);
  return list.sort((a, b) => rank(a) - rank(b));
});
// Side-by-side with the map the list shows three cards; a clicked pin outside them moves its card to the front.
const listed = computed(() => {
  if (view.value === 'list') return results.value;
  const top = results.value.slice(0, 3);
  const picked = results.value.find((b) => b.id === selectedId.value);
  if (picked && !top.includes(picked)) return [picked, ...top.slice(0, 2)];
  return top;
});
const withPhoto = <T extends MockBusiness>(b: T) => (demo ? {...b, photo: homeListPhotos[b.id] ?? b.photo} : b);
const countText = computed(() => (demo ? `${results.value.length} sonuç` : live.loading.value ? 'Yükleniyor…' : live.error.value ? '' : resultCount(live.total.value, results.value.length)));

async function selectPin(id: string) {
  selectedId.value = id;
  await nextTick();
  listEl.value?.querySelector<HTMLElement>(`[data-id="${id}"]`)?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
}
function setCompared(id: string, on: boolean) {
  compare.toggle(id, on);
  // The shared composable refuses a fourth service; re-render so the checkbox reflects that.
  if (on && !compare.has(id)) cardKey.value++;
}
</script>

<template>
  <section class="home-discovery v2-wrap" aria-labelledby="home-discovery-title">
    <HomeSectionHead :eyebrow="demo ? 'YAKININDA' : 'KEŞFET'" :title="demo ? `${homeDiscoveryArea} çevresindeki servisler` : `${homeLiveCity} servisleri`" heading-id="home-discovery-title">
      <div class="views" role="group" aria-label="Görünüm">
        <button
          v-for="v in views" :key="v.id" type="button" class="view t-label-sm" :class="{on: view === v.id}"
          :aria-pressed="view === v.id" @click="view = v.id">
          <component :is="v.icon" :size="16" aria-hidden="true"/>{{ v.label }}
        </button>
      </div>
    </HomeSectionHead>

    <div class="filters">
      <ul class="chips" aria-label="Filtreler">
        <li v-for="f in homeDiscoveryFilters" :key="f.id">
          <button type="button" class="chip" :class="[filters.includes(f.id) ? 'chip-active' : 'chip-default', {off: filterOff(f.id)}]" :aria-pressed="filters.includes(f.id)"
                  :disabled="filterOff(f.id)" :title="filterOff(f.id) ? 'Bu filtre henüz aramada yok' : undefined" @click="toggleFilter(f.id)">{{ f.label }}</button>
        </li>
      </ul>
      <p class="count t-body-sm t-muted" aria-live="polite">{{ countText }}</p>
      <label class="sort t-label-sm">
        <SlidersVertical :size="16" aria-hidden="true"/>
        <select v-model="sort" aria-label="Sıralama">
          <option v-for="s in homeDiscoverySorts" :key="s.id" :value="s.id" :disabled="sortOff(s.id)">{{ s.label }}{{ sortOff(s.id) ? ' (konum gerekir)' : '' }}</option>
        </select>
        <ChevronDown :size="16" aria-hidden="true"/>
      </label>
    </div>

    <div class="body" :class="`view-${view}`">
      <div v-if="view !== 'map'" ref="listEl" class="list">
        <div v-for="b in listed" :key="`${b.id}-${cardKey}`" :data-id="b.id" class="card-slot">
          <V2ServiceCard
            :business="withPhoto(b)" :compared="compare.has(b.id)" :saved="saved.has(b.id)" :highlighted="b.id === selectedId"
            @update:compared="setCompared(b.id, $event)" @update:saved="saved.toggle(b.id, $event)" @hover="hoverId = $event"/>
        </div>
        <p v-if="!demo && live.loading.value" class="empty t-body-md t-muted" role="status">Servisler yükleniyor…</p>
        <div v-else-if="!demo && live.error.value" class="empty error t-body-md" role="alert">
          <span>{{ live.error.value }}</span>
          <button type="button" class="btn btn-outline" @click="live.retry()">Tekrar dene</button>
        </div>
        <p v-else-if="!listed.length" class="empty t-body-md t-muted">Bu filtrelerle sonuç yok. Bir filtreyi kaldırmayı dene.</p>
        <NuxtLink v-if="!demo && listed.length" :to="searchHref" class="all t-label-sm">Tüm sonuçları aramada aç</NuxtLink>
      </div>
      <div v-if="view !== 'list'" class="map">
        <HomeMockMap :businesses="results" :selected-id="selectedId" :hover-id="hoverId" :photos="demo ? homeListPhotos : undefined" :live="!demo" :search-href="searchHref" @select="selectPin"/>
      </div>
    </div>

    <div class="compare-slot">
      <HomeCompareBar :photos="demo ? homeListPhotos : undefined"/>
    </div>
  </section>
</template>

<style scoped>
.home-discovery{display:flex;flex-direction:column;gap:32px;padding-top:104px;padding-bottom:104px}
.views{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--cream-100)}
.view{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;color:var(--ink-700);white-space:nowrap}
.view:hover{color:var(--ink-900)}
.view.on{background:var(--ink-900);color:var(--white)}
.view.on :deep(svg){color:var(--lime-400)}
.filters{display:flex;align-items:center;gap:10px}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin-right:auto}
.chips .chip-default:hover{border-color:var(--ink-300)}
.count{white-space:nowrap}
.sort{position:relative;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;background:var(--white);border:1px solid var(--cream-200);color:var(--ink-800);cursor:pointer}
.sort select{appearance:none;border:0;background:transparent;padding:0;font:inherit;color:inherit;cursor:pointer}
.sort select:focus{outline:none}
.sort:focus-within{border-color:var(--ink-900)}

.body{display:flex;gap:20px;align-items:flex-start}
.list{display:flex;flex-direction:column;gap:16px}
.view-split .list{flex:0 0 620px;min-width:0}
.view-split .map{flex:1;min-width:0}
.card-slot{scroll-margin:120px 0}
.view-list{display:block}
.view-list .list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
.view-map .map{flex:1}
.view-map .map :deep(.home-map){aspect-ratio:auto;height:706px}
.empty{padding:40px 0}
.empty.error{display:flex;align-items:center;gap:16px;flex-wrap:wrap;color:var(--ink-800)}
.chip.off{opacity:.5;cursor:not-allowed}
.all{align-self:flex-start;color:var(--orange-600)}
.all:hover{text-decoration:underline}

.compare-slot{position:sticky;bottom:24px;display:flex;justify-content:center;z-index:20;min-height:64px}

@media (max-width:1180px){
  .view-split .list{flex:1 1 0}
}
@media (max-width:1100px){
  .filters{flex-wrap:wrap}
  .body{flex-direction:column;align-items:stretch}
  .view-split .list{flex:none}
  .view-list .list{grid-template-columns:1fr}
}
@media (max-width:760px){
  .home-discovery{padding-top:72px;padding-bottom:72px}
  .views{max-width:100%;overflow-x:auto}
  .view-map .map :deep(.home-map){height:520px}
}
</style>
