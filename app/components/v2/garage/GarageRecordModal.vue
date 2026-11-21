<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue';
import {ArrowRight, Trash2} from '@lucide/vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import V2Select from '~/components/v2/V2Select.vue';
import {vehicleTitle, type MockRecord} from '~/data/mock/garage';
import {documentOptions, parseAmount, parseWhole, recordTypes, type DocumentKind, type GarageRecord, type GarageVehicle, type MaintenanceType, type RecordDraft} from '~/lib/v2/garage';

// Add a maintenance / expense record (W11 "Kayıt ekle"). No Figma frame: V2Modal + shared form classes.
// Live (maintenanceSchema, API v2): type, title, service name (providerName), note, amount, date (not in
// the future), the mileage at the job and a document label (documentKind; no file upload on the web).
// Live only: with `record` the modal edits that record (PATCH) and offers delete (DELETE /api/me); the
// W11 design has no edit/delete, so this reuses the same modal with a "Sil" footer action.
const props = withDefaults(defineProps<{open: boolean; vehicle: GarageVehicle; today: string; live?: boolean; busy?: boolean; error?: string; record?: GarageRecord | null}>(), {live: false, busy: false, error: '', record: null});
const emit = defineEmits<{close: []; save: [record: RecordDraft]; delete: [id: string]}>();

const form = reactive({
  title: '', place: '', kind: 'bakim' as MockRecord['kind'], amount: '', date: props.today, document: 'Fatura', mileage: '',
  type: 'periodic' as MaintenanceType, documentKind: '' as DocumentKind | '', note: '',
});
const errors = reactive({title: '', amount: '', date: '', mileage: ''});
const confirming = ref(false);
const editing = computed(() => props.live && !!props.record?.source);

const amountText = (value: number) => value.toLocaleString('tr-TR', {maximumFractionDigits: 2});

watch(() => props.open, (open) => {
  if (!open) return;
  confirming.value = false;
  const source = props.live ? props.record?.source : undefined;
  if (source) {
    Object.assign(form, {
      title: source.title, place: source.providerName ?? '', kind: 'bakim', amount: amountText(source.amount), date: source.date, document: 'Fatura',
      mileage: String(source.mileage), type: source.type ?? 'other', documentKind: source.documentKind ?? '', note: source.note ?? '',
    });
  } else {
    Object.assign(form, {title: '', place: '', kind: 'bakim', amount: '', date: props.today, document: 'Fatura', mileage: String(props.vehicle.km), type: 'periodic', documentKind: '', note: ''});
  }
  lastType = form.type;
  Object.assign(errors, {title: '', amount: '', date: '', mileage: ''});
}, {immediate: true});

const typeLabel = (value: MaintenanceType) => recordTypes.find((t) => t.value === value)?.label ?? '';
/** Live: picking a type fills an empty title (or one that still is the previous type's label). */
let lastType: MaintenanceType = 'periodic';
function pickType(next: MaintenanceType) {
  if (!form.title.trim() || form.title === typeLabel(lastType)) form.title = typeLabel(next);
  lastType = next;
}

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
    ...(editing.value ? {id: props.record!.id} : {}),
    vehicleId: editing.value ? props.record!.vehicleId : props.vehicle.id,
    title,
    place: form.place.trim(),
    kind: form.kind,
    amount: amount ?? 0,
    date: form.date,
    document: form.document,
    mileage: mileage ?? props.vehicle.km,
    ...(props.live ? {type: form.type, documentKind: form.documentKind, note: form.note.trim()} : {}),
  });
}
</script>

