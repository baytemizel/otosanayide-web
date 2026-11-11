<script setup lang="ts">
import {computed, ref, shallowRef} from 'vue';
import {ArrowRight, CarFront, ChevronRight, Plus, Users, Wrench} from '@lucide/vue';
import {brands, maintenanceSchema, vehicleSchema} from '@otosanayide/core';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {vDefaultValue} from '~/lib/directives';
import {mediaDelete, mediaWrite, type LocalMedia} from '~/lib/garage-media';
import SharedGaragePanel from '~/components/SharedGaragePanel.vue';
import VehicleProfile from '~/components/VehicleProfile.vue';
import GaragePhoto from '~/components/GaragePhoto.vue';
import GarageMediaPicker from '~/components/GarageMediaPicker.vue';
import VehicleMileage from '~/components/VehicleMileage.vue';
import ReminderManager from '~/components/ReminderManager.vue';

const {t: i18nT, localeTag: i18nLocaleTag} = useLocale();
const app = useApp();
// shallowRef: these objects go to IndexedDB, and a reactive proxy cannot be structured-cloned.
const photos = shallowRef<LocalMedia[]>([]);
const processing = ref(false);
const showArchived = ref(false);
const vehicles = computed(() => app.data.vehicles.filter(v => !!v.archived === showArchived.value));
const selected = ref('');
const adding = ref(false);
const busy = ref(false);
const error = ref('');
const vehicle = computed(() => vehicles.value.find(v => v.id === selected.value) ?? vehicles.value[0]);
const history = computed(() => app.data.maintenance.filter(m => m.vehicleId === vehicle.value?.id).sort((a, b) => b.date.localeCompare(a.date)));
const today = () => new Date().toISOString().slice(0, 10);
const currentYear = new Date().getFullYear();
const istanbulToday = () => new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Istanbul'});
const nextReminder = computed(() => app.data.reminders.filter(r => r.vehicleId === vehicle.value?.id && !r.completed && r.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0]);
const yearHistory = computed(() => history.value.filter(m => m.date.startsWith(String(currentYear))));
const money = (amount: number) => amount.toLocaleString(i18nLocaleTag.value, {style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2});
const longDate = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString(i18nLocaleTag.value, {day: 'numeric', month: 'long', year: 'numeric'});
const shortDate = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString(i18nLocaleTag.value, {day: '2-digit', month: 'short', year: 'numeric'});
function daysLabel(date: string) {
  const days = Math.round((Date.parse(date) - Date.parse(istanbulToday())) / 86400000);
  return days < 0 ? i18nT('Geçti') : days === 0 ? i18nT('Bugün') : i18nT('{0} gün', {'0': days});
}

function setPhotos(items: LocalMedia[]) {
  photos.value = items;
}
function setProcessing(value: boolean) {
  processing.value = value;
}
function toggleArchived() {
  showArchived.value = !showArchived.value;
  selected.value = '';
}
function selectVehicle(id: string) {
  selected.value = id;
  photos.value = [];
}

