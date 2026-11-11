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
  <section class="ds-card ds-pad ds-col ds-g12">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <div class="ds-col ds-g4 ds-f1">
        <h2 class="ds-row ds-g8 title"><Gauge :size="18"/>{{ i18nT("Güncel kilometre") }}</h2>
        <p class="ds-xs ds-muted">{{ vehicle.brand }} {{ vehicle.model }}{{ i18nT(" · Son kaydettiğin değer") }}</p>
      </div>
      <strong v-if="!editing" class="value">{{ vehicle.mileage.toLocaleString(i18nLocaleTag) }} <span class="ds-small ds-muted">{{ i18nT("km") }}</span></strong>
      <button v-if="!editing" type="button" class="ds-btn s sm" @click="editing=true"><Pencil :size="15"/>{{ i18nT("Kilometreyi güncelle") }}</button>
    </div>
    <form v-if="editing" @submit="submit" class="ds-col ds-g12">
      <label class="f"><span class="ds-label">{{ i18nT("Yeni kilometre") }}</span><input class="ds-field" v-autofocus name="mileage" type="number" min="0" max="2000000" step="1" required v-default-value="vehicle.mileage"/></label>
      <p class="ds-xs ds-muted">{{ i18nT("Bu değer bakım geçmişindeki kilometreleri değiştirmez. Yanlış girilmiş bir değeri düzeltirken daha düşük kilometre de kaydedebilirsin.") }}</p>
      <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
      <div class="ds-row ds-g10 ds-wrap"><button class="ds-btn p" :disabled="busy"><Check :size="16"/>{{ i18nT("Kaydet") }}</button><button class="ds-btn s" type="button" :disabled="busy" @click="cancel"><X :size="16"/>{{ i18nT("Vazgeç") }}</button></div>
    </form>
  </section>
</template>

<style scoped>
p, h2 {margin: 0;}
.title {font-family: Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0; font-size: 16px; line-height: 21.6px;}
.value {font-family: Gelasio, Georgia, serif; font-size: 24px; line-height: 30px;}
.f {display: block;}
.f .ds-label {display: block;}
.f .ds-field {font-size: 15px;}
</style>
