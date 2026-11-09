<script setup lang="ts">
import {ref} from 'vue';
import {Check, Gauge, Pencil, X} from '@lucide/vue';
import {vehicleSchema, type Vehicle} from '@otosanayide/core';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {vDefaultValue} from '~/lib/directives';

const props = defineProps<{vehicle: Vehicle}>();
const {t: i18nT, localeTag: i18nLocaleTag} = useLocale();
const app = useApp();
const editing = ref(false);
const busy = ref(false);
const error = ref('');
// React focuses autoFocus inputs on mount; the HTML attribute is ignored for elements inserted after page load.
const vAutofocus = {mounted: (el: HTMLElement) => el.focus()};

async function submit(e: Event) {
  e.preventDefault();
  busy.value = true;
  error.value = '';
  try {
    const vehicle = props.vehicle;
    const value = vehicleSchema.parse({inspectionDueDate: vehicle.inspectionDueDate, photoId: vehicle.photoId, brand: vehicle.brand, model: vehicle.model, year: vehicle.year, fuel: vehicle.fuel, mileage: new FormData(e.currentTarget as HTMLFormElement).get('mileage')});
    await app.update('vehicles', vehicle.id, value);
    editing.value = false;
    app.notify('Kilometre güncellendi. Hatırlatmalar yeni değere göre hesaplanıyor.');
  } catch (e) {
    error.value = e instanceof Error && !e.message.startsWith('[') ? e.message : '0–2.000.000 arasında geçerli bir kilometre gir.';
  } finally {
    busy.value = false;
  }
}

function cancel() {
  editing.value = false;
  error.value = '';
}
</script>

<template>
  <section class="panel mileage-panel">
    <div class="row between">
      <div><h2 class="row"><Gauge :size="24"/>{{ i18nT("Güncel kilometre") }}</h2><p class="muted">{{ vehicle.brand }} {{ vehicle.model }}{{ i18nT(" · Son kaydettiğin değer") }}</p></div>
      <button v-if="!editing" class="button secondary compact" @click="editing=true"><Pencil :size="16"/>{{ i18nT("Kilometreyi güncelle") }}</button>
    </div>
    <form v-if="editing" @submit="submit" class="stack">
      <label>{{ i18nT("Yeni kilometre") }}<input v-autofocus name="mileage" type="number" min="0" max="2000000" step="1" required v-default-value="vehicle.mileage"/></label>
      <p class="small muted">{{ i18nT("Bu değer bakım geçmişindeki kilometreleri değiştirmez. Yanlış girilmiş bir değeri düzeltirken daha düşük kilometre de kaydedebilirsin.") }}</p>
      <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
      <div class="row"><button class="button primary" :disabled="busy"><Check :size="16"/>{{ i18nT("Kaydet") }}</button><button class="button secondary" type="button" :disabled="busy" @click="cancel"><X :size="16"/>{{ i18nT("Vazgeç") }}</button></div>
    </form>
    <strong v-else class="mileage-value">{{ vehicle.mileage.toLocaleString(i18nLocaleTag) }} <span>{{ i18nT("km") }}</span></strong>
  </section>
</template>
