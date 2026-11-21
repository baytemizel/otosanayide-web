<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue';
import {ArrowRight, LocateFixed, MapPin, Minus, Navigation, Phone, Plus, Search, Star} from '@lucide/vue';
import SearchViewToggle from '~/components/v2/search/SearchViewToggle.vue';
import {useLocale} from '~/composables/useLocale';
import {formatKm, formatRating, type MockBusiness} from '~/data/mock/businesses';
import type {CardBusiness} from '~/lib/v2/business-card';
import {openLabel} from '~/lib/v2/search';

// "Harita · tam genişlik" (Figma 119:653). Mock map: the Figma map art as a picture, pins placed from
// `business.map` (percent of the box), a floating result panel and a pin pop-up card. No map SDK.
// Live (`live`): `map` comes from real coordinates (placeOnMap); a result without a verified pin is
// listed in the panel but not drawn. There is no "you are here" point and no bbox search (web-05).
type MapBusiness = MockBusiness & Pick<CardBusiness, 'hoursKnown' | 'coords' | 'source' | 'extras'>;
const props = defineProps<{results: MapBusiness[]; total: number; scope: string; live?: boolean}>();
const emit = defineEmits<{view: [view: 'liste' | 'harita']}>();
const {t, localeTag} = useLocale();
const km = (value: number | null) => formatKm(value, localeTag.value);
const rating = (value: number) => formatRating(value, localeTag.value);

const selectedId = ref<string | null>(props.results[0]?.id ?? null);
const hoveredId = ref<string | null>(null);
const zoom = ref(1);
const status = ref('');
const rows = ref<Record<string, HTMLElement | null>>({});

watch(() => props.results, (list) => {
  if (!list.some((b) => b.id === selectedId.value)) selectedId.value = list[0]?.id ?? null;
});

const selected = computed(() => props.results.find((b) => b.id === selectedId.value) ?? null);

// Pins are squeezed into the area right of the floating panel, then zoomed around the box centre.
function point(map: {x: number; y: number}) {
  const x = 34 + map.x * 0.64;
  return {x: 50 + (x - 50) * zoom.value, y: 50 + (map.y - 50) * zoom.value};
}
const drawn = computed(() => (props.live ? props.results.filter((b) => b.coords) : props.results));
const unpinned = computed(() => props.results.length - drawn.value.length);
const pins = computed(() => drawn.value.map((business) => ({business, ...point(business.map)})).filter((pin) => pin.x > -2 && pin.x < 102 && pin.y > -2 && pin.y < 102));
const me = computed(() => point({x: (63.3 - 34) / 0.64, y: 79.9}));
const popup = computed(() => {
  if (!selected.value || (props.live && !selected.value.coords)) return null;
  const at = point(selected.value.map);
  return {x: Math.min(Math.max(at.x, 14), 86), y: at.y, below: at.y < 52};
});

const meta = (b: MapBusiness) => [km(b.distanceKm), openLabel(b, t).text, props.live && !b.coords ? t('Haritada yok') : ''].filter(Boolean).join(' · ');
const selectedOpen = computed(() => (selected.value ? openLabel(selected.value, t) : null));
const tel = (b: MapBusiness) => `tel:${b.phone.replace(/\s/g, '')}`;

async function choose(id: string) {
  selectedId.value = id;
  await nextTick();
  // Bring the row forward inside the panel's own scroll box (not the page).
  const row = rows.value[id];
  const box = row?.parentElement;
  if (!row || !box) return;
  if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop;
  else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight;
}
function setZoom(delta: number) {
  zoom.value = Math.min(2.5, Math.max(1, zoom.value + delta));
}
function locate() {
  zoom.value = 1;
  status.value = t('Harita konumuna göre ortalandı.');
}
function searchHere() {
  status.value = t('Bu alanda {count} işletme gösteriliyor.', {count: props.total});
}
</script>

