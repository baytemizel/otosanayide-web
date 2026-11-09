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
  <form class="panel stack" @submit="save">
    <h2>{{ t('Tarife ve kapasite') }}</h2>
    <p>{{ market.city }} · {{ t(categories.find(c=>c.id===market.category)?.name??market.category) }}</p>
    <p class="notice">{{ t('Tutarlar vergi hariç TL olarak girilir. Vergi oranını finans sorumlusu belirler. Boş alanlara fiyat varsayılmaz.') }}</p>
    <fieldset :disabled="busy" class="form-grid" :style="{border:0,padding:0,minWidth:0}">
      <label>{{ t('7 günlük tutar (TL)') }}<input inputmode="decimal" required :value="seven" @input="seven=text($event)"/></label>
      <label>{{ t('30 günlük tutar (TL)') }}<input inputmode="decimal" required :value="thirty" @input="thirty=text($event)"/></label>
      <label>{{ t('Vergi oranı (%)') }}<input inputmode="decimal" required :value="tax" @input="tax=text($event)"/></label>
      <label>{{ t('Günlük ortak kapasite') }}<input type="number" min="1" max="20" step="1" required :value="capacity" @input="capacity=text($event)"/></label>
      <label class="row span-all"><input v-model="enabled" type="checkbox"/>{{ t('Yeni rezervasyonlara açık') }}</label>
      <label class="span-all">{{ t('Değişiklik gerekçesi') }}<textarea required minlength="10" maxlength="1000" :value="reason" @input="reason=text($event)"/></label>
    </fieldset>
    <p class="small muted">{{ t('Kapasite 7 ve 30 günlük paketler için ortaktır. Kapatma veya kapasite azaltma mevcut süreli rezervasyonları iptal etmez.') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <p v-if="success" role="status">{{ t(success) }}</p>
    <button class="button primary" :disabled="busy">{{ t(demo?'Örnek tarifeyi kontrol et':'Tarifeyi kaydet') }}</button>
  </form>
</template>
