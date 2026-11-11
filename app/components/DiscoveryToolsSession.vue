<script setup lang="ts">
import {computed, nextTick, ref, useId} from 'vue';
import {ArrowRight, Bookmark} from '@lucide/vue';
import {categories, featureAvailable, type Business} from '@otosanayide/core';
import {approximateDistance} from '@otosanayide/core/coverage';
import {comparisonFacts, createSavedSearchRepository, type SavedCriteria, type SavedSearch} from '@otosanayide/core/discovery-tools';
import BusinessVisual from '~/components/BusinessVisual.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useComparison} from '~/composables/useComparison';
import {useApp} from '~/composables/useApp';
import {useSavedLists} from '~/composables/useSavedLists';
import {contractReady} from '~/lib/contract';
import {useLocale} from '~/composables/useLocale';

const props = defineProps<{items: Business[]; criteria: SavedCriteria; onApply: (v: SavedCriteria) => void; scope?: string}>();

function createLifetime() {
  let active = false;
  return {
    activate: () => {
      active = true;
    },
    deactivate: () => {
      active = false;
    },
    isActive: () => active,
  };
}

const {t, locale} = useLocale();
const saved = ref<SavedSearch[]>([]);
const name = ref('');
const ready = ref(false);
const busy = ref(false);
const error = ref('');
const {selected, toggle: toggleCompared} = useComparison();
const show = ref(false);
const repo = computed(() => (props.scope ? createSavedSearchRepository({getItem: k => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v)}, props.scope) : null));
const lifetime = createLifetime();

useClientEffect(() => [repo.value, lifetime], () => {
  lifetime.activate();
  if (repo.value) repo.value.read().then(v => {
    if (lifetime.isActive()) {
      saved.value = v;
      ready.value = true;
    }
  }).catch(() => {
    if (lifetime.isActive()) error.value = 'Kayıtlı aramalar okunamadı. Mevcut kayıtların üzerine yazılmadı.';
  });
  return () => {
    lifetime.deactivate();
  };
});

async function mutate(action: 'add' | 'remove', id?: string) {
  const current = repo.value;
  if (!current || busy.value || !ready.value) return;
  const guard = () => {
    if (!lifetime.isActive()) throw Error('session_changed');
  };
  busy.value = true;
  error.value = '';
  try {
    const next = action === 'add' ? await current.add({id: crypto.randomUUID(), name: name.value.trim(), criteria: props.criteria}, guard) : await current.remove(id!, guard);
    guard();
    saved.value = next;
    name.value = '';
  } catch {
    if (lifetime.isActive()) error.value = 'Kaydedilemedi. Adı, şehir seçimini ve kayıt sınırını kontrol et; gerekirse sayfayı yenile.';
  } finally {
    if (lifetime.isActive()) busy.value = false;
  }
}

const app = useApp();
const savedLists = useSavedLists();
const comparisonSaved = ref('');
const canSaveComparison = computed(() => contractReady.accountExtras && !app.demo && !!app.user && selected.value.length > 1 && selected.value.every(b => !b.sample));
async function saveComparison() {
  comparisonSaved.value = '';
  const name = selected.value.map(b => b.name).join(' · ').slice(0, 60);
  const created = await savedLists.create(name, 'comparison', selected.value.map(b => b.id));
  if (created) comparisonSaved.value = 'Karşılaştırma Kaydedilenler sayfasına kaydedildi.';
}

function clearComparison() {
  selected.value = [];
}

function compare(b: Business) {
  error.value = toggleCompared(b) ? '' : 'En fazla üç işletme karşılaştırabilirsin.';
}

function pickComparison(e: Event) {
  const target = e.target as HTMLSelectElement;
  const b = props.items.find(b => b.id === target.value);
  if (b) compare(b);
  // The source select is controlled with value="": it returns to the placeholder after every choice.
  target.value = '';
}

const fact = (value: string) => t(value === 'yes' ? 'Var' : value === 'no' ? 'Yok' : 'Belirtilmedi');
const criteriaSummary = computed(() => {
  const criteria = props.criteria;
  return [criteria.city, criteria.district, criteria.q, categories.find(c => c.id === criteria.category)?.name, criteria.service, criteria.brand, criteria.card ? t('Kartla ödeme') : '', criteria.areaMode === 'nearby' ? t('Çevre dahil · {0} km', {'0': criteria.radius ?? 25}) : ''].filter(Boolean).map(v => t(v!)).join(' · ');
});
const comparisons = computed(() => selected.value.map(b => ({b, f: comparisonFacts(b)})));
const tableId = useId();

function openComparison() {
  show.value = true;
  void nextTick(() => document.getElementById(tableId)?.scrollIntoView({behavior: 'smooth', block: 'start'}));
}
</script>