<template>
  <section class="map-wrap v2-wrap" :aria-label="t('Harita görünümü')">
    <div class="map" @keydown.esc="selectedId = null">
      <div class="stage">
      <div class="ground" :style="{transform: `scale(${zoom})`}" aria-hidden="true" @click="selectedId = null">
        <img src="/v2/search/map-bg.svg" alt="" width="1240" height="1653">
      </div>
      <template v-if="!live">
        <span class="me-ring" :style="{left: `${me.x}%`, top: `${me.y}%`}" aria-hidden="true"/>
        <span class="me" :style="{left: `${me.x}%`, top: `${me.y}%`}" aria-hidden="true"/>
      </template>

      <button v-for="pin in pins" :key="pin.business.id" type="button" class="pin t-label-sm"
              :class="{on: pin.business.id === selectedId, hot: pin.business.id === hoveredId}"
              :style="{left: `${pin.x}%`, top: `${pin.y}%`}"
              :aria-label="pin.business.reviewCount ? t('{name}, puan {rating}', {name: pin.business.name, rating: rating(pin.business.rating)}) : t('{name}, henüz yorum yok', {name: pin.business.name})"
              :aria-pressed="pin.business.id === selectedId"
              @click="choose(pin.business.id)" @mouseenter="hoveredId = pin.business.id" @mouseleave="hoveredId = null">
        <Star :size="14" class="star" aria-hidden="true"/>{{ pin.business.reviewCount ? rating(pin.business.rating) : '—' }}
      </button>

      <article v-if="selected && popup" class="pop" :class="{below: popup.below}" :style="{left: `${popup.x}%`, top: `${popup.y}%`}" aria-live="polite">
        <img v-if="selected.photo" :src="selected.photo" alt="" class="pop-photo">
        <div v-else class="pop-photo empty"><MapPin :size="24" aria-hidden="true"/></div>
        <div class="pop-body">
          <h3 class="pop-name">{{ selected.name }}</h3>
          <p class="pop-meta">
            <template v-if="selected.reviewCount">
              <Star :size="14" class="star" aria-hidden="true"/><span class="t-label-sm">{{ rating(selected.rating) }}</span>
              <span class="t-body-sm t-muted">({{ t('{count} yorum', {count: selected.reviewCount}) }}) · {{ km(selected.distanceKm) }}</span>
            </template>
            <span v-else class="t-body-sm t-muted">{{ t('Henüz yorum yok') }}{{ selected.distanceKm === null ? '' : ` · ${km(selected.distanceKm)}` }}</span>
            <span v-if="selectedOpen && selectedOpen.open !== null" class="dot" :class="{closed: !selectedOpen.open}" aria-hidden="true"/>
            <span v-if="selected.hoursKnown" class="t-label-sm">{{ selectedOpen?.text }}</span>
          </p>
          <div class="pop-actions">
            <a v-if="selected.phone" :href="tel(selected)" class="pop-btn dark t-label-sm"><Phone :size="15" aria-hidden="true"/>{{ t('Ara') }}</a>
            <NuxtLink :to="`/servis/${selected.id}#konum`" class="pop-btn t-label-sm"><Navigation :size="15" aria-hidden="true"/>{{ t('Yol tarifi') }}</NuxtLink>
            <NuxtLink :to="`/servis/${selected.id}`" class="pop-go" :aria-label="t('{name} profilini aç', {name: selected.name})"><ArrowRight :size="17" aria-hidden="true"/></NuxtLink>
          </div>
        </div>
      </article>


      <button v-if="live" type="button" class="here t-label-sm" disabled :title="t('Harita alanında arama henüz yok; il, ilçe ya da çevre mesafesiyle ara')"><Search :size="16" aria-hidden="true"/>{{ t('Bu alanda ara · yakında') }}</button>
      <button v-else type="button" class="here t-label-sm" @click="searchHere"><Search :size="16" aria-hidden="true"/>{{ t('Bu alanda ara') }}</button>
      <div class="zoom">
        <button type="button" :aria-label="t('Yakınlaştır')" :disabled="zoom >= 2.5" @click="setZoom(0.5)"><Plus :size="18" aria-hidden="true"/></button>
        <span aria-hidden="true"/>
        <button type="button" :aria-label="t('Uzaklaştır')" :disabled="zoom <= 1" @click="setZoom(-0.5)"><Minus :size="18" aria-hidden="true"/></button>
      </div>
      <button v-if="!live" type="button" class="locate" :aria-label="t('Konumuma dön')" @click="locate"><LocateFixed :size="20" aria-hidden="true"/></button>
      <p class="hint" :class="{wide: live}">{{ live && unpinned ? t('{count} işletmenin doğrulanmış konumu yok; yalnız listede', {count: unpinned}) : t('Mesafeler kuş uçuşudur') }}</p>
      <p v-if="live && !drawn.length" class="empty-map t-body-sm">{{ t('Bu sonuçların hiçbirinin doğrulanmış konumu yok. Liste yanda.') }}</p>
      <p class="sr-only" aria-live="polite">{{ status }}</p>
      </div>
      <aside class="panel" :aria-label="t('Sonuçlar')">
        <div class="panel-head">
          <div>
            <h2 class="t-h4">{{ t('{count} işletme', {count: total}) }}</h2>
            <p class="t-body-sm t-muted">{{ scope }}</p>
          </div>
          <SearchViewToggle view="harita" @change="emit('view', $event)"/>
        </div>
        <ul class="rows">
          <li v-for="b in results" :key="b.id" :ref="(el) => { rows[b.id] = el as HTMLElement | null }">
            <button type="button" class="row" :class="{on: b.id === selectedId, hot: b.id === hoveredId}" :aria-pressed="b.id === selectedId"
                    @click="choose(b.id)" @mouseenter="hoveredId = b.id" @mouseleave="hoveredId = null" @focus="hoveredId = b.id" @blur="hoveredId = null">
              <img v-if="b.photo" :src="b.photo" alt="" class="thumb" loading="lazy">
              <span v-else class="thumb empty"><MapPin :size="22" aria-hidden="true"/></span>
              <span class="row-text">
                <span class="t-label-md name">{{ b.name }}</span>
                <span class="t-body-sm t-muted">{{ meta(b) }}</span>
                <span v-if="b.reviewCount" class="rate"><Star :size="13" class="star" aria-hidden="true"/><span class="t-label-sm">{{ rating(b.rating) }}</span><span class="t-body-sm t-muted">({{ b.reviewCount }})</span></span>
                <span v-else class="t-body-sm t-muted">{{ t('Henüz yorum yok') }}</span>
              </span>
            </button>
          </li>
        </ul>
        <button type="button" class="btn btn-outline all" @click="emit('view', 'liste')">{{ t('Tüm listeyi aç') }}<ArrowRight aria-hidden="true"/></button>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.map-wrap{padding-top:28px;padding-bottom:64px}
