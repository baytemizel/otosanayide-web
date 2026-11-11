<script setup lang="ts">
import {computed, ref} from 'vue';
import {cities, categories} from '@otosanayide/core';
import TariffEditor from '~/components/TariffEditor.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {readAdResponse, tariffResponse, tariffSaved} from '~/lib/ads-client';
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
    const d = await readAdResponse(r, raw => tariffResponse.parse(raw));
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
    const d = await readAdResponse(response, raw => tariffSaved.parse(raw));
    loaded.value = {...value, version: d.version};
    success.value = 'Tarife kaydedildi.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="ds-col ds-g16">
    <h2>{{ t('Reklam Tarifeleri') }}</h2>
    <p>{{ t('Tarife yönetimi finans yetkili yöneticilere açıktır. Her değişiklik gerekçesiyle kaydedilir.') }}</p>
    <p v-if="app.demo" class="ds-note info ds-col">{{ t('Örnek alanlar gerçek fiyat değildir. Bu ekranda canlı tarife değiştirilmez.') }}</p>
    <div class="grid three">
      <label class="fld"><span class="ds-label">{{ t('Reklam alanı') }}</span><select class="ds-field" :disabled="saving" :value="market.placement" @change="select({...market,placement:text($event) as Market['placement']})"><option v-for="[id,label] in placements" :key="id" :value="id">{{ t(label) }}</option></select></label>
      <label class="fld"><span class="ds-label">{{ t('İl') }}</span><select class="ds-field" :disabled="saving" :value="market.city" @change="select({...market,city:text($event)})"><option v-for="c in cities" :key="c">{{ c }}</option></select></label>
      <label class="fld"><span class="ds-label">{{ t('Kategori') }}</span><select class="ds-field" :disabled="saving" :value="market.category" @change="select({...market,category:text($event)})"><option v-for="c in categories" :key="c.id" :value="c.id">{{ t(c.name) }}</option></select></label>
    </div>
    <button class="ds-btn s" :disabled="busy||saving" @click="revision++">{{ t('Yenile') }}</button>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <TariffEditor v-else-if="loaded!==undefined" :key="`${marketKey}-${loaded?.version??0}-${revision}`" :market="market" :tariff="loaded" :demo="app.demo" :onSave="saveTariff"/>
    <p v-else-if="!app.user&&!app.demo">{{ t('Giriş yap') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
    <p v-if="success" role="status">{{ t(success) }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
.all{grid-column:1/-1}
@media(max-width:760px){.grid{grid-template-columns:minmax(0,1fr)}}
.three{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:760px){.three{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