async function submit(e: Event, kind: 'vehicle' | 'maintenance') {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  const d = Object.fromEntries(new FormData(form));
  const written: string[] = [];
  error.value = '';
  busy.value = true;
  try {
    if (kind === 'vehicle') {
      await app.save('vehicles', vehicleSchema.parse(d));
      adding.value = false;
    } else if (kind === 'maintenance') {
      const value = maintenanceSchema.parse({...d, vehicleId: vehicle.value?.id, attachmentIds: photos.value.map(p => p.id)});
      for (const photo of photos.value) {
        await mediaWrite(photo);
        written.push(photo.id);
      }
      await app.save('maintenance', value);
      photos.value = [];
      form.reset();
      // v-default-value sets the live value, not the attribute, so reset() would otherwise blank the date.
      (form.elements.namedItem('date') as HTMLInputElement).value = today();
    }
    app.notify(app.demo ? 'Önizleme kaydı bu tarayıcıya kaydedildi.' : 'Kaydedildi.');
  } catch (e) {
    await Promise.all(written.map(id => mediaDelete(id).catch(() => {})));
    error.value = e instanceof Error ? (e.message.startsWith('[') ? 'Bilgileri kontrol et. Tarih, kilometre ve tutar geçerli olmalı.' : e.message) : 'Kayıt yapılamadı.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="ds-container garage" id="content">
    <p v-if="!app.ready" class="ds-small ds-muted">{{ i18nT("Hesabın yükleniyor…") }}</p>
    <div v-else-if="!app.member" class="ds-card welcome ds-col ds-g12">
      <CarFront :size="48"/>
      <h1>{{ i18nT("Aracının geçmişi,") }}<br/>{{ i18nT("elinin altında.") }}</h1>
      <p class="ds-muted">{{ i18nT("Bakımlarını kaydet. Bir sonraki bakımı unutma.") }}</p>
      <h2 class="t19">{{ i18nT("Aracına bir yer ayır.") }}</h2>
      <p class="ds-small ds-muted">{{ i18nT("Aracını kaydet, bakım geçmişini biriktir ve hatırlatmalarını takip et.") }}<br/>{{ i18nT("Üyelik ve tüm kişisel özellikler ücretsiz.") }}</p>
      <NuxtLink to="/giris?next=/araclarim" class="ds-btn p">{{ i18nT("Ücretsiz hesabına giriş yap ") }}<ArrowRight :size="18"/></NuxtLink>
    </div>
    <template v-else>
      <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
      <div :class="`garage-grid ${vehicle?'':'no-vehicle'}`">
        <aside class="ds-col ds-g12 rail">
          <div class="ds-row ds-sb ds-g8">
            <h1 class="t19">{{ i18nT("Araçlarım") }}</h1>
            <button type="button" class="ds-btn s sm" @click="adding=!adding"><Plus :size="15"/>{{ i18nT("Araç ekle") }}</button>
          </div>
          <button v-for="v in vehicles" :key="v.id" type="button" :class="`veh ${vehicle?.id===v.id?'on':''}`" :aria-current="vehicle?.id===v.id?'true':undefined" :disabled="busy||processing" @click="selectVehicle(v.id)">
            <GaragePhoto :id="v.photoId" alt="" variant="thumb"/>
            <span class="ds-f1 ds-col">
              <strong class="veh-name">{{ v.brand }} {{ v.model }} · {{ v.year }}</strong>
              <span class="ds-xs ds-muted">{{ i18nT(v.fuel) }} · {{ v.mileage.toLocaleString(i18nLocaleTag) }}{{ i18nT(" km") }}</span>
            </span>
            <ChevronRight :size="18" class="ds-i"/>
          </button>
          <div class="share ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
            <Users :size="20"/>
            <strong class="ds-small">{{ i18nT("Aile ile paylaş") }}</strong>
            <span class="ds-xs ds-muted">{{ i18nT("Davet ettiğin kişi yalnız bu aracın kayıtlarını görür.") }}</span>
          </div>
          <button v-if="app.data.vehicles.some(v=>v.archived)" type="button" class="ds-btn s sm" @click="toggleArchived">{{ i18nT(showArchived?'Aktif araçlar':'Arşivdeki araçlar') }}</button>
          <SharedGaragePanel :key="app.demo?'demo':app.user?.uid??'guest'"/>
        </aside>
        <div class="ds-col ds-g20 main">
          <section v-if="adding||!app.data.vehicles.length" class="ds-card ds-pad24 ds-col ds-g16">
            <h2 class="t19">{{ i18nT("Aracını ekle") }}</h2>
            <form class="grid2" @submit="submit($event,'vehicle')">
              <label class="f"><span class="ds-label">{{ i18nT("Marka") }}</span><select class="ds-field" name="brand" required><option value="">{{ i18nT("Marka seç") }}</option><option v-for="b in brands" :key="b" :value="b">{{ b }}</option></select></label>
              <label class="f"><span class="ds-label">{{ i18nT("Model") }}</span><input class="ds-field" name="model" :placeholder="i18nT('Örn. Golf')" maxlength="80" required/></label>
              <label class="f"><span class="ds-label">{{ i18nT("Model yılı") }}</span><input class="ds-field" name="year" type="number" min="1950" :max="new Date().getFullYear()+1" value="2020" required/></label>
              <label class="f"><span class="ds-label">{{ i18nT("Yakıt") }}</span><select class="ds-field" name="fuel"><option v-for="f in ['Benzin','Dizel','Hibrit','Elektrikli','LPG']" :key="f" :value="f">{{ i18nT(f) }}</option></select></label>
              <label class="f"><span class="ds-label">{{ i18nT("Güncel kilometre") }}</span><input class="ds-field" name="mileage" type="number" min="0" max="2000000" :placeholder="i18nT('72500')" required/></label>
              <div class="form-end"><button :disabled="busy" class="ds-btn p">{{ i18nT("Aracı kaydet") }}</button></div>
            </form>
            <p class="ds-xs ds-muted">{{ i18nT("Plaka veya şasi numarası istemiyoruz.") }}</p>
          </section>
          <template v-if="vehicle">
            <VehicleProfile :key="'profile-'+vehicle.id" :vehicle="vehicle" :readOnly="vehicle.archived"/>
            <div class="kpis">
              <div class="ds-kpi">
                <div class="ds-small ds-muted">{{ i18nT("Sonraki bakım") }}</div>
                <div class="v">{{ nextReminder?.dueDate?daysLabel(nextReminder.dueDate):'—' }}</div>
                <div class="ds-xs ds-muted">{{ nextReminder?.dueDate?longDate(nextReminder.dueDate):i18nT("Tarih eklenmedi") }}</div>
              </div>
              <div class="ds-kpi">
                <div class="ds-small ds-muted">{{ i18nT("Muayene") }}</div>
                <div class="v">{{ vehicle.inspectionDueDate?daysLabel(vehicle.inspectionDueDate):'—' }}</div>
                <div class="ds-xs ds-muted">{{ vehicle.inspectionDueDate?longDate(vehicle.inspectionDueDate):i18nT("Henüz tarih eklenmedi.") }}</div>
              </div>
              <div class="ds-kpi">
                <div class="ds-small ds-muted">{{ i18nT("{0} gideri",{'0':currentYear}) }}</div>
                <div class="v">{{ money(yearHistory.reduce((sum,m)=>sum+Math.round(m.amount*100),0)/100) }}</div>
                <div class="ds-xs ds-muted">{{ yearHistory.length }}{{ i18nT(" kayıt") }}</div>
              </div>
            </div>
            <VehicleMileage v-if="!vehicle.archived" :key="vehicle.id" :vehicle="vehicle"/>
            <section class="ds-card ds-pad24">
              <div class="ds-row ds-sb ds-wrap ds-g12">
                <h2 class="t19">{{ i18nT("Bakım ve gider geçmişi") }}</h2>
                <div class="ds-seg" role="group" :aria-label="i18nT('Kayıt türü')">
                  <button type="button" class="on" aria-pressed="true">{{ i18nT("Tümü") }}</button>
                  <button v-for="f in ['Bakım','Gider','Belgeler']" :key="f" type="button" class="ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT(f) }}</button>
                </div>
              </div>
              <p class="ds-xs ds-muted total"><span>{{ i18nT("Bu aracın kayıtlı bakım harcaması") }}</span>: <strong>{{ (history.reduce((sum,m)=>sum+Math.round(m.amount*100),0)/100).toLocaleString(i18nLocaleTag,{style:'currency',currency:'TRY'}) }}</strong> · {{ i18nT("Yalnızca girdiğin ") }}{{ history.length }}{{ i18nT(" bakım kaydı toplamı.") }}</p>
              <ul v-if="history.length" class="hist">
                <li v-for="m in history" :key="m.id">
                  <span class="hist-icon"><Wrench :size="20"/></span>
                  <div class="ds-f1 ds-col">
                    <strong class="hist-title">{{ m.title }}</strong>
                    <span class="ds-small ds-muted">{{ m.mileage.toLocaleString(i18nLocaleTag) }}{{ i18nT(" km") }}</span>
                    <small v-if="m.note" class="ds-xs ds-muted note">{{ m.note }}</small>
                    <GaragePhoto v-for="id in m.attachmentIds" :key="id" :id="id" :alt="i18nT('{0} servis belgesi',{'0':m.title})" document/>
                  </div>
                  <div class="hist-end">
                    <strong class="hist-title">{{ money(m.amount) }}</strong>
                    <span class="ds-xs ds-muted">{{ shortDate(m.date) }}</span>
                  </div>
                </li>
              </ul>
              <div v-else class="hist-empty"><Wrench :size="28"/><p class="ds-small ds-muted">{{ i18nT("İlk bakım kaydınla başlayalım.") }}<br/>{{ i18nT("Yapılan işlemi aşağıdan ekleyebilirsin.") }}</p></div>
            </section>
            <section v-if="!vehicle.archived" id="bakim-kaydi" class="ds-card ds-pad24 ds-col ds-g16">
              <h2 class="t19">{{ i18nT("Bakım kaydı ekle") }}</h2>
              <form :key="vehicle.id" class="grid2" @submit="submit($event,'maintenance')">
                <label class="f"><span class="ds-label">{{ i18nT("İşlem") }}</span><input class="ds-field" name="title" :placeholder="i18nT('Örn. Yağ ve filtre değişimi')" required minlength="2" maxlength="120"/></label>
                <label class="f"><span class="ds-label">{{ i18nT("Tarih") }}</span><input class="ds-field" name="date" type="date" required :max="today()" v-default-value="today()"/></label>
                <label class="f"><span class="ds-label">{{ i18nT("İşlemdeki kilometre") }}</span><input class="ds-field" name="mileage" type="number" min="0" max="2000000" required/></label>
                <label class="f"><span class="ds-label">{{ i18nT("Tutar (TL)") }}</span><input class="ds-field" name="amount" type="number" step="0.01" min="0" max="10000000" required/></label>
                <label class="f all"><span class="ds-label">{{ i18nT("Not (isteğe bağlı)") }}</span><textarea class="ds-field" name="note" maxlength="1000" :placeholder="i18nT('Yapılan işlemler, değişen parçalar…')"></textarea></label>
                <div class="all"><GarageMediaPicker v-if="app.demo" kind="document" :items="photos" :onChange="setPhotos" :onBusy="setProcessing" :disabled="busy"/><p v-else class="ds-xs ds-muted">{{ i18nT("Özel belge saklama hizmeti henüz etkin değil.") }}</p></div>
                <div class="all form-end"><button class="ds-btn p" :disabled="busy||processing">{{ i18nT("Bakımı kaydet") }}</button></div>
              </form>
            </section>
          </template>
        </div>
        <div v-if="vehicle" class="ds-col ds-g16 side">
          <ReminderManager v-if="!vehicle.archived" :key="vehicle.id" :vehicle="vehicle"/>
          <section class="ds-card ds-pad ds-col ds-g10 ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
            <h2 class="t16">{{ i18nT("Bu araç için önerilen servisler") }}</h2>
            <p class="ds-xs ds-muted">{{ i18nT("Öneriler henüz etkin değil.") }}</p>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.garage {max-width: 1440px; padding-top: 32px; padding-bottom: 64px;}
p, h1, h2 {margin: 0;}
.t19, .t16 {font-family: Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0; font-weight: 700;}
.t19 {font-size: 19px; line-height: 24.7px;}
.t16 {font-size: 16px; line-height: 21.6px;}
.welcome {max-width: 640px; margin: 0 auto; padding: 32px; align-items: flex-start;}
.welcome h1 {font-size: 34px; line-height: 38px;}
.garage > .ds-note {margin-bottom: 16px;}
.garage-grid {display: grid; grid-template-columns: minmax(0, 330fr) minmax(0, 630fr) minmax(0, 320fr); gap: 24px; align-items: start;}
.garage-grid.no-vehicle {grid-template-columns: minmax(0, 330fr) minmax(0, 974fr);}
.rail > *, .main > *, .side > * {min-width: 0;}
.rail > .ds-btn {align-self: flex-start;}
.veh {display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; background: #fff; border: 1px solid #dfe5eb; border-radius: 14px; color: #10243a; text-align: left; cursor: pointer;}
.veh.on {border: 2px solid #f36b21; padding: 11px;}
.veh[disabled] {cursor: not-allowed;}
.veh-name, .hist-title {font-size: 15px; line-height: 22.5px; overflow-wrap: anywhere;}
.share {display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; background: #fff; border: 1px dashed #dfe5eb; border-radius: 14px; text-align: center;}
.f {display: block; min-width: 0;}
.f .ds-label {display: block;}
.f .ds-field {font-size: 15px;}
.grid2 {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px;}
.all {grid-column: 1 / -1; min-width: 0;}
.form-end {display: flex; align-items: flex-end; justify-content: flex-end;}
.kpis {display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;}
.kpis .v {overflow-wrap: anywhere;}
.total {margin-top: 12px;}
.hist {list-style: none; margin: 8px 0 0; padding: 0;}
.hist li {display: flex; align-items: flex-start; gap: 16px; padding: 14px 0; border-bottom: 1px solid #edf0f3;}
.hist-icon {display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex: none; border-radius: 12px; background: #f4f6f8;}
.hist-end {display: flex; flex-direction: column; align-items: flex-end; white-space: nowrap;}
.note {white-space: pre-wrap; overflow-wrap: anywhere;}
.hist-empty {display: flex; align-items: center; gap: 16px; padding: 24px 0 8px; color: #586879;}
#bakim-kaydi {scroll-margin-top: 16px;}
@media (max-width: 1100px) {
  .garage-grid, .garage-grid.no-vehicle {grid-template-columns: minmax(0, 300fr) minmax(0, 640fr);}
  .side {grid-column: 2;}
}
@media (max-width: 760px) {
  .garage {padding-top: 20px; padding-bottom: 32px;}
  .garage-grid, .garage-grid.no-vehicle {grid-template-columns: minmax(0, 1fr);}
  .side {grid-column: auto;}
}
@media (max-width: 480px) {
  .grid2, .kpis {grid-template-columns: minmax(0, 1fr);}
  .welcome {padding: 20px;}
  .hist li {gap: 10px;}
}
</style>