<template>
  <section class="tools ds-card" :aria-label="t('Kayıtlı aramalar ve karşılaştırma')">
    <div class="ds-row ds-sb ds-g12 ds-wrap">
      <h3>{{ t('Aramanı düzenle') }}</h3>
      <button class="ds-btn s sm" type="button" :aria-expanded="show" @click="show=!show">{{ t('Kayıtlı aramalar ve karşılaştırma') }}</button>
    </div>
    <template v-if="show">
      <p class="ds-small ds-muted">{{ t('Kayıtlı aramalar bu cihazda hesabına özel saklanır. Konum koordinatların kaydedilmez. En fazla 20 arama.') }}</p>
      <p v-if="!scope" class="ds-small">{{ t('Arama kaydetmek için hesabına giriş yap.') }} <NuxtLink class="tools-link" to="/hesabim">{{ t('Hesabım') }}</NuxtLink></p>
      <template v-else>
        <p class="ds-small ds-muted">{{ t('Kaydedilecek arama: {0}',{'0':criteriaSummary}) }}</p>
        <div class="tools-save">
          <label class="ds-f1"><span class="ds-label tools-label">{{ t('Arama adı') }}</span><input v-model="name" class="ds-field" maxlength="60"/></label>
          <button class="ds-btn p" type="button" :disabled="!ready||busy||!criteria.city||!name.trim()||saved.length>=20" @click="void mutate('add')">{{ t('Bu aramayı kaydet') }}</button>
        </div>
        <p v-if="!criteria.city" class="ds-small">{{ t('Arama kaydetmek için bir şehir seç.') }}</p>
        <ul class="tools-list">
          <li v-for="s in saved" :key="s.id">
            <button class="tools-apply" type="button" :disabled="busy" @click="onApply(s.criteria)">{{ s.name }} · {{ s.criteria.district||s.criteria.city }}{{ s.criteria.areaMode==='nearby'?' · '+t('Çevre dahil · {0} km',{'0':s.criteria.radius??25}):'' }}</button>
            <button class="ds-btn s sm" type="button" :disabled="busy" :aria-label="t('{0} aramasını sil',{'0':s.name})" @click="void mutate('remove',s.id)">{{ t('Sil') }}</button>
          </li>
        </ul>
      </template>
      <p v-if="error" class="ds-note err" role="alert">{{ t(error) }}</p>
      <label><span class="ds-label tools-label">{{ t('Karşılaştırmaya işletme ekle') }}</span><select class="ds-field" value="" @change="pickComparison">
        <option value="">{{ t('Sonuçlardan seç · En fazla 3') }}</option>
        <option v-for="b in items.filter(b=>!selected.some(s=>s.id===b.id))" :key="b.id" :disabled="selected.length>=3" :value="b.id">{{ b.name }}</option>
      </select></label>
      <div v-if="selected.length>0" :id="tableId" class="tools-compare">
        <div class="ds-row ds-sb ds-g12 ds-wrap">
          <div>
            <h2>{{ t('İşletmeleri karşılaştır') }}</h2>
            <p class="ds-small ds-muted">{{ t('En fazla 3 işletme · Ücretsiz hesabınla kaydedebilirsin') }}</p>
          </div>
          <div class="ds-row ds-g10">
            <button v-if="canSaveComparison" class="ds-btn s" type="button" :disabled="savedLists.busy.value" @click="saveComparison"><Bookmark :size="16"/>{{ t('Karşılaştırmayı kaydet') }}</button>
            <button v-else class="ds-btn s ds-passive" type="button" disabled aria-disabled="true" :title="t(app.member?'En az iki gerçek işletme seç':'Kaydetmek için giriş yap')"><Bookmark :size="16"/>{{ t('Karşılaştırmayı kaydet') }}</button>
            <button class="ds-btn g" type="button" @click="clearComparison">{{ t('Temizle') }}</button>
          </div>
        </div>
        <div class="ds-card ds-table-wrap">
          <table class="ds-table tools-table">
            <thead>
              <tr>
                <td/>
                <th v-for="{b,f} in comparisons" :key="b.id" scope="col">
                  <div class="tools-head">
                    <NuxtLink class="tools-photo" :to="'/servis/'+b.id"><BusinessVisual :business="b"/></NuxtLink>
                    <NuxtLink class="tools-name" :to="'/servis/'+b.id">{{ b.name }}</NuxtLink>
                    <span v-if="f.sample" class="ds-badge neu">{{ t('Örnek işletme') }}</span>
                    <span class="ds-xs ds-muted">{{ f.location }}</span>
                    <NuxtLink class="ds-btn p sm tools-open" :to="'/servis/'+b.id">{{ t('Profili aç') }}</NuxtLink>
                    <button class="ds-btn g sm tools-open" type="button" :aria-label="t('{0} karşılaştırmadan çıkar',{'0':b.name})" @click="compare(b)">{{ t('Karşılaştırmadan çıkar') }}</button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr><th scope="row">{{ t('Mesafe (kuş uçuşu)') }}</th><td v-for="{b} in comparisons" :key="b.id">{{ b.distance!==undefined?approximateDistance(b.distance,locale):'—' }}</td></tr>
              <tr><th scope="row">{{ t('Sahiplik') }}</th><td v-for="{b,f} in comparisons" :key="b.id">{{ t(f.verified?'Doğrulandı':'Doğrulanmadı') }}</td></tr>
              <tr><th scope="row">{{ t('Hizmetler') }}</th><td v-for="{b,f} in comparisons" :key="b.id">{{ f.services.map(s=>t(s)).join(', ')||t('Belirtilmedi') }}</td></tr>
              <tr><th scope="row">{{ t('Markalar') }}</th><td v-for="{b,f} in comparisons" :key="b.id">{{ f.brands.join(', ')||t('Belirtilmedi') }}</td></tr>
              <tr><th scope="row">{{ t('Kart ile ödeme') }}</th><td v-for="{b,f} in comparisons" :key="b.id">{{ fact(f.card) }}</td></tr>
              <tr><th scope="row">{{ t('WC') }}</th><td v-for="{b,f} in comparisons" :key="b.id">{{ fact(f.wc) }}</td></tr>
              <tr><th scope="row">{{ t('Şu an') }}</th><td v-for="{b,f} in comparisons" :key="b.id">{{ f.hours||t('Saat bilgisi yok') }}</td></tr>
              <tr><th scope="row">{{ t('Teklif / randevu') }}</th><td v-for="{b} in comparisons" :key="b.id">{{ [featureAvailable(b,'quotes')?t('Teklif'):'',featureAvailable(b,'appointments')?t('Randevu'):''].filter(Boolean).join(' · ')||'—' }}</td></tr>
            </tbody>
          </table>
        </div>
        <p v-if="comparisonSaved" class="ds-note ok" role="status">{{ t(comparisonSaved) }}</p>
        <p v-if="savedLists.error.value" class="ds-note err" role="alert">{{ t(savedLists.error.value) }}</p>
        <p class="ds-xs ds-muted">{{ t('Karşılaştırma bu oturumda görüntülenen bilgilere dayanır; doğrulanmamış alanlar belirtilir. Seçim sayfa yenilenince temizlenir.') }} {{ t('Reklam satın almak bu tablodaki bilgileri değiştirmez.') }}</p>
      </div>
    </template>
    <div v-if="selected.length>0" class="tools-bar">
      <span class="ds-small"><b>{{ t('{0} / 3 işletme',{'0':selected.length}) }}</b> {{ t('karşılaştırmada') }}</span>
      <div class="ds-row ds-g8">
        <button class="ds-btn sm tools-bar-ghost" type="button" @click="clearComparison">{{ t('Temizle') }}</button>
        <button class="ds-btn p sm" type="button" @click="openComparison">{{ t('Karşılaştır') }}<ArrowRight :size="15"/></button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tools {display: flex; flex-direction: column; gap: 14px; padding: 20px; margin-top: 8px;}
