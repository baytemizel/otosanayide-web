<script setup lang="ts">
import {reactive, watch} from 'vue';
import {ArrowRight} from '@lucide/vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import {mockToday, vehicleTitle, type MockRecord, type MockVehicle} from '~/data/mock/garage';

// Add a maintenance / expense record (W11 "Kayıt ekle"). No Figma frame: V2Modal + shared form classes.
const props = defineProps<{open: boolean; vehicle: MockVehicle}>();
const emit = defineEmits<{close: []; save: [record: Omit<MockRecord, 'id'>]}>();

const today = mockToday.toISOString().slice(0, 10);
const form = reactive({title: '', place: '', kind: 'bakim' as MockRecord['kind'], amount: '', date: today, document: 'Fatura'});
const errors = reactive({title: '', amount: '', date: ''});

watch(() => props.open, (open) => {
  if (!open) return;
  Object.assign(form, {title: '', place: '', kind: 'bakim', amount: '', date: today, document: 'Fatura'});
  Object.assign(errors, {title: '', amount: '', date: ''});
}, {immediate: true});

function save() {
  const amount = Number(form.amount.replace(/\./g, '').replace(',', '.'));
  errors.title = form.title.trim() ? '' : 'Kaydın adını yaz.';
  errors.amount = form.amount && Number.isFinite(amount) && amount >= 0 ? '' : 'Tutarı TL olarak yaz.';
  errors.date = form.date ? '' : 'Tarihi seç.';
  if (errors.title || errors.amount || errors.date) return;
  const km = `${props.vehicle.km.toLocaleString('tr-TR')} km`;
  emit('save', {
    vehicleId: props.vehicle.id,
    title: form.title.trim(),
    detail: form.place.trim() ? `${form.place.trim()} · ${km}` : km,
    kind: form.kind,
    icon: form.kind === 'bakim' ? 'wrench' : 'file',
    document: form.document === 'Yok' ? null : form.document,
    amount: Math.round(amount),
    date: form.date,
  });
}
</script>

<template>
  <V2Modal :open="open" title="Kayıt ekle" :subtitle="vehicleTitle(vehicle)" :width="640" @close="emit('close')">
    <form id="record-form" class="body" novalidate @submit.prevent="save">
      <fieldset class="kind">
        <legend class="field-label">Tür</legend>
        <label class="option"><input v-model="form.kind" type="radio" class="radio" value="bakim">Bakım / onarım</label>
        <label class="option"><input v-model="form.kind" type="radio" class="radio" value="gider">Gider (sigorta, vergi…)</label>
      </fieldset>
      <div class="field">
        <label class="field-label" for="rec-title">Kayıt</label>
        <input id="rec-title" v-model="form.title" class="input" placeholder="Örn. Yağ değişimi" :aria-invalid="errors.title ? 'true' : undefined">
        <p v-if="errors.title" class="err" role="alert">{{ errors.title }}</p>
      </div>
      <div class="field">
        <label class="field-label" for="rec-place">Servis veya not (isteğe bağlı)</label>
        <input id="rec-place" v-model="form.place" class="input" placeholder="Örn. Örnek Teknik Garaj">
      </div>
      <div class="three">
        <div class="field">
          <label class="field-label" for="rec-amount">Tutar (₺)</label>
          <input id="rec-amount" v-model="form.amount" class="input" inputmode="decimal" placeholder="2.400" :aria-invalid="errors.amount ? 'true' : undefined">
          <p v-if="errors.amount" class="err" role="alert">{{ errors.amount }}</p>
        </div>
        <div class="field">
          <label class="field-label" for="rec-date">Tarih</label>
          <input id="rec-date" v-model="form.date" class="input" type="date" :aria-invalid="errors.date ? 'true' : undefined">
          <p v-if="errors.date" class="err" role="alert">{{ errors.date }}</p>
        </div>
        <div class="field">
          <label class="field-label" for="rec-doc">Belge</label>
          <select id="rec-doc" v-model="form.document" class="select">
            <option>Fatura</option><option>Poliçe</option><option>Rapor</option><option>Yok</option>
          </select>
        </div>
      </div>
      <p class="hint">Belge dosyası bu önizlemede yüklenmez; yalnız etiketi kaydedilir.</p>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="emit('close')">Vazgeç</button>
      <button type="submit" form="record-form" class="btn btn-primary">Kaydet<ArrowRight aria-hidden="true"/></button>
    </template>
  </V2Modal>
</template>

<style scoped>
.body{display:flex;flex-direction:column;gap:20px;min-width:0}
.body :is(input,select){min-width:0}
.kind{border:0;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.kind legend{grid-column:1/-1;padding:0;margin-bottom:8px}
.three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.err{font-size:13px;font-weight:600;color:var(--red-500)}
@media (max-width:600px){.kind,.three{grid-template-columns:minmax(0,1fr)}}
</style>
