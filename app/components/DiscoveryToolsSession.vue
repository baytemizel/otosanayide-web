<script setup lang="ts">
import {computed, ref} from 'vue';
import {categories, type Business} from '@otosanayide/core';
import {comparisonFacts, createSavedSearchRepository, toggleComparison, type SavedCriteria, type SavedSearch} from '@otosanayide/core/discovery-tools';
import {useClientEffect} from '~/composables/useClientEffect';
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

const {t} = useLocale();
const saved = ref<SavedSearch[]>([]);
const name = ref('');
const ready = ref(false);
const busy = ref(false);
const error = ref('');
const selected = ref<Business[]>([]);
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

function compare(b: Business) {
  try {
    selected.value = toggleComparison(selected.value, b);
    error.value = '';
  } catch {
    error.value = 'En fazla üç işletme karşılaştırabilirsin.';
  }
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
</script>

<template>
  <section class="discovery-tools" :aria-label="t('Kayıtlı aramalar ve karşılaştırma')">
    <div class="row between">
      <h3>{{ t('Aramanı düzenle') }}</h3>
      <button class="button secondary compact" :aria-expanded="show" @click="show=!show">{{ t('Kayıtlı aramalar ve karşılaştırma') }}</button>
    </div>
    <template v-if="show">
      <p class="small muted">{{ t('Kayıtlı aramalar bu cihazda hesabına özel saklanır. Konum koordinatların kaydedilmez. En fazla 20 arama.') }}</p>
      <p v-if="!scope">{{ t('Arama kaydetmek için hesabına giriş yap.') }} <NuxtLink to="/hesabim">{{ t('Hesabım') }}</NuxtLink></p>
      <template v-else>
        <p class="small muted">{{ t('Kaydedilecek arama: {0}',{'0':criteriaSummary}) }}</p>
        <div class="discovery-save">
          <label>{{ t('Arama adı') }}<input v-model="name" maxlength="60"/></label>
          <button class="button primary" :disabled="!ready||busy||!criteria.city||!name.trim()||saved.length>=20" @click="void mutate('add')">{{ t('Bu aramayı kaydet') }}</button>
        </div>
        <p v-if="!criteria.city">{{ t('Arama kaydetmek için bir şehir seç.') }}</p>
        <ul class="saved-search-list">
          <li v-for="s in saved" :key="s.id">
            <button class="text-button" :disabled="busy" @click="onApply(s.criteria)">{{ s.name }} · {{ s.criteria.district||s.criteria.city }}{{ s.criteria.areaMode==='nearby'?' · '+t('Çevre dahil · {0} km',{'0':s.criteria.radius??25}):'' }}</button>
            <button class="button secondary compact" :disabled="busy" :aria-label="t('{0} aramasını sil',{'0':s.name})" @click="void mutate('remove',s.id)">{{ t('Sil') }}</button>
          </li>
        </ul>
      </template>
      <p v-if="error" role="alert">{{ t(error) }}</p>
      <label>{{ t('Karşılaştırmaya işletme ekle') }}<select value="" @change="pickComparison">
        <option value="">{{ t('Sonuçlardan seç · En fazla 3') }}</option>
        <option v-for="b in items.filter(b=>!selected.some(s=>s.id===b.id))" :key="b.id" :disabled="selected.length>=3" :value="b.id">{{ b.name }}</option>
      </select></label>
      <template v-if="selected.length>0">
        <p class="small muted">{{ t('Karşılaştırma bu oturumda görüntülenen bilgilere dayanır; doğrulanmamış alanlar belirtilir. Seçim sayfa yenilenince temizlenir.') }}</p>
        <div class="comparison-grid">
          <article v-for="{b,f} in comparisons" :key="b.id" class="comparison-card">
            <h3><NuxtLink :to="'/servis/'+b.id">{{ b.name }}</NuxtLink></h3>
            <span v-if="f.sample" class="tag">{{ t('Örnek işletme') }}</span>
            <p>{{ f.location }}</p>
            <dl>
              <dt>{{ t('Hizmetler') }}</dt>
              <dd>{{ f.services.map(s=>t(s)).join(', ')||t('Belirtilmedi') }}</dd>
              <dt>{{ t('Markalar') }}</dt>
              <dd>{{ f.brands.join(', ')||t('Belirtilmedi') }}</dd>
              <dt>{{ t('Kartla ödeme') }}</dt>
              <dd>{{ fact(f.card) }}</dd>
              <dt>{{ t('WC') }}</dt>
              <dd>{{ fact(f.wc) }}</dd>
              <dt>{{ t('Çalışma saatleri') }}</dt>
              <dd>{{ f.hours||t('Belirtilmedi') }}</dd>
              <dt>{{ t('İşletme sahipliği') }}</dt>
              <dd>{{ t(f.verified?'Doğrulandı':'Doğrulanmadı') }}</dd>
            </dl>
            <button class="button secondary" :aria-label="t('{0} karşılaştırmadan çıkar',{'0':b.name})" @click="compare(b)">{{ t('Karşılaştırmadan çıkar') }}</button>
          </article>
        </div>
      </template>
    </template>
  </section>
</template>
