<script setup lang="ts">
import {computed, reactive, watch} from 'vue';
import {ArrowRight} from '@lucide/vue';
import {brands} from '@otosanayide/core';
import V2Modal from '~/components/v2/V2Modal.vue';
import V2Select from '~/components/v2/V2Select.vue';
import {useLocale} from '~/composables/useLocale';
import {checkPlate, liveFuels, parseWhole, transmissionOptions, type GarageVehicle, type VehicleDraft} from '~/lib/v2/garage';

// Add / edit vehicle (W11 "Araç ekle" and "Düzenle"). No Figma frame: V2Modal + shared form classes.
// Live: the account model (vehicleSchema, API v2) has brand and model apart, its own fuel list, an optional
// inspection date, transmission and plate. It has no "hide plate" flag, so that checkbox is demo-only.
const props = withDefaults(defineProps<{open: boolean; vehicle?: GarageVehicle | null; live?: boolean; busy?: boolean; error?: string}>(), {vehicle: null, live: false, busy: false, error: ''});
const emit = defineEmits<{close: []; save: [vehicle: VehicleDraft]}>();
const {t} = useLocale();
/** Fuel and gear values are stored as they are (API values / demo labels); only the shown labels are translated. */
const labelled = (values: readonly string[]) => values.map((value) => ({value, label: t(value)}));
const liveFuelOptions = computed(() => labelled(liveFuels));
const gearOptions = computed(() => transmissionOptions.map((o) => ({value: o.value, label: t(o.label)})));
const demoFuelOptions = computed(() => labelled(['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik']));
const demoGearOptions = computed(() => labelled(['Manuel', 'Otomatik']));

const form = reactive({brand: '', model: '', year: '', km: '', fuel: 'Benzin', transmission: 'Manuel', plate: '', plateHidden: true, inspection: ''});
const errors = reactive({brand: '', model: '', year: '', km: '', plate: ''});
const maxYear = props.live ? new Date().getFullYear() + 1 : 2027;

watch(() => props.open, (open) => {
  if (!open) return;
  const v = props.vehicle;
  const source = v?.source;
  Object.assign(form, {
    brand: source?.brand ?? '',
    model: source ? source.model : v?.model ?? '', year: v ? String(v.year) : '', km: v ? String(v.km) : '',
    fuel: v?.fuel ?? 'Benzin', plate: v?.plate ?? '', plateHidden: v?.plateHidden ?? true,
    // Live: the API value ('' = not given); demo: the label.
    transmission: props.live ? source?.transmission ?? '' : v?.transmission || 'Manuel',
    inspection: v?.inspectionDueDate ?? '',
  });
  Object.assign(errors, {brand: '', model: '', year: '', km: '', plate: ''});
}, {immediate: true});

function save() {
  if (props.busy) return;
  const year = Number(form.year);
  const km = props.live ? parseWhole(form.km) : Number(form.km.replace(/\D/g, '') || 0);
  errors.brand = props.live && !form.brand.trim() ? t('Markayı seç.') : '';
  errors.model = form.model.trim() ? '' : props.live ? t('Modeli yaz.') : t('Marka ve modeli yaz.');
  errors.year = Number.isInteger(year) && year >= 1950 && year <= maxYear ? '' : t('1950 ile {max} arasında bir yıl yaz.', {max: maxYear});
  errors.km = km !== null && km >= 0 && km <= 2_000_000 ? '' : t('Kilometreyi kontrol et.');
  const plate = props.live ? checkPlate(form.plate) : {plate: form.plate.trim() ? form.plate.trim().toLocaleUpperCase('tr-TR') : null, error: ''};
  errors.plate = t(plate.error);
  if (errors.brand || errors.model || errors.year || errors.km || errors.plate) return;
  emit('save', {
    id: props.vehicle?.id, brand: form.brand.trim(), model: form.model.trim(), year, km: km ?? 0, fuel: form.fuel, transmission: form.transmission,
    plate: plate.plate, plateHidden: form.plateHidden, inspectionDueDate: form.inspection,
  });
}
</script>

