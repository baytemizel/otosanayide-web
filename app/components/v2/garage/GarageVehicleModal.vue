<script setup lang="ts">
import {reactive, watch} from 'vue';
import {ArrowRight} from '@lucide/vue';
import {brands} from '@otosanayide/core';
import V2Modal from '~/components/v2/V2Modal.vue';
import {liveFuels, parseWhole, type GarageVehicle, type VehicleDraft} from '~/lib/v2/garage';

// Add / edit vehicle (W11 "Araç ekle" and "Düzenle"). No Figma frame: V2Modal + shared form classes.
// Live: the account model (vehicleSchema) has brand and model apart, its own fuel list and an optional
// inspection date; it stores no plate or transmission, so those fields are not shown.
const props = withDefaults(defineProps<{open: boolean; vehicle?: GarageVehicle | null; live?: boolean; busy?: boolean; error?: string}>(), {vehicle: null, live: false, busy: false, error: ''});
const emit = defineEmits<{close: []; save: [vehicle: VehicleDraft]}>();

const form = reactive({brand: '', model: '', year: '', km: '', fuel: 'Benzin', transmission: 'Manuel', plate: '', plateHidden: true, inspection: ''});
const errors = reactive({brand: '', model: '', year: '', km: ''});
const maxYear = props.live ? new Date().getFullYear() + 1 : 2027;

watch(() => props.open, (open) => {
  if (!open) return;
  const v = props.vehicle;
  const source = v?.source;
  Object.assign(form, {
    brand: source?.brand ?? '',
    model: source ? source.model : v?.model ?? '', year: v ? String(v.year) : '', km: v ? String(v.km) : '',
    fuel: v?.fuel ?? 'Benzin', transmission: v?.transmission || 'Manuel', plate: v?.plate ?? '', plateHidden: v?.plateHidden ?? true,
    inspection: v?.inspectionDueDate ?? '',
  });
  Object.assign(errors, {brand: '', model: '', year: '', km: ''});
}, {immediate: true});

function save() {
  if (props.busy) return;
  const year = Number(form.year);
  const km = props.live ? parseWhole(form.km) : Number(form.km.replace(/\D/g, '') || 0);
  errors.brand = props.live && !form.brand.trim() ? 'Markayı seç.' : '';
  errors.model = form.model.trim() ? '' : props.live ? 'Modeli yaz.' : 'Marka ve modeli yaz.';
  errors.year = Number.isInteger(year) && year >= 1950 && year <= maxYear ? '' : `1950 ile ${maxYear} arasında bir yıl yaz.`;
  errors.km = km !== null && km >= 0 && km <= 2_000_000 ? '' : 'Kilometreyi kontrol et.';
  if (errors.brand || errors.model || errors.year || errors.km) return;
  emit('save', {
    id: props.vehicle?.id, brand: form.brand.trim(), model: form.model.trim(), year, km: km ?? 0, fuel: form.fuel, transmission: form.transmission,
    plate: form.plate.trim() ? form.plate.trim().toLocaleUpperCase('tr-TR') : null, plateHidden: form.plateHidden, inspectionDueDate: form.inspection,
  });
}
</script>

<template>
  <V2Modal :open="open" :title="vehicle ? 'Aracı düzenle' : 'Araç ekle'" :subtitle="live ? 'Plaka ve şasi numarası istemiyoruz.' : 'VIN ve plaka zorunlu değil.'" :width="640" @close="emit('close')">
    <form id="vehicle-form" class="body" novalidate @submit.prevent="save">
      <div v-if="live" class="two">
        <div class="field">
          <label class="field-label" for="veh-brand">Marka</label>
          <select id="veh-brand" v-model="form.brand" class="select" :aria-invalid="errors.brand ? 'true' : undefined">
            <option value="">Marka seç</option>
            <option v-if="form.brand && !brands.includes(form.brand)" :value="form.brand">{{ form.brand }}</option>
            <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
          </select>
          <p v-if="errors.brand" class="err" role="alert">{{ errors.brand }}</p>
        </div>
        <div class="field">
          <label class="field-label" for="veh-model">Model</label>
          <input id="veh-model" v-model="form.model" class="input" placeholder="Örn. Clio" maxlength="80" :aria-invalid="errors.model ? 'true' : undefined">
          <p v-if="errors.model" class="err" role="alert">{{ errors.model }}</p>
        </div>
      </div>
      <div v-else class="field">
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
          <label class="field-label" for="veh-km">{{ live ? 'Güncel kilometre' : 'Kilometre' }}</label>
          <input id="veh-km" v-model="form.km" class="input" inputmode="numeric" placeholder="86400" :aria-invalid="errors.km ? 'true' : undefined">
          <p v-if="errors.km" class="err" role="alert">{{ errors.km }}</p>
        </div>
      </div>
      <div v-if="live" class="two">
        <div class="field">
          <label class="field-label" for="veh-fuel">Yakıt</label>
          <select id="veh-fuel" v-model="form.fuel" class="select">
            <option v-for="f in liveFuels" :key="f">{{ f }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="veh-inspection">Muayene tarihi (isteğe bağlı)</label>
          <input id="veh-inspection" v-model="form.inspection" class="input" type="date">
        </div>
      </div>
      <template v-else>
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
      </template>
      <p v-if="error" class="err form-err" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="emit('close')">Vazgeç</button>
      <button type="submit" form="vehicle-form" class="btn btn-primary" :disabled="busy">{{ busy ? 'Kaydediliyor…' : 'Kaydet' }}<ArrowRight aria-hidden="true"/></button>
    </template>
  </V2Modal>
</template>

<style scoped>
.body{display:flex;flex-direction:column;gap:20px;min-width:0}
.body :is(input,select){min-width:0}
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.err{font-size:13px;font-weight:600;color:var(--red-500)}
.form-err{padding:10px 14px;border-radius:14px;background:var(--orange-100);color:var(--ink-800)}
@media (max-width:600px){.two{grid-template-columns:minmax(0,1fr)}}
</style>
