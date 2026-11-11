<script setup lang="ts">
import {ref} from 'vue';
import {categories} from '@otosanayide/core';
import {useLocale} from '~/composables/useLocale';
import type {Market} from '~/lib/ad-tariffs-helpers';
import {adTariffSchema, type AdTariff} from '@otosanayide/core/ad-inventory';
import {decimalHundredths} from '@otosanayide/core/ad-form';

const props = withDefaults(defineProps<{market: Market; tariff: AdTariff | null; demo?: boolean; onSave: (value: AdTariff, reason: string) => Promise<void>}>(), {demo: false});
const {t} = useLocale();
const seven = ref(props.tariff ? (props.tariff.sevenDaysMinor / 100).toFixed(2) : '');
const thirty = ref(props.tariff ? (props.tariff.thirtyDaysMinor / 100).toFixed(2) : '');
const tax = ref(props.tariff ? (props.tariff.taxBasisPoints / 100).toFixed(2) : '');
const capacity = ref(String(props.tariff?.capacity ?? 1));
const enabled = ref(props.tariff?.enabled ?? false);
const reason = ref('');
const busy = ref(false);
const error = ref('');
const success = ref('');
const text = (e: Event) => (e.target as HTMLInputElement).value;

async function save(e: Event) {
  e.preventDefault();
  busy.value = true;
  error.value = '';
  success.value = '';
  try {
    const v = adTariffSchema.parse({...props.market, enabled: enabled.value, capacity: Number(capacity.value), sevenDaysMinor: decimalHundredths(seven.value), thirtyDaysMinor: decimalHundredths(thirty.value), taxBasisPoints: decimalHundredths(tax.value)});
    if (reason.value.trim().length < 10) throw Error('En az 10 karakterlik gerekçe yaz.');
    if (props.demo) {
      success.value = 'Örnek tarife kontrol edildi. Fiyat veya kapasite kaydedilmedi.';
      return;
    }
    await props.onSave({...v, version: props.tariff?.version ?? 0}, reason.value.trim());
    success.value = 'Tarife kaydedildi.';
  } catch (e) {
    error.value = e instanceof Error && !e.message.startsWith('[') ? e.message : 'Tutar, vergi ve kapasite alanlarını kontrol et.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="ds-card ds-pad24 ds-col ds-g16" @submit="save">
    <h2>{{ t('Tarife ve kapasite') }}</h2>
    <p>{{ market.city }} · {{ t(categories.find(c=>c.id===market.category)?.name??market.category) }}</p>
    <p class="ds-note info ds-col">{{ t('Tutarlar vergi hariç TL olarak girilir. Vergi oranını finans sorumlusu belirler. Boş alanlara fiyat varsayılmaz.') }}</p>
    <fieldset :disabled="busy" class="grid fs">
      <label class="fld"><span class="ds-label">{{ t('7 günlük tutar (TL)') }}</span><input class="ds-field" inputmode="decimal" required :value="seven" @input="seven=text($event)"/></label>
      <label class="fld"><span class="ds-label">{{ t('30 günlük tutar (TL)') }}</span><input class="ds-field" inputmode="decimal" required :value="thirty" @input="thirty=text($event)"/></label>
      <label class="fld"><span class="ds-label">{{ t('Vergi oranı (%)') }}</span><input class="ds-field" inputmode="decimal" required :value="tax" @input="tax=text($event)"/></label>
      <label class="fld"><span class="ds-label">{{ t('Günlük ortak kapasite') }}</span><input class="ds-field" type="number" min="1" max="20" step="1" required :value="capacity" @input="capacity=text($event)"/></label>
      <label class="ck all"><input class="ds-check" v-model="enabled" type="checkbox"/><span>{{ t('Yeni rezervasyonlara açık') }}</span></label>
      <label class="fld all"><span class="ds-label">{{ t('Değişiklik gerekçesi') }}</span><textarea class="ds-field" required minlength="10" maxlength="1000" :value="reason" @input="reason=text($event)"/></label>
    </fieldset>
    <p class="ds-small ds-muted">{{ t('Kapasite 7 ve 30 günlük paketler için ortaktır. Kapatma veya kapasite azaltma mevcut süreli rezervasyonları iptal etmez.') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
    <p v-if="success" role="status">{{ t(success) }}</p>
    <button class="ds-btn p" :disabled="busy">{{ t(demo?'Örnek tarifeyi kontrol et':'Tarifeyi kaydet') }}</button>
  </form>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
.all{grid-column:1/-1}
@media(max-width:760px){.grid{grid-template-columns:minmax(0,1fr)}}
.ck{display:flex;gap:8px;align-items:flex-start;font-size:13px}
input.ds-check{min-height:0;padding:0;width:20px}
.fs{border:0;padding:0;margin:0;min-width:0}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
