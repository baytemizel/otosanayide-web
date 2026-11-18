<script setup lang="ts">
import {computed, ref, shallowRef, watch} from 'vue';
import {Check, Info, Scale} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import CompareTable from '~/components/v2/search/CompareTable.vue';
import SearchState from '~/components/v2/search/SearchState.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {useMockCompare} from '~/composables/useMockCompare';
import {useSession} from '~/composables/useSession';
import {useSearchCards} from '~/composables/v2/useSearch';
import {searchBusiness, searchBusinesses, type SearchBusiness} from '~/data/mock/search';
import {errorStatus} from '~/lib/api-read';
import {demoMode} from '~/lib/env';
import {listsApi} from '~/lib/member-api';
import {readBusiness} from '~/lib/server-read';
import {compareFromLive, compareFromMock, comparisonName, type CompareColumn} from '~/lib/v2/compare';

// W06 Karşılaştırma (Figma 122:596). Reads ?ids=a,b,c; falls back to the current compare selection.
// Demo: mock search businesses (then the first three, the ones drawn in Figma).
// Live: each id is read with GET /api/businesses/{id}?v=2; saving creates a "comparison" list (web-13).
useSeoMeta({title: 'İşletmeleri karşılaştır'});

const demo = demoMode();
const route = useRoute();
const router = useRouter();
const app = useApp();
const compare = useMockCompare();
const session = useSession();
const {locale} = useLocale();
const {cards} = useSearchCards();

const cleared = ref(false);
const savedState = ref<'idle' | 'saved' | 'signin'>('idle');

const idPattern = /^[A-Za-z0-9_-]{1,120}$/;
const requested = computed(() => String(route.query.ids ?? '').split(',').map((id) => id.trim()).filter(Boolean));

// ---- Demo ------------------------------------------------------------------------------------------
const queryIds = computed(() => requested.value.filter((id) => searchBusiness(id)));
const demoIds = computed(() => {
  if (queryIds.value.length) return queryIds.value;
  if (cleared.value) return [];
  const selected = compare.ids.value.filter((id) => searchBusiness(id));
  return selected.length ? selected : searchBusinesses.slice(0, compare.max).map((b) => b.id);
});
const demoItems = computed(() => [...new Set(demoIds.value)].slice(0, compare.max).map((id) => searchBusiness(id)).filter((b): b is SearchBusiness => !!b).map(compareFromMock));

// ---- Live ------------------------------------------------------------------------------------------
const liveIds = computed(() => {
  const fromQuery = requested.value.filter((id) => idPattern.test(id));
  const list = fromQuery.length ? fromQuery : cleared.value ? [] : compare.ids.value;
  return [...new Set(list)].slice(0, compare.max);
});
const liveItems = shallowRef<CompareColumn[]>([]);
const loading = ref(false);
const failed = ref(0);
const missing = ref(0);
const retries = ref(0);

useClientEffect(() => [demo ? '' : liveIds.value.join(','), retries.value], () => {
  if (demo) return;
  const ids = liveIds.value;
  let cancelled = false;
  liveItems.value = [];
  failed.value = 0;
  missing.value = 0;
  if (!ids.length) {
    loading.value = false;
    return;
  }
  loading.value = true;
  Promise.all(ids.map((id) => readBusiness(id, locale.value))).then((reads) => {
    if (cancelled) return;
    const columns: CompareColumn[] = [];
    reads.forEach((read, index) => {
      if (read.status === 'found') columns.push(compareFromLive(read.business, read.extras, cards.value[ids[index]!]?.distanceKm ?? null));
      else if (read.status === 'missing') missing.value++;
      else failed.value++;
    });
    liveItems.value = columns;
  }).finally(() => {
    if (!cancelled) loading.value = false;
  });
  return () => { cancelled = true; };
});

const items = computed(() => (demo ? demoItems.value : liveItems.value));

// ---- Save (web-13 "Karşılaştırmayı kaydet") ----------------------------------------------------------
const naming = ref(false);
const name = ref('');
const saving = ref(false);
const saveError = ref('');
const savedName = ref('');
watch(() => items.value.map((i) => i.id).join(','), () => {
  savedState.value = 'idle';
  naming.value = false;
  saveError.value = '';
});
const signInHref = computed(() => `/giris?donus=${encodeURIComponent(route.fullPath)}`);

