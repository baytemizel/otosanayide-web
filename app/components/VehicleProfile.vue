<script setup lang="ts">
import {computed, ref, shallowRef} from 'vue';
import {CalendarClock} from '@lucide/vue';
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
  <section class="panel vehicle-profile">
    <div class="row between"><h2>{{ i18nT("Araç profili") }}</h2><button v-if="!readOnly&&!editing" class="button secondary compact" @click="editing=true">{{ i18nT("Profili düzenle") }}</button></div>
    <div class="vehicle-profile-summary">
      <GaragePhoto :id="vehicle.photoId" :alt="`${vehicle.brand} ${vehicle.model}`"/>
      <div>
        <h3>{{ vehicle.brand }} {{ vehicle.model }}</h3>
        <p>{{ vehicle.year }} · {{ i18nT(vehicle.fuel) }}</p>
        <p class="row"><CalendarClock :size="18"/>{{ i18nT("Muayene son geçerlilik tarihi") }}</p>
        <template v-if="due"><strong>{{ new Date(due+'T12:00:00').toLocaleDateString(i18nLocaleTag) }}</strong><p :class="state!.state==='expired'?'error':'muted'">{{ state!.state==='expired'?i18nT("Girdiğin muayene tarihi geçti."):state!.state==='today'?i18nT("Muayene için girdiğin son gün bugün."):i18nT("{0} gün kaldı{1}.",{"0":state!.days,"1":state!.state==='soon'?i18nT(' · Tarih yaklaşıyor'):''}) }}</p></template>
        <p v-else class="muted">{{ i18nT("Henüz tarih eklenmedi.") }}</p>
      </div>
    </div>
    <form v-if="editing" class="stack" @submit="submit">
      <label>{{ i18nT("Muayene son geçerlilik tarihi") }}<input type="date" name="inspectionDueDate" v-default-value="due"/></label>
      <small>{{ i18nT("Tarihi muayene belgenden gir. Boş bırakırsan muayene hatırlatması kaldırılır.") }}</small>
      <label v-if="app.demo&&vehicle.photoId" class="check"><input type="checkbox" v-model="removePhoto"/>{{ i18nT("Mevcut araç fotoğrafını kaldır") }}</label>
      <GarageMediaPicker v-if="app.demo" kind="vehicle" :items="photos" :onChange="setPhotos" :onBusy="setProcessing" :disabled="busy"/>
      <p v-else>{{ i18nT("Özel fotoğraf saklama hizmeti henüz etkin değil.") }}</p>
      <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
      <div class="row"><button class="button primary" :disabled="busy||processing">{{ i18nT("Profili kaydet") }}</button><button type="button" class="button secondary" :disabled="busy||processing" @click="cancel">{{ i18nT("Vazgeç") }}</button></div>
    </form>
    <ReminderActions v-if="!readOnly&&due" :vehicle="vehicle" :reminder="{id:`inspection-${vehicle.id}`,vehicleId:vehicle.id,title:'Araç muayenesi',dueDate:due,advanceDays:7}"/>
    <p class="small muted">{{ i18nT("Muayene tarihi her araca özeldir ve hatırlatmalarda da görünür. Otomatik push/e-posta gönderimi henüz kapalı.") }}{{ app.demo?i18nT(" Fotoğraflar bu tarayıcıda tutulur; bulut yedeği değildir."):'' }}</p>
  </section>
</template>