.tools h3, .tools p {margin: 0;}
.tools label {display: block;}
.tools-label {display: block;}
.tools-link {font-weight: 700; color: #c4460b;}
.tools-save {display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;}
.tools-save label {min-width: 220px;}
.tools-list {list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px;}
.tools-list:empty {display: none;}
.tools-list li {display: flex; align-items: center; justify-content: space-between; gap: 12px;}
.tools-apply {flex: 1; min-width: 0; border: 0; background: none; padding: 6px 0; text-align: left; font-size: 14px; font-weight: 700; color: #c4460b; overflow-wrap: anywhere;}
.tools-compare {display: flex; flex-direction: column; gap: 16px; padding-top: 8px;}
.tools-compare h2 {margin: 0; font-size: 34px; line-height: 1.12;}
.tools-table {min-width: 640px;}
.tools-table thead th {padding: 16px; background: #fff; text-transform: none; letter-spacing: 0; vertical-align: top; color: #10243a;}
.tools-table tbody th {padding: 14px; background: #fff; text-transform: none; letter-spacing: 0; font-size: 14px; color: #10243a; border-bottom: 1px solid #edf0f3; white-space: nowrap;}
.tools-head {display: flex; flex-direction: column; align-items: flex-start; gap: 10px;}
.tools-photo {display: block; width: 100%; height: 130px; border-radius: 12px; overflow: hidden;}
.tools-photo :deep(img) {width: 100%; height: 100%; object-fit: cover;}
.tools-photo :deep(.visual-initials) {display: none;}
.tools-photo :deep(.visual-symbol) {width: 56px; height: 56px; margin: 0; background: none;}
.tools-name {font-size: 16px; font-weight: 700; color: #10243a; text-decoration: none; overflow-wrap: anywhere;}
.tools-open {width: 100%;}
.tools-bar {position: fixed; left: 50%; bottom: 20px; z-index: 40; transform: translateX(-50%); width: min(560px, calc(100vw - 32px)); display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 12px 12px 16px; border-radius: 14px; background: #10243a; color: #fff; box-shadow: 0 16px 36px rgba(16, 36, 58, .25);}
.tools-bar-ghost {background: transparent; border-color: #536276; color: #fff;}
@media (max-width: 760px) {
  .tools-bar {bottom: 84px;}
  .tools-compare h2 {font-size: 24px;}
}
</style>
