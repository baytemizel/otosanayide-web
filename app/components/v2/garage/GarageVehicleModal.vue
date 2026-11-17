<script setup lang="ts">
import {reactive, watch} from 'vue';
import {ArrowRight} from '@lucide/vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import type {MockVehicle} from '~/data/mock/garage';

// Add / edit vehicle (W11 "Araç ekle" and "Düzenle"). No Figma frame: V2Modal + shared form classes.
const props = defineProps<{open: boolean; vehicle?: MockVehicle | null}>();
const emit = defineEmits<{close: []; save: [vehicle: Omit<MockVehicle, 'id'> & {id?: string}]}>();

const form = reactive({model: '', year: '', km: '', fuel: 'Benzin', transmission: 'Manuel', plate: '', plateHidden: true});
const errors = reactive({model: '', year: '', km: ''});

watch(() => props.open, (open) => {
  if (!open) return;
  const v = props.vehicle;
  Object.assign(form, {
    model: v?.model ?? '', year: v ? String(v.year) : '', km: v ? String(v.km) : '',
    fuel: v?.fuel ?? 'Benzin', transmission: v?.transmission ?? 'Manuel', plate: v?.plate ?? '', plateHidden: v?.plateHidden ?? true,
  });
  Object.assign(errors, {model: '', year: '', km: ''});
}, {immediate: true});

function save() {
  const year = Number(form.year);
  const km = Number(form.km.replace(/\D/g, '') || 0);
  errors.model = form.model.trim() ? '' : 'Marka ve modeli yaz.';
  errors.year = Number.isInteger(year) && year >= 1950 && year <= 2027 ? '' : '1950 ile 2027 arasında bir yıl yaz.';
  errors.km = km >= 0 && km < 2_000_000 ? '' : 'Kilometreyi kontrol et.';
  if (errors.model || errors.year || errors.km) return;
  emit('save', {
    id: props.vehicle?.id, model: form.model.trim(), year, km, fuel: form.fuel, transmission: form.transmission,
    plate: form.plate.trim() ? form.plate.trim().toLocaleUpperCase('tr-TR') : null, plateHidden: form.plateHidden,
  });
}
</script>

<template>
  <V2Modal :open="open" :title="vehicle ? 'Aracı düzenle' : 'Araç ekle'" subtitle="VIN ve plaka zorunlu değil." :width="640" @close="emit('close')">
    <form id="vehicle-form" class="body" novalidate @submit.prevent="save">
      <div class="field">
        <label class="field-label" for="veh-model">Marka ve model</label>
        <input id="veh-model" v-model="form.model" class="input" placeholder="Örn. Renault Clio" :aria-invalid="errors.model ? 'true' : undefined">
        <p v-if="errors.model" class="err" role="alert">{{ errors.model }}</p>
      </div>
      <div class="two">
        <div class="field">
          <label class="field-label" for="veh-year">Model yılı</label>
          <input id="veh-year" v-model="form.year" class="input" inputmode="numeric" placeholder="2019" :aria-invalid="errors.year ? 'true' : undefined">
          <p v-if="errors.year" class="err" role="alert">{{ errors.year }}</p>
        </div>
        <div class="field">
          <label class="field-label" for="veh-km">Kilometre</label>
          <input id="veh-km" v-model="form.km" class="input" inputmode="numeric" placeholder="86400" :aria-invalid="errors.km ? 'true' : undefined">
          <p v-if="errors.km" class="err" role="alert">{{ errors.km }}</p>
        </div>
      </div>
      <div class="two">
        <div class="field">
          <label class="field-label" for="veh-fuel">Yakıt</label>
          <select id="veh-fuel" v-model="form.fuel" class="select">
            <option>Benzin</option><option>Dizel</option><option>LPG</option><option>Hibrit</option><option>Elektrik</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="veh-gear">Vites</label>
          <select id="veh-gear" v-model="form.transmission" class="select">
            <option>Manuel</option><option>Otomatik</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="veh-plate">Plaka (isteğe bağlı)</label>
        <input id="veh-plate" v-model="form.plate" class="input" placeholder="34 ÖRN 001" autocomplete="off">
      </div>
      <label class="option"><input v-model="form.plateHidden" type="checkbox" class="checkbox">Plakayı listelerde gizle</label>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="emit('close')">Vazgeç</button>
      <button type="submit" form="vehicle-form" class="btn btn-primary">Kaydet<ArrowRight aria-hidden="true"/></button>
    </template>
  </V2Modal>
</template>

<style scoped>
.body{display:flex;flex-direction:column;gap:20px;min-width:0}
.body :is(input,select){min-width:0}
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.err{font-size:13px;font-weight:600;color:var(--red-500)}
@media (max-width:600px){.two{grid-template-columns:minmax(0,1fr)}}
</style>