<template>
  <V2Modal :open="open" :title="editing ? 'Kaydı düzenle' : 'Kayıt ekle'" :subtitle="vehicleTitle(vehicle)" :width="640" @close="emit('close')">
    <form id="record-form" class="body" novalidate @submit.prevent="save">
      <div v-if="live" class="two">
        <div class="field">
          <label class="field-label" for="rec-type">Tür</label>
          <V2Select id="rec-type" v-model="form.type" :options="recordTypes.map((t) => ({value: t.value, label: t.label}))" @change="pickType"/>
        </div>
        <div class="field">
          <label class="field-label" for="rec-doc">Belge</label>
          <V2Select id="rec-doc" v-model="form.documentKind" :options="documentOptions"/>
        </div>
      </div>
      <fieldset v-else class="kind">
        <legend class="field-label">Tür</legend>
        <label class="option"><input v-model="form.kind" type="radio" class="radio" value="bakim">Bakım / onarım</label>
        <label class="option"><input v-model="form.kind" type="radio" class="radio" value="gider">Gider (sigorta, vergi…)</label>
      </fieldset>
      <div class="field">
        <label class="field-label" for="rec-title">Kayıt</label>
        <input id="rec-title" v-model="form.title" class="input" placeholder="Örn. Yağ değişimi" maxlength="120" :aria-invalid="errors.title ? 'true' : undefined">
        <p v-if="errors.title" class="err" role="alert">{{ errors.title }}</p>
      </div>
      <div v-if="live" class="two">
        <div class="field">
          <label class="field-label" for="rec-place">Servis (isteğe bağlı)</label>
          <input id="rec-place" v-model="form.place" class="input" placeholder="Örn. Örnek Teknik Garaj" maxlength="120">
        </div>
        <div class="field">
          <label class="field-label" for="rec-note">Not (isteğe bağlı)</label>
          <input id="rec-note" v-model="form.note" class="input" placeholder="Örn. Filtreler değişti" maxlength="1000">
        </div>
      </div>
      <div v-else class="field">
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
          <V2Select id="rec-doc" v-model="form.document" :options="['Fatura', 'Poliçe', 'Rapor', 'Yok']"/>
        </div>
      </div>
      <p v-if="live" class="hint">Belge türü yalnız etiket olarak kaydedilir; dosya ve fotoğraf ekleme web’de henüz yok.</p>
      <p v-else class="hint">Belge dosyası bu önizlemede yüklenmez; yalnız etiketi kaydedilir.</p>
      <p v-if="error" class="err form-err" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <template v-if="editing && confirming">
        <p class="confirm t-body-sm" role="alert">Bu kayıt silinsin mi? Geri alınamaz.</p>
        <button type="button" class="btn btn-outline" :disabled="busy" @click="confirming = false">Vazgeç</button>
        <button type="button" class="btn btn-dark" :disabled="busy" @click="emit('delete', record!.id)">{{ busy ? 'Siliniyor…' : 'Evet, sil' }}</button>
      </template>
      <template v-else>
        <button v-if="editing" type="button" class="btn btn-ghost delete" :disabled="busy" @click="confirming = true"><Trash2 aria-hidden="true"/>Sil</button>
        <button type="button" class="btn btn-outline" @click="emit('close')">Vazgeç</button>
        <button type="submit" form="record-form" class="btn btn-primary" :disabled="busy">{{ busy ? 'Kaydediliyor…' : 'Kaydet' }}<ArrowRight aria-hidden="true"/></button>
      </template>
    </template>
  </V2Modal>
</template>

<style scoped>
.body{display:flex;flex-direction:column;gap:20px;min-width:0}
.body :is(input,select){min-width:0}
.kind{border:0;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.kind legend{grid-column:1/-1;padding:0;margin-bottom:8px}
.two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.err{font-size:13px;font-weight:600;color:var(--red-500)}
.form-err{padding:10px 14px;border-radius:14px;background:var(--orange-100);color:var(--ink-800)}
.delete{margin-right:auto;color:var(--red-500)}
.confirm{margin-right:auto;align-self:center;font-weight:600;color:var(--ink-800)}
@media (max-width:600px){.kind,.two,.three{grid-template-columns:minmax(0,1fr)}}
</style>