.map{position:relative;height:720px;border-radius:32px;overflow:hidden;background:var(--cream-100);isolation:isolate}
.stage{position:absolute;inset:0;overflow:hidden}
.ground{position:absolute;inset:0;transition:transform .25s ease}
.ground img{position:absolute;left:0;top:0;width:100%;height:auto;max-width:none}
.me-ring,.me{position:absolute;transform:translate(-50%,-50%);border-radius:999px;pointer-events:none;transition:left .25s ease,top .25s ease}
.me-ring{width:110px;height:110px;background:rgba(200,240,60,.35)}
.me{width:22px;height:22px;background:var(--ink-900);border:4px solid var(--white)}
.star{color:var(--orange-500);fill:var(--orange-500);flex:none}

.pin{position:absolute;z-index:1;transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:5px;padding:7px 12px 7px 9px;border-radius:999px;background:var(--white);color:var(--ink-900);filter:drop-shadow(0 6px 8px rgba(10,20,36,.2));transition:left .25s ease,top .25s ease,background-color .15s ease}
.pin.hot{z-index:3;background:var(--orange-500);color:var(--ink-900)}
.pin.hot .star{color:var(--ink-900);fill:var(--ink-900)}
.pin.on{z-index:4;background:var(--ink-900);color:var(--white);filter:drop-shadow(0 6px 8px rgba(10,20,36,.35))}
.pin.on .star{color:var(--lime-400);fill:var(--lime-400)}

