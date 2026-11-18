<script setup lang="ts">
import {reactive, watch} from 'vue';
import {ArrowRight} from '@lucide/vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import {vehicleTitle, type MockRecord} from '~/data/mock/garage';
import {parseAmount, parseWhole, type GarageVehicle, type RecordDraft} from '~/lib/v2/garage';

// Add a maintenance / expense record (W11 "Kayıt ekle"). No Figma frame: V2Modal + shared form classes.
// Live (maintenanceSchema): title, note, amount, date (not in the future) and the mileage at the job.
// The model has no record kind; documents need an upload service the web does not have yet.
const props = withDefaults(defineProps<{open: boolean; vehicle: GarageVehicle; today: string; live?: boolean; busy?: boolean; error?: string}>(), {live: false, busy: false, error: ''});
const emit = defineEmits<{close: []; save: [record: RecordDraft]}>();

const form = reactive({title: '', place: '', kind: 'bakim' as MockRecord['kind'], amount: '', date: props.today, document: 'Fatura', mileage: ''});
const errors = reactive({title: '', amount: '', date: '', mileage: ''});

watch(() => props.open, (open) => {
  if (!open) return;
  Object.assign(form, {title: '', place: '', kind: 'bakim', amount: '', date: props.today, document: 'Fatura', mileage: String(props.vehicle.km)});
  Object.assign(errors, {title: '', amount: '', date: '', mileage: ''});
}, {immediate: true});

function save() {
  if (props.busy) return;
  const amount = props.live ? parseAmount(form.amount) : Number(form.amount.replace(/\./g, '').replace(',', '.'));
  const mileage = parseWhole(form.mileage);
  const title = form.title.trim();
  errors.title = !title ? 'Kaydın adını yaz.' : props.live && title.length < 2 ? 'Kayıt adı en az 2 karakter olmalı.' : '';
  errors.amount = form.amount && amount !== null && Number.isFinite(amount) && amount >= 0 && amount <= 10_000_000 ? '' : 'Tutarı TL olarak yaz.';
  errors.date = !form.date ? 'Tarihi seç.' : props.live && form.date > props.today ? 'Gelecek tarihli bir işlem kaydedilemez.' : '';
  errors.mileage = !props.live || (mileage !== null && mileage <= 2_000_000) ? '' : 'İşlemdeki kilometreyi yaz.';
  if (errors.title || errors.amount || errors.date || errors.mileage) return;
  emit('save', {
    vehicleId: props.vehicle.id,
    title,
    place: form.place.trim(),
    kind: form.kind,
    amount: amount ?? 0,
    date: form.date,
    document: form.document,
    mileage: mileage ?? props.vehicle.km,
  });
}
</script>

<template>
  <V2Modal :open="open" title="Kayıt ekle" :subtitle="vehicleTitle(vehicle)" :width="640" @close="emit('close')">
    <form id="record-form" class="body" novalidate @submit.prevent="save">
      <fieldset v-if="!live" class="kind">
        <legend class="field-label">Tür</legend>
        <label class="option"><input v-model="form.kind" type="radio" class="radio" value="bakim">Bakım / onarım</label>
        <label class="option"><input v-model="form.kind" type="radio" class="radio" value="gider">Gider (sigorta, vergi…)</label>
      </fieldset>
      <div class="field">
        <label class="field-label" for="rec-title">Kayıt</label>
        <input id="rec-title" v-model="form.title" class="input" placeholder="Örn. Yağ değişimi" maxlength="120" :aria-invalid="errors.title ? 'true' : undefined">
        <p v-if="errors.title" class="err" role="alert">{{ errors.title }}</p>
      </div>
      <div class="field">
        <label class="field-label" for="rec-place">Servis veya not (isteğe bağlı)</label>
        <input id="rec-place" v-model="form.place" class="input" placeholder="Örn. Örnek Teknik Garaj" maxlength="1000">
      </div>
      <div class="three">
        <div class="field">
          <label class="field-label" for="rec-amount">Tutar (₺)</label>
          <input id="rec-amount" v-model="form.amount" class="input" inputmode="decimal" placeholder="2.400" :aria-invalid="errors.amount ? 'true' : undefined">
          <p v-if="errors.amount" class="err" role="alert">{{ errors.amount }}</p>
        </div>
        <div class="field">
          <label class="field-label" for="rec-date">Tarih</label>
          <input id="rec-date" v-model="form.date" class="input" type="date" :max="live ? today : undefined" :aria-invalid="errors.date ? 'true' : undefined">
          <p v-if="errors.date" class="err" role="alert">{{ errors.date }}</p>
        </div>
        <div v-if="live" class="field">
          <label class="field-label" for="rec-km">Kilometre</label>
          <input id="rec-km" v-model="form.mileage" class="input" inputmode="numeric" placeholder="86400" :aria-invalid="errors.mileage ? 'true' : undefined">
          <p v-if="errors.mileage" class="err" role="alert">{{ errors.mileage }}</p>
        </div>
        <div v-else class="field">
          <label class="field-label" for="rec-doc">Belge</label>
          <select id="rec-doc" v-model="form.document" class="select">
            <option>Fatura</option><option>Poliçe</option><option>Rapor</option><option>Yok</option>
          </select>
        </div>
      </div>
      <p v-if="live" class="hint">Belge ve fotoğraf ekleme web’de henüz yok; kayıt belgesiz saklanır.</p>
      <p v-else class="hint">Belge dosyası bu önizlemede yüklenmez; yalnız etiketi kaydedilir.</p>
      <p v-if="error" class="err form-err" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="emit('close')">Vazgeç</button>
      <button type="submit" form="record-form" class="btn btn-primary" :disabled="busy">{{ busy ? 'Kaydediliyor…' : 'Kaydet' }}<ArrowRight aria-hidden="true"/></button>
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
.form-err{padding:10px 14px;border-radius:14px;background:var(--orange-100);color:var(--ink-800)}
@media (max-width:600px){.kind,.three{grid-template-columns:minmax(0,1fr)}}
</style>
