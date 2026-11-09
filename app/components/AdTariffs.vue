<script setup lang="ts">
import {computed, ref} from 'vue';
import {cities, categories} from '@otosanayide/core';
import TariffEditor from '~/components/TariffEditor.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {Market} from '~/lib/ad-tariffs-helpers';
import type {AdTariff} from '@otosanayide/core/ad-inventory';

const {t} = useLocale();
const app = useApp();
const market = ref<Market>({placement: 'search', city: 'İstanbul', category: 'mechanical'});
const loaded = ref<AdTariff | null | undefined>(undefined);
const revision = ref(0);
const busy = ref(false);
const error = ref('');
const success = ref('');
const saving = ref(false);
const marketKey = computed(() => JSON.stringify(market.value));
const placements = Object.entries({search: 'Arama sonuçları', category: 'Kategori', home: 'Ana sayfa'});
const text = (e: Event) => (e.target as HTMLSelectElement).value;

useClientEffect(() => [marketKey.value, app.user, app.demo, revision.value], () => {
  let stopped = false;
  loaded.value = undefined;
  error.value = '';
  success.value = '';
  if (app.demo) {
    loaded.value = null;
    return;
  }
  const user = app.user;
  if (!user) return;
  busy.value = true;
  const current = market.value;
  user.getIdToken().then(token => apiFetch('/api/admin/ad-tariffs?' + new URLSearchParams(current), {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (!stopped) loaded.value = d.tariff;
  }).catch(e => {
    if (!stopped) error.value = e.message;
  }).finally(() => {
    if (!stopped) busy.value = false;
  });
  return () => {
    stopped = true;
  };
});

function select(v: Market) {
  loaded.value = undefined;
  market.value = v;
}

async function saveTariff(value: AdTariff, reason: string) {
  saving.value = true;
  try {
    const {version, ...v} = value;
    const response = await apiFetch('/api/admin/ad-tariffs', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user?.getIdToken()}`}, body: JSON.stringify({version, value: v, reason})});
    const d = await response.json();
    if (!response.ok) throw Error(d.error);
    loaded.value = {...value, version: d.version};
    success.value = 'Tarife kaydedildi.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="stack">
    <h2>{{ t('Reklam Tarifeleri') }}</h2>
    <p>{{ t('Tarife yönetimi finans yetkili yöneticilere açıktır. Her değişiklik gerekçesiyle kaydedilir.') }}</p>
    <p v-if="app.demo" class="notice">{{ t('Örnek alanlar gerçek fiyat değildir. Bu ekranda canlı tarife değiştirilmez.') }}</p>
    <div class="form-grid">
      <label>{{ t('Reklam alanı') }}<select :disabled="saving" :value="market.placement" @change="select({...market,placement:text($event) as Market['placement']})"><option v-for="[id,label] in placements" :key="id" :value="id">{{ t(label) }}</option></select></label>
      <label>{{ t('İl') }}<select :disabled="saving" :value="market.city" @change="select({...market,city:text($event)})"><option v-for="c in cities" :key="c">{{ c }}</option></select></label>
      <label>{{ t('Kategori') }}<select :disabled="saving" :value="market.category" @change="select({...market,category:text($event)})"><option v-for="c in categories" :key="c.id" :value="c.id">{{ t(c.name) }}</option></select></label>
    </div>
    <button class="button secondary" :disabled="busy||saving" @click="revision++">{{ t('Yenile') }}</button>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <TariffEditor v-else-if="loaded!==undefined" :key="`${marketKey}-${loaded?.version??0}-${revision}`" :market="market" :tariff="loaded" :demo="app.demo" :onSave="saveTariff"/>
    <p v-else-if="!app.user&&!app.demo">{{ t('Giriş yap') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <p v-if="success" role="status">{{ t(success) }}</p>
  </section>
</template>
