<script setup lang="ts">
import {computed, ref, shallowRef} from 'vue';
import {CalendarClock, Pencil, Plus} from '@lucide/vue';
import {vehicleSchema, type Vehicle} from '@otosanayide/core';
import {inspectionState} from '@otosanayide/core/garage-media';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {vDefaultValue} from '~/lib/directives';
import {mediaDelete, mediaWrite, type LocalMedia} from '~/lib/garage-media';
import GaragePhoto from '~/components/GaragePhoto.vue';
import GarageMediaPicker from '~/components/GarageMediaPicker.vue';
import ReminderActions from '~/components/ReminderActions.vue';

const props = withDefaults(defineProps<{vehicle: Vehicle; readOnly?: boolean}>(), {readOnly: false});
const {t: i18nT, localeTag: i18nLocaleTag} = useLocale();
const app = useApp();
const removePhoto = ref(false);
const editing = ref(false);
const busy = ref(false);
const processing = ref(false);
// shallowRef: these objects go to IndexedDB, and a reactive proxy cannot be structured-cloned.
const photos = shallowRef<LocalMedia[]>([]);
const error = ref('');
const due = computed(() => props.vehicle.inspectionDueDate);
const state = computed(() => (due.value ? inspectionState(due.value, new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Istanbul'})) : null));

function setPhotos(items: LocalMedia[]) {
  photos.value = items;
}
function setProcessing(value: boolean) {
  processing.value = value;
}

async function submit(e: Event) {
  e.preventDefault();
  const date = String(new FormData(e.currentTarget as HTMLFormElement).get('inspectionDueDate') ?? '');
  busy.value = true;
  error.value = '';
  const vehicle = props.vehicle;
  const photo = photos.value[0];
  let written = false;
  try {
    const value = vehicleSchema.parse({brand: vehicle.brand, model: vehicle.model, year: vehicle.year, fuel: vehicle.fuel, mileage: vehicle.mileage, inspectionDueDate: date || undefined, photoId: photo?.id ?? (removePhoto.value ? undefined : vehicle.photoId)});
    if (photo) {
      await mediaWrite(photo);
      written = true;
    }
    await app.update('vehicles', vehicle.id, value);
    const removing = removePhoto.value;
    editing.value = false;
    photos.value = [];
    removePhoto.value = false;
    if (vehicle.photoId && (photo || removing)) await mediaDelete(vehicle.photoId).catch(() => app.notify('Eski fotoğraf temizlenemedi; yeni kayıt korundu.'));
    app.notify('Araç profili ve muayene takibi güncellendi.');
  } catch (e) {
    if (written && photo) await mediaDelete(photo.id).catch(() => {});
    error.value = e instanceof Error && !e.message.startsWith('[') ? e.message : 'Tarihi kontrol et.';
  } finally {
    busy.value = false;
  }
}

function cancel() {
  editing.value = false;
  photos.value = [];
  removePhoto.value = false;
  error.value = '';
}
</script>

<template>
  <section class="ds-card hero-card" :aria-label="i18nT('Araç profili')">
    <GaragePhoto :id="vehicle.photoId" :alt="`${vehicle.brand} ${vehicle.model}`" variant="hero"/>
    <div class="ds-col ds-g16 body">
      <div class="ds-row ds-sb ds-wrap ds-g16">
        <div class="ds-col ds-g4 ds-f1 head">
          <span class="ds-xs ds-muted">{{ i18nT("Seçili araç") }}</span>
          <h2>{{ vehicle.brand }} {{ vehicle.model }} · {{ vehicle.year }}</h2>
          <p class="ds-small ds-muted">{{ i18nT(vehicle.fuel) }} · {{ vehicle.mileage.toLocaleString(i18nLocaleTag) }}{{ i18nT(" km") }} · {{ i18nT("VIN/plaka zorunlu değil") }}</p>
        </div>
        <div v-if="!readOnly" class="ds-row ds-g10 ds-wrap">
          <button v-if="!editing" type="button" class="ds-btn s" :aria-label="i18nT('Profili düzenle')" @click="editing=true"><Pencil :size="16"/>{{ i18nT("Düzenle") }}</button>
          <a class="ds-btn p" href="#bakim-kaydi"><Plus :size="16"/>{{ i18nT("Kayıt ekle") }}</a>
        </div>
      </div>
      <div class="ds-row ds-g8 ds-wrap inspect">
        <CalendarClock :size="18" class="ds-i"/>
        <span class="ds-small ds-muted">{{ i18nT("Muayene son geçerlilik tarihi") }}</span>
        <template v-if="due"><strong class="ds-small">{{ new Date(due+'T12:00:00').toLocaleDateString(i18nLocaleTag) }}</strong><span :class="`ds-small ${state!.state==='expired'?'ds-red':'ds-muted'}`">{{ state!.state==='expired'?i18nT("Girdiğin muayene tarihi geçti."):state!.state==='today'?i18nT("Muayene için girdiğin son gün bugün."):i18nT("{0} gün kaldı{1}.",{"0":state!.days,"1":state!.state==='soon'?i18nT(' · Tarih yaklaşıyor'):''}) }}</span></template>
        <span v-else class="ds-small ds-muted">{{ i18nT("Henüz tarih eklenmedi.") }}</span>
      </div>
      <form v-if="editing" class="ds-col ds-g12" @submit="submit">
        <div class="ds-divider"></div>
        <label class="f"><span class="ds-label">{{ i18nT("Muayene son geçerlilik tarihi") }}</span><input class="ds-field" type="date" name="inspectionDueDate" v-default-value="due"/></label>
        <small class="ds-xs ds-muted">{{ i18nT("Tarihi muayene belgenden gir. Boş bırakırsan muayene hatırlatması kaldırılır.") }}</small>
        <label v-if="app.demo&&vehicle.photoId" class="ds-row ds-g8 remove"><input class="ds-check" type="checkbox" v-model="removePhoto"/><span class="ds-small">{{ i18nT("Mevcut araç fotoğrafını kaldır") }}</span></label>
        <GarageMediaPicker v-if="app.demo" kind="vehicle" :items="photos" :onChange="setPhotos" :onBusy="setProcessing" :disabled="busy"/>
        <p v-else class="ds-xs ds-muted">{{ i18nT("Özel fotoğraf saklama hizmeti henüz etkin değil.") }}</p>
        <p v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</p>
        <div class="ds-row ds-g10 ds-wrap"><button class="ds-btn p" :disabled="busy||processing">{{ i18nT("Profili kaydet") }}</button><button type="button" class="ds-btn s" :disabled="busy||processing" @click="cancel">{{ i18nT("Vazgeç") }}</button></div>
      </form>
      <ReminderActions v-if="!readOnly&&due" :vehicle="vehicle" :reminder="{id:`inspection-${vehicle.id}`,vehicleId:vehicle.id,title:'Araç muayenesi',dueDate:due,advanceDays:7}"/>
      <p class="ds-xs ds-muted">{{ i18nT("Muayene tarihi her araca özeldir ve hatırlatmalarda da görünür. Otomatik push/e-posta gönderimi henüz kapalı.") }}{{ app.demo?i18nT(" Fotoğraflar bu tarayıcıda tutulur; bulut yedeği değildir."):'' }}</p>
    </div>
  </section>
</template>

<style scoped>
p, h2 {margin: 0;}
.hero-card {overflow: hidden;}
.body {padding: 24px;}
.head {min-width: 220px;}
.head h2 {font-size: 30px; line-height: 33.6px; overflow-wrap: anywhere;}
.inspect {padding: 10px 12px; background: #f7f9fa; border-radius: 10px;}
.f {display: block;}
.f .ds-label {display: block;}
.f .ds-field {font-size: 15px;}
.remove {cursor: pointer;}
input.ds-check {min-height: 0; padding: 0;}
@media (max-width: 480px) {
  .body {padding: 16px;}
  .head {min-width: 0;}
  .head h2 {font-size: 24px; line-height: 28px;}
}
</style>
