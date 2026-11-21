<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {MapPin, Search, X} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Select from '~/components/v2/V2Select.vue';
import {useLocale} from '~/composables/useLocale';
import {allProvinces, districtsByProvince, type SearchFilters} from '~/data/mock/search';

// "Arama şeridi" (Figma 119:68): natural-language search, province and district pickers, and the
// "Anladığımız" chips that show how the query was read. Each chip removes its filter.
// Live mode passes `districts` (official list + API) and `covered` (provinces in service); the province
// picker then groups the provinces outside coverage, which only lead to S02.
const props = defineProps<{filters: SearchFilters; chips: {key: string; label: string}[]; districts?: string[]; covered?: string[]}>();
const emit = defineEmits<{submit: [text: string]; place: [il: string, ilce: string]; remove: [key: string]; fix: []}>();
const {t} = useLocale();

const text = ref(props.filters.q);
watch(() => props.filters.q, (value) => { text.value = value; });

const provinces = computed(() => (allProvinces.includes(props.filters.il) ? allProvinces : [props.filters.il, ...allProvinces]));
const districts = computed(() => props.districts ?? districtsByProvince[props.filters.il] ?? []);
const coveredSet = computed(() => new Set(props.covered ?? []));
const inService = computed(() => provinces.value.filter((p) => coveredSet.value.has(p)));
const outside = computed(() => provinces.value.filter((p) => !coveredSet.value.has(p)));

const provinceOptions = computed(() => (props.covered
  ? [...inService.value.map((p) => ({value: p, group: t('Hizmet verilen iller')})), ...outside.value.map((p) => ({value: p, group: t('Henüz hizmet verilmeyen iller')}))]
  : provinces.value));
const districtOptions = computed(() => [{value: '', label: t('Tüm ilçeler')}, ...districts.value.map((d) => ({value: d}))]);

function onProvince(value: string) {
  emit('place', value, '');
}
function onDistrict(value: string) {
  emit('place', props.filters.il, value);
}
</script>

<template>
  <section class="strip v2-wrap" :aria-label="t('Arama')">
    <form class="bar" role="search" @submit.prevent="emit('submit', text)">
      <Search :size="20" class="lead" aria-hidden="true"/>
      <label class="sr-only" for="search-text">{{ t('Ne arıyorsun?') }}</label>
      <input id="search-text" v-model="text" class="query" type="search" :placeholder="t('Örn. Kadıköy’de BMW için boyasız göçük')" autocomplete="off">
      <span class="place">
        <MapPin :size="16" aria-hidden="true"/>
        <V2Select :model-value="filters.il" :options="provinceOptions" variant="bare" anchor=".place" stretch :match-width="false" class="t-label-sm" :aria-label="t('İl')" @change="onProvince"/>
      </span>
      <span class="place">
        <MapPin :size="16" aria-hidden="true"/>
        <V2Select :model-value="filters.ilce" :options="districtOptions" variant="bare" anchor=".place" stretch :match-width="false" class="t-label-sm" :aria-label="t('İlçe')" @change="onDistrict"/>
      </span>
      <V2Button type="submit" arrow class="go">{{ t('Servis bul') }}</V2Button>
    </form>
    <div v-if="chips.length" class="read">
      <span class="t-mono-sm t-muted">{{ t('Anladığımız') }}</span>
      <ul class="chips">
        <li v-for="chip in chips" :key="chip.key">
          <button type="button" class="read-chip t-label-sm" :aria-label="t('Kaldır: {label}', {label: chip.label})" @click="emit('remove', chip.key)">
            {{ chip.label }}<X :size="13" aria-hidden="true"/>
          </button>
        </li>
      </ul>
      <button type="button" class="fix t-label-sm" @click="emit('fix')">{{ t('Yanlış anladıysak düzelt') }}</button>
    </div>
  </section>
</template>

<style scoped>
.strip{display:flex;flex-direction:column;gap:14px;padding-top:28px}
.bar{display:flex;align-items:center;gap:12px;padding:8px 8px 8px 24px;background:var(--white);border:1px solid var(--cream-200);border-radius:999px;filter:drop-shadow(0 10px 15px rgba(10,20,36,.07))}
.lead{flex:none;color:var(--ink-900)}
.query{flex:1;min-width:0;border:0;background:none;padding:0;font-size:16px;line-height:1.5;color:var(--ink-900)}
.query::placeholder{color:var(--ink-300)}
.query:focus{outline:none}
.bar:focus-within{border-color:var(--ink-900)}
.place{position:relative;flex:none;display:inline-flex;align-items:center;gap:8px;padding:10px 14px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:999px;color:var(--ink-900)}
.place:focus-within{border-color:var(--ink-900);box-shadow:0 0 0 3px rgba(243,107,33,.18)}
.go{flex:none}
.read{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-left:24px}
.chips{display:contents}
.read-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 10px 7px 12px;border-radius:999px;background:var(--lime-100);color:var(--ink-800)}
.read-chip:hover{background:var(--lime-400)}
.fix{color:var(--orange-600)}
.fix:hover{text-decoration:underline}
@media (max-width:900px){
  .bar{flex-wrap:wrap;border-radius:28px;padding:14px}
  .lead{margin-left:6px}
  .query{flex-basis:calc(100% - 44px)}
  .place{flex:1 1 40%;justify-content:space-between}
  .go{flex:1 1 100%}
  .read{padding-left:0}
}
</style>