<template>
  <V2Modal :open="open" :title="vehicle ? t('Aracı düzenle') : t('Araç ekle')" :subtitle="live ? t('Plaka zorunlu değil; şasi numarası istemiyoruz.') : t('VIN ve plaka zorunlu değil.')" :width="640" @close="emit('close')">
    <form id="vehicle-form" class="body" novalidate @submit.prevent="save">
      <div v-if="live" class="two">
        <div class="field">
          <label class="field-label" for="veh-brand">{{ t('Marka') }}</label>
          <V2Select id="veh-brand" v-model="form.brand" :options="form.brand && !brands.includes(form.brand) ? [form.brand, ...brands] : brands" :placeholder="t('Marka seç')" :invalid="!!errors.brand"/>
          <p v-if="errors.brand" class="err" role="alert">{{ errors.brand }}</p>
        </div>
        <div class="field">
          <label class="field-label" for="veh-model">{{ t('Model') }}</label>
          <input id="veh-model" v-model="form.model" class="input" :placeholder="t('Örn. Clio')" maxlength="80" :aria-invalid="errors.model ? 'true' : undefined">
          <p v-if="errors.model" class="err" role="alert">{{ errors.model }}</p>
        </div>
      </div>
      <div v-else class="field">
        <label class="field-label" for="veh-model">{{ t('Marka ve model') }}</label>
        <input id="veh-model" v-model="form.model" class="input" :placeholder="t('Örn. Renault Clio')" :aria-invalid="errors.model ? 'true' : undefined">
        <p v-if="errors.model" class="err" role="alert">{{ errors.model }}</p>
      </div>
      <div class="two">
        <div class="field">
          <label class="field-label" for="veh-year">{{ t('Model yılı') }}</label>
          <input id="veh-year" v-model="form.year" class="input" inputmode="numeric" placeholder="2019" :aria-invalid="errors.year ? 'true' : undefined">
          <p v-if="errors.year" class="err" role="alert">{{ errors.year }}</p>
        </div>
        <div class="field">
          <label class="field-label" for="veh-km">{{ live ? t('Güncel kilometre') : t('Kilometre') }}</label>
          <input id="veh-km" v-model="form.km" class="input" inputmode="numeric" placeholder="86400" :aria-invalid="errors.km ? 'true' : undefined">
          <p v-if="errors.km" class="err" role="alert">{{ errors.km }}</p>
        </div>
      </div>
      <template v-if="live">
        <div class="two">
          <div class="field">
            <label class="field-label" for="veh-fuel">{{ t('Yakıt') }}</label>
            <V2Select id="veh-fuel" v-model="form.fuel" :options="liveFuelOptions"/>
          </div>
          <div class="field">
            <label class="field-label" for="veh-gear">{{ t('Vites (isteğe bağlı)') }}</label>
            <V2Select id="veh-gear" v-model="form.transmission" :options="gearOptions" :placeholder="t('Seç')"/>
          </div>
        </div>
        <div class="two">
          <div class="field">
            <label class="field-label" for="veh-plate">{{ t('Plaka (isteğe bağlı)') }}</label>
            <input id="veh-plate" v-model="form.plate" class="input" placeholder="34 ABC 123" maxlength="40" autocomplete="off" :aria-invalid="errors.plate ? 'true' : undefined">
            <p v-if="errors.plate" class="err" role="alert">{{ errors.plate }}</p>
          </div>
          <div class="field">
            <label class="field-label" for="veh-inspection">{{ t('Muayene tarihi (isteğe bağlı)') }}</label>
            <input id="veh-inspection" v-model="form.inspection" class="input" type="date">
          </div>
        </div>
        <p class="hint">{{ t('Plaka hatırlatma bildirimlerinde yer almaz.') }}</p>
      </template>
      <template v-else>
        <div class="two">
          <div class="field">
            <label class="field-label" for="veh-fuel">{{ t('Yakıt') }}</label>
            <V2Select id="veh-fuel" v-model="form.fuel" :options="demoFuelOptions"/>
          </div>
          <div class="field">
            <label class="field-label" for="veh-gear">{{ t('Vites') }}</label>
            <V2Select id="veh-gear" v-model="form.transmission" :options="demoGearOptions"/>
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="veh-plate">{{ t('Plaka (isteğe bağlı)') }}</label>
          <input id="veh-plate" v-model="form.plate" class="input" placeholder="34 ÖRN 001" autocomplete="off">
        </div>
        <label class="option"><input v-model="form.plateHidden" type="checkbox" class="checkbox">{{ t('Plakayı listelerde gizle') }}</label>
      </template>
      <p v-if="error" class="err form-err" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="emit('close')">{{ t('Vazgeç') }}</button>
      <button type="submit" form="vehicle-form" class="btn btn-primary" :disabled="busy">{{ busy ? t('Kaydediliyor…') : t('Kaydet') }}<ArrowRight aria-hidden="true"/></button>
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