.pop{position:absolute;z-index:5;width:300px;transform:translate(-50%,calc(-100% - 36px));background:var(--white);border-radius:24px;overflow:hidden;box-shadow:0 18px 40px rgba(10,20,36,.25)}
.pop.below{transform:translate(-50%,36px)}
.pop-photo{display:block;width:100%;height:120px;object-fit:cover}
.pop-photo.empty{display:grid;place-items:center;background:var(--cream-100);color:var(--ink-500)}
.pop-body{display:flex;flex-direction:column;gap:10px;padding:16px}
.pop-name{font-weight:600;font-size:16px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pop-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.dot{width:7px;height:7px;border-radius:999px;background:var(--green-500)}
.dot.closed{background:var(--red-500)}
.pop-actions{display:flex;align-items:center;gap:8px}
.pop-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 0;border-radius:999px;background:var(--cream-100);color:var(--ink-900)}
.pop-btn.dark{background:var(--ink-900);color:var(--white)}
.pop-go{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:999px;background:var(--orange-500);color:var(--ink-900)}

.panel{position:absolute;z-index:6;left:20px;top:20px;width:380px;max-height:calc(100% - 40px);display:flex;flex-direction:column;gap:10px;padding:16px;background:var(--white);border-radius:24px;filter:drop-shadow(0 18px 20px rgba(10,20,36,.2))}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 4px 6px 6px}
.rows{position:relative;display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-height:0;margin:0 -4px;padding:0 4px}
.row{width:100%;display:flex;align-items:center;gap:12px;padding:10px;border-radius:18px;border:1.5px solid transparent;text-align:left}
.row.hot{background:var(--cream-50)}
.row.on{background:var(--cream-50);border-color:var(--ink-900)}
.thumb{flex:none;width:64px;height:64px;border-radius:14px;object-fit:cover}
.thumb.empty{display:grid;place-items:center;background:var(--cream-100);color:var(--ink-500)}
.row-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.name{color:var(--ink-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rate{display:flex;align-items:center;gap:5px}
.all{flex:none;width:100%}

.here{position:absolute;z-index:2;left:58%;top:20px;display:inline-flex;align-items:center;gap:8px;padding:10px 18px 10px 14px;border-radius:999px;background:var(--ink-900);color:var(--white);filter:drop-shadow(0 10px 12px rgba(10,20,36,.3))}
.here :deep(svg){color:var(--lime-400)}
.here:disabled{opacity:.7;cursor:not-allowed}
.hint.wide{right:20px}
.empty-map{position:absolute;z-index:2;left:calc(380px + 60px);right:40px;top:50%;transform:translateY(-50%);padding:14px 18px;border-radius:18px;background:var(--white);color:var(--ink-700);text-align:center}
.zoom{position:absolute;z-index:2;right:20px;top:20px;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;background:var(--white);box-shadow:0 8px 20px rgba(10,20,36,.16)}
.zoom button{display:grid;place-items:center;width:44px;height:44px;color:var(--ink-900)}
.zoom button:disabled{color:var(--ink-300);cursor:default}
.zoom span{height:1px;background:var(--cream-200)}
.locate{position:absolute;z-index:2;right:20px;bottom:20px;display:grid;place-items:center;width:44px;height:44px;border-radius:999px;background:var(--white);color:var(--ink-900);filter:drop-shadow(0 8px 10px rgba(10,20,36,.16))}
.hint{position:absolute;z-index:2;right:108px;bottom:23px;padding:8px 14px;border-radius:999px;background:var(--white);font-size:13px;line-height:1.45;color:var(--ink-700);filter:drop-shadow(0 6px 8px rgba(10,20,36,.14))}

@media (max-width:900px){
  .map-wrap{padding-top:20px;padding-bottom:40px}
  .map{height:auto;overflow:visible;background:none;border-radius:0;display:flex;flex-direction:column;gap:16px}
  .stage{position:relative;inset:auto;height:460px;border-radius:24px;background:var(--cream-100)}
  .pop{left:12px!important;right:12px;top:auto!important;bottom:12px;width:auto;transform:none}
  .pop.below{transform:none}
  .pop-photo{height:90px}
  .here{left:16px;top:16px}
  .zoom{right:16px;top:16px}
  .hint{display:none}
  .empty-map{left:16px;right:16px}
  .panel{position:static;width:auto;max-height:none;filter:none;border:1px solid var(--cream-200)}
  .rows{max-height:420px}
}
</style>
