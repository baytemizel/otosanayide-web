<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import {ArrowRight, Car, Check, ChevronDown, Gauge, Locate, MapPin, Search, Wrench} from '@lucide/vue';
import {homeLocations, homeSearchTabs, homeVehicles, type HomeSearchTab} from '~/data/mock/home';

// Figma 108:148 "Akıllı arama modülü": three tabs, remembered vehicle, one-click popular searches.
const tab = ref<HomeSearchTab>('hizmet');
const vehicle = ref(homeVehicles[0]);
const location = ref(homeLocations[0]);
const query = ref('');
const current = computed(() => homeSearchTabs.find((t) => t.id === tab.value) ?? homeSearchTabs[0]);
const icons = {hizmet: Wrench, belirti: Gauge, arac: Car} as const;

// The selected vehicle is a per-viewer convenience, so browser storage is enough here.
const vehicleKey = 'v2-home-vehicle';
onMounted(() => {
  try {
    const saved = localStorage.getItem(vehicleKey);
    if (saved && homeVehicles.includes(saved)) vehicle.value = saved;
  } catch { /* storage unavailable */ }
});
watch(vehicle, (value) => {
  try { localStorage.setItem(vehicleKey, value); } catch { /* storage unavailable */ }
});

function run(term: string) {
  const q = term.trim();
  if (tab.value === 'belirti') return navigateTo(q ? {path: '/ara', query: {belirti: q}} : '/ara');
  if (tab.value === 'arac') return navigateTo({path: '/ara', query: {q: q || vehicle.value.split(' · ')[0]}});
  return navigateTo(q ? {path: '/ara', query: {q}} : '/ara');
}
function pickPopular(term: string) {
  query.value = term;
  run(term);
}
</script>

<template>
  <form class="home-search" role="search" aria-label="Servis ara" @submit.prevent="run(query)">
    <div class="top">
      <div class="tabs" role="tablist" aria-label="Arama türü">
        <button
          v-for="item in homeSearchTabs" :key="item.id" type="button" role="tab" class="tab t-label-sm"
          :class="{on: tab === item.id}" :aria-selected="tab === item.id" @click="tab = item.id">
          <component :is="icons[item.id]" :size="16" aria-hidden="true"/>{{ item.label }}
        </button>
      </div>
      <p class="free t-body-sm"><Check :size="16" aria-hidden="true"/>Üyelik gerekmez · arama ücretsiz</p>
    </div>

    <div class="fields">
      <label class="sfield" :class="{focus: tab === 'arac'}">
        <span class="circle" aria-hidden="true"><Car :size="20"/></span>
        <span class="field-text">
          <span class="t-mono-sm t-muted">ARACIN</span>
          <span class="select-wrap">
            <select v-model="vehicle" class="t-label-md" aria-label="Aracın">
              <option v-for="v in homeVehicles" :key="v" :value="v">{{ v }}</option>
            </select>
            <ChevronDown :size="16" aria-hidden="true"/>
          </span>
        </span>
      </label>
      <span class="sep" aria-hidden="true"/>
      <label class="sfield">
        <span class="circle" aria-hidden="true"><Search :size="20"/></span>
        <span class="field-text grow">
          <span class="t-mono-sm t-muted">{{ current.fieldLabel.toLocaleUpperCase('tr-TR') }}</span>
          <input v-model="query" type="search" class="query" :placeholder="current.placeholder" :aria-label="current.fieldLabel" enterkeyhint="search">
        </span>
      </label>
      <span class="sep" aria-hidden="true"/>
      <label class="sfield">
        <span class="circle" aria-hidden="true"><MapPin :size="20"/></span>
        <span class="field-text">
          <span class="t-mono-sm t-muted">NEREDE?</span>
          <span class="select-wrap">
            <select v-model="location" class="t-label-md" aria-label="Nerede?">
              <option v-for="l in homeLocations" :key="l" :value="l">{{ l }}</option>
            </select>
            <ChevronDown :size="16" aria-hidden="true"/>
          </span>
        </span>
      </label>
      <button type="submit" class="btn btn-primary btn-lg submit">Servis bul<ArrowRight aria-hidden="true"/></button>
    </div>

    <div class="popular">
      <span class="t-mono-sm t-muted">POPÜLER</span>
      <ul class="chips">
        <li v-for="term in current.popular" :key="term">
          <button type="button" class="chip chip-soft" @click="pickPopular(term)">{{ term }}</button>
        </li>
      </ul>
      <NuxtLink :to="{path: '/ara', query: {yakinimda: '1'}}" class="near t-label-sm"><Locate :size="16" aria-hidden="true"/>Yakınımdakileri göster</NuxtLink>
    </div>
  </form>
</template>

<style scoped>
.home-search{display:flex;flex-direction:column;gap:12px;padding:12px;background:var(--white);border:1px solid var(--cream-200);border-radius:32px;box-shadow:0 24px 30px rgba(10,20,36,.12)}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:4px 10px 0 4px}
.tabs{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--cream-100);max-width:100%;overflow-x:auto;scrollbar-width:none}
.tab{display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;color:var(--ink-700);white-space:nowrap;transition:background-color .15s ease,color .15s ease}
.tab:hover{color:var(--ink-900)}
.tab.on{background:var(--ink-900);color:var(--white)}
.tab.on :deep(svg){color:var(--lime-400)}
.free{display:flex;align-items:center;gap:8px;color:var(--ink-500);white-space:nowrap}
.free :deep(svg){color:var(--green-500)}

.fields{display:flex;align-items:center;padding:8px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:24px}
.sfield{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:14px;padding:12px 18px;border-radius:18px;cursor:pointer;transition:background-color .15s ease}
.sfield:focus-within{background:var(--white)}
.circle{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:999px;background:var(--white);border:1px solid var(--cream-200);color:var(--ink-900)}
.sfield.focus .circle{border-color:var(--orange-500)}
.field-text{display:flex;flex-direction:column;gap:3px;min-width:0}
.field-text.grow{flex:1}
.select-wrap{position:relative;display:flex;align-items:center;gap:6px;color:var(--ink-900)}
.select-wrap select{appearance:none;border:0;background:transparent;padding:0 22px 0 0;margin-right:-22px;max-width:100%;color:var(--ink-900);cursor:pointer;text-overflow:ellipsis}
.select-wrap select:focus{outline:none}
.select-wrap :deep(svg){flex:none;pointer-events:none}
.query{width:100%;border:0;background:transparent;padding:0;font-size:15px;line-height:1.2;color:var(--ink-900)}
.query::placeholder{color:var(--ink-500)}
.query:focus{outline:none}
.query::-webkit-search-cancel-button{display:none}
.sep{flex:none;width:1px;height:44px;background:var(--cream-200)}
.submit{flex:none}

.popular{display:flex;align-items:center;gap:8px;padding:0 10px 6px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chips .chip:hover{background:var(--cream-200)}
.near{margin-left:auto;display:flex;align-items:center;gap:6px;color:var(--orange-600);white-space:nowrap}
.near:hover{text-decoration:underline}

@media (max-width:1100px){
  .fields{flex-wrap:wrap;gap:4px}
  .sfield{flex:1 1 40%}
  .sep{display:none}
  .submit{flex:1 1 100%}
}
@media (max-width:760px){
  .home-search{border-radius:28px}
  .top{flex-direction:column;align-items:stretch;padding:0}
  .tab{padding:10px 12px;gap:6px}
  .free{white-space:normal}
  .sfield{flex:1 1 100%;padding:10px 12px}
  .popular{flex-wrap:wrap;padding:0 4px 4px}
  .near{margin-left:0}
}
</style>