function clearAll() {
  compare.clear();
  cleared.value = true;
  savedState.value = 'idle';
  naming.value = false;
  if (route.query.ids) void router.replace({query: {}});
}
function save() {
  if (demo) {
    savedState.value = session.signedIn.value ? 'saved' : 'signin';
    return;
  }
  if (!app.member) {
    savedState.value = 'signin';
    return;
  }
  name.value = comparisonName(items.value);
  saveError.value = '';
  naming.value = true;
}
async function submitSave() {
  const user = app.user;
  const title = name.value.trim();
  if (!user || saving.value) return;
  if (!title || title.length > 60) {
    saveError.value = 'Ad 1–60 karakter olmalı.';
    return;
  }
  saving.value = true;
  saveError.value = '';
  try {
    const created = await listsApi.create(() => user.getIdToken(), {name: title, kind: 'comparison', businessIds: items.value.map((i) => i.id)}, crypto.randomUUID());
    savedName.value = created.name;
    savedState.value = 'saved';
    naming.value = false;
  } catch (e) {
    const status = errorStatus(e);
    saveError.value = status === 401 ? 'Oturumun kapanmış. Tekrar giriş yap.'
      : status === 403 ? 'Kaydetmek için önce e-posta adresini doğrula.'
        : status === 409 ? 'Liste sınırına ulaştın (en çok 20 liste). Kaydedilenler’den birini silip tekrar dene.'
          : e instanceof Error && e.message ? e.message : 'Karşılaştırma kaydedilemedi. Tekrar dene.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="compare-page">
    <SearchState v-if="!demo && loading" :icon="Scale" eyebrow="Karşılaştır" title="İşletmeler yükleniyor…" text="Seçtiğin işletmelerin güncel bilgileri okunuyor."/>

    <SearchState v-else-if="!demo && !items.length && failed" :icon="Scale" eyebrow="Karşılaştır" title="İşletmeler okunamadı."
                 text="Bağlantı ya da sunucu yanıt vermedi. Biraz sonra tekrar dene.">
      <V2Button size="lg" arrow @click="retries++">Tekrar dene</V2Button>
    </SearchState>

    <SearchState v-else-if="!items.length" :icon="Scale" eyebrow="Karşılaştır" title="Karşılaştırılacak işletme yok."
                 :text="missing ? 'Seçtiğin işletmeler artık yayında değil. Arama sonuçlarından yeniden seçebilirsin.' : 'Arama sonuçlarında “Karşılaştır” kutusunu işaretleyerek en fazla 3 işletme seçebilirsin.'">
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
          <V2Button v-else variant="dark" arrow :disabled="naming" @click="save">Karşılaştırmayı kaydet</V2Button>
        </div>
      </header>
      <form v-if="naming" class="name-form v2-wrap" @submit.prevent="submitSave">
        <label for="karsilastirma-adi" class="t-label-sm">Karşılaştırmanın adı</label>
        <div class="name-row">
          <input id="karsilastirma-adi" v-model="name" class="name-input" type="text" maxlength="60" required autocomplete="off">
          <V2Button type="submit" variant="dark" :disabled="saving">{{ saving ? 'Kaydediliyor…' : 'Kaydet' }}</V2Button>
          <V2Button variant="ghost" :disabled="saving" @click="naming = false">Vazgeç</V2Button>
        </div>
        <p v-if="saveError" class="error t-body-sm" role="alert">{{ saveError }}</p>
      </form>
      <p v-if="savedState === 'saved'" class="status v2-wrap t-body-sm" role="status">
        <template v-if="demo">Karşılaştırma hesabına kaydedildi.</template>
        <template v-else>“{{ savedName }}” hesabına kaydedildi. <NuxtLink to="/kaydedilenler" class="link">Kaydedilenler’de gör</NuxtLink></template>
      </p>
      <p v-else-if="savedState === 'signin'" class="status v2-wrap t-body-sm" role="status">
        Kaydetmek için <NuxtLink :to="demo ? '/giris' : signInHref" class="link">giriş yap</NuxtLink> ya da <NuxtLink to="/kayit" class="link">ücretsiz hesap aç</NuxtLink>.
      </p>
      <p v-if="!demo && (failed || missing)" class="status v2-wrap t-body-sm" role="status">
        <template v-if="missing">{{ missing }} işletme artık yayında değil, tabloda gösterilmiyor. </template>
        <template v-if="failed">{{ failed }} işletme okunamadı. <button type="button" class="link" @click="retries++">Tekrar dene</button></template>
      </p>

      <section class="table v2-wrap" aria-label="Karşılaştırma tablosu">
        <CompareTable :items="items" :max="compare.max" :live="!demo"/>
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
.name-form{display:flex;flex-direction:column;gap:8px;padding-top:20px}
.name-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.name-input{flex:1 1 320px;max-width:520px;padding:12px 16px;border:1px solid var(--cream-200);border-radius:999px;background:var(--white);font-size:16px;color:var(--ink-900)}
.name-input:focus{outline:none;border-color:var(--ink-900)}
.error{color:var(--red-500)}
.table{padding-top:36px;padding-bottom:104px}
.note{display:flex;align-items:flex-start;gap:8px;margin-top:20px}
.note :deep(svg){flex:none;margin-top:2px}
@media (max-width:760px){
  .head{padding-top:32px}
  .table{padding-top:24px;padding-bottom:72px}
}
</style>
