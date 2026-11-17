<script setup lang="ts">
import {computed, ref} from 'vue';
import {Check, Info, Scale} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import CompareTable from '~/components/v2/search/CompareTable.vue';
import SearchState from '~/components/v2/search/SearchState.vue';
import {useMockCompare} from '~/composables/useMockCompare';
import {useMockSession} from '~/composables/useMockSession';
import {searchBusiness, searchBusinesses, type SearchBusiness} from '~/data/mock/search';

// W06 Karşılaştırma (Figma 122:596). Reads ?ids=a,b,c; falls back to the current compare selection,
// then to the first three mock search businesses (the ones drawn in Figma).
useSeoMeta({title: 'İşletmeleri karşılaştır'});

const route = useRoute();
const router = useRouter();
const compare = useMockCompare();
const session = useMockSession();

const cleared = ref(false);
const savedState = ref<'idle' | 'saved' | 'signin'>('idle');

const queryIds = computed(() => String(route.query.ids ?? '').split(',').map((id) => id.trim()).filter((id) => searchBusiness(id)));
const ids = computed(() => {
  if (queryIds.value.length) return queryIds.value;
  if (cleared.value) return [];
  const selected = compare.ids.value.filter((id) => searchBusiness(id));
  return selected.length ? selected : searchBusinesses.slice(0, compare.max).map((b) => b.id);
});
const items = computed(() => [...new Set(ids.value)].slice(0, compare.max).map((id) => searchBusiness(id)).filter((b): b is SearchBusiness => !!b));

function clearAll() {
  compare.clear();
  cleared.value = true;
  savedState.value = 'idle';
  if (route.query.ids) void router.replace({query: {}});
}
function save() {
  savedState.value = session.signedIn.value ? 'saved' : 'signin';
}
</script>

<template>
  <div class="compare-page">
    <SearchState v-if="!items.length" :icon="Scale" eyebrow="Karşılaştır" title="Karşılaştırılacak işletme yok."
                 text="Arama sonuçlarında “Karşılaştır” kutusunu işaretleyerek en fazla 3 işletme seçebilirsin.">
      <V2Button size="lg" to="/ara" arrow>Servis ara</V2Button>
    </SearchState>

    <template v-else>
      <header class="head v2-wrap">
        <div class="titles">
          <p class="t-mono-md t-eyebrow">Karşılaştır</p>
          <h1 class="t-h2">İşletmeleri karşılaştır</h1>
          <p class="t-body-md t-muted">En fazla 3 işletme · Ücretsiz hesabınla kaydedebilirsin</p>
        </div>
        <div class="actions">
          <V2Button variant="outline" @click="clearAll">Temizle</V2Button>
          <V2Button v-if="savedState === 'saved'" variant="dark" disabled><Check aria-hidden="true"/>Kaydedildi</V2Button>
          <V2Button v-else variant="dark" arrow @click="save">Karşılaştırmayı kaydet</V2Button>
        </div>
      </header>
      <p v-if="savedState === 'saved'" class="status v2-wrap t-body-sm" role="status">Karşılaştırma hesabına kaydedildi.</p>
      <p v-else-if="savedState === 'signin'" class="status v2-wrap t-body-sm" role="status">
        Kaydetmek için <NuxtLink to="/giris" class="link">giriş yap</NuxtLink> ya da <NuxtLink to="/kayit" class="link">ücretsiz hesap aç</NuxtLink>.
      </p>

      <section class="table v2-wrap" aria-label="Karşılaştırma tablosu">
        <CompareTable :items="items" :max="compare.max"/>
        <p class="note t-body-sm t-muted"><Info :size="16" aria-hidden="true"/>Değerler işletme beyanı, kullanıcı katkısı veya katalog kaynağıdır. “Bilinmiyor”, “yok” anlamına gelmez.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;padding-top:48px}
.titles{display:flex;flex-direction:column;gap:12px;min-width:0}
.actions{display:flex;gap:12px;flex-wrap:wrap}
.status{padding-top:16px;color:var(--ink-700)}
.link{color:var(--orange-600);font-weight:600;text-decoration:underline}
.table{padding-top:36px;padding-bottom:104px}
.note{display:flex;align-items:flex-start;gap:8px;margin-top:20px}
.note :deep(svg){flex:none;margin-top:2px}
@media (max-width:760px){
  .head{padding-top:32px}
  .table{padding-top:24px;padding-bottom:72px}
}
</style>
