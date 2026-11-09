<script setup lang="ts">
import {computed, ref, shallowRef} from 'vue';
import {ArrowRight, CarFront, ClipboardList, Plus, Wrench} from '@lucide/vue';
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
  <div class="container page" id="content">
    <div class="page-heading">
      <div><h1>{{ i18nT("Aracının geçmişi,") }}<br/>{{ i18nT("elinin altında.") }}</h1><p>{{ i18nT("Bakımlarını kaydet. Bir sonraki bakımı unutma.") }}</p></div>
      <button v-if="app.member" class="button primary" @click="adding=!adding"><Plus :size="18"/>{{ i18nT("Araç ekle") }}</button>
    </div>
    <p v-if="!app.ready">{{ i18nT("Hesabın yükleniyor…") }}</p>
    <div v-else-if="!app.member" class="empty garage-welcome">
      <CarFront :size="48"/>
      <h2>{{ i18nT("Aracına bir yer ayır.") }}</h2>
      <p>{{ i18nT("Aracını kaydet, bakım geçmişini biriktir ve hatırlatmalarını takip et.") }}<br/>{{ i18nT("Üyelik ve tüm kişisel özellikler ücretsiz.") }}</p>
      <NuxtLink to="/giris?next=/araclarim" class="button primary">{{ i18nT("Ücretsiz hesabına giriş yap ") }}<ArrowRight :size="18"/></NuxtLink>
    </div>
    <template v-else>
      <SharedGaragePanel :key="app.demo?'demo':app.user?.uid??'guest'"/>
      <button v-if="app.data.vehicles.some(v=>v.archived)" class="button secondary" @click="toggleArchived">{{ i18nT(showArchived?'Aktif araçlar':'Arşivdeki araçlar') }}</button>
      <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
      <section v-if="adding||!app.data.vehicles.length" class="panel">
        <h2>{{ i18nT("Aracını ekle") }}</h2>
        <form class="form-grid" @submit="submit($event,'vehicle')">
          <label>{{ i18nT("Marka") }}<select name="brand" required><option value="">{{ i18nT("Marka seç") }}</option><option v-for="b in brands" :key="b" :value="b">{{ b }}</option></select></label>
          <label>{{ i18nT("Model") }}<input name="model" :placeholder="i18nT('Örn. Golf')" maxlength="80" required/></label>
          <label>{{ i18nT("Model yılı") }}<input name="year" type="number" min="1950" :max="new Date().getFullYear()+1" value="2020" required/></label>
          <label>{{ i18nT("Yakıt") }}<select name="fuel"><option v-for="f in ['Benzin','Dizel','Hibrit','Elektrikli','LPG']" :key="f" :value="f">{{ i18nT(f) }}</option></select></label>
          <label>{{ i18nT("Güncel kilometre") }}<input name="mileage" type="number" min="0" max="2000000" :placeholder="i18nT('72500')" required/></label>
          <div class="form-action"><button :disabled="busy" class="button primary">{{ i18nT("Aracı kaydet") }}</button></div>
        </form>
        <p class="small muted">{{ i18nT("Plaka veya şasi numarası istemiyoruz.") }}</p>
      </section>
      <div v-if="vehicle" class="garage-grid">
        <aside class="vehicle-rail">
          <h3>{{ i18nT("Araçlarım") }}</h3>
          <button v-for="v in vehicles" :key="v.id" :class="`vehicle-option ${vehicle.id===v.id?'selected':''}`" :disabled="busy||processing" @click="selectVehicle(v.id)"><CarFront :size="24"/><span><strong>{{ v.brand }} {{ v.model }}</strong><small>{{ v.year }} · {{ i18nT(v.fuel) }}<br/>{{ v.mileage.toLocaleString(i18nLocaleTag) }}{{ i18nT(" km") }}</small></span></button>
        </aside>
        <div>
          <VehicleProfile :key="'profile-'+vehicle.id" :vehicle="vehicle" :readOnly="vehicle.archived"/>
          <VehicleMileage v-if="!vehicle.archived" :key="vehicle.id" :vehicle="vehicle"/>
          <section class="panel">
            <div class="row between"><h2 class="row"><ClipboardList :size="24"/>{{ i18nT("Bakım geçmişi") }}</h2><span class="muted small">{{ history.length }}{{ i18nT(" kayıt") }}</span></div>
            <div class="maintenance-total"><span>{{ i18nT("Bu aracın kayıtlı bakım harcaması") }}</span><strong>{{ (history.reduce((sum,m)=>sum+Math.round(m.amount*100),0)/100).toLocaleString(i18nLocaleTag,{style:'currency',currency:'TRY'}) }}</strong><small>{{ i18nT("Yalnızca girdiğin ") }}{{ history.length }}{{ i18nT(" bakım kaydı toplamı.") }}</small></div>
            <div v-if="history.length" class="table-scroll">
              <table>
                <thead><tr><th>{{ i18nT("İşlem") }}</th><th>{{ i18nT("Tarih") }}</th><th>{{ i18nT("Kilometre") }}</th><th>{{ i18nT("Tutar") }}</th></tr></thead>
                <tbody>
                  <tr v-for="m in history" :key="m.id">
                    <td><strong>{{ m.title }}</strong><small v-if="m.note">{{ m.note }}</small><GaragePhoto v-for="id in m.attachmentIds" :key="id" :id="id" :alt="i18nT('{0} servis belgesi',{'0':m.title})" document/></td>
                    <td>{{ new Date(m.date+'T12:00:00').toLocaleDateString(i18nLocaleTag) }}</td>
                    <td>{{ m.mileage.toLocaleString(i18nLocaleTag) }}{{ i18nT(" km") }}</td>
                    <td>{{ m.amount.toLocaleString(i18nLocaleTag) }}{{ i18nT(" TL") }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="inline-empty"><Wrench :size="28"/><p>{{ i18nT("İlk bakım kaydınla başlayalım.") }}<br/>{{ i18nT("Yapılan işlemi aşağıdan ekleyebilirsin.") }}</p></div>
          </section>
          <section v-if="!vehicle.archived" class="panel">
            <h2 class="row"><Plus :size="23"/>{{ i18nT("Bakım kaydı ekle") }}</h2>
            <form :key="vehicle.id" class="form-grid" @submit="submit($event,'maintenance')">
              <label>{{ i18nT("İşlem") }}<input name="title" :placeholder="i18nT('Örn. Yağ ve filtre değişimi')" required minlength="2" maxlength="120"/></label>
              <label>{{ i18nT("Tarih") }}<input name="date" type="date" required :max="today()" v-default-value="today()"/></label>
              <label>{{ i18nT("İşlemdeki kilometre") }}<input name="mileage" type="number" min="0" max="2000000" required/></label>
              <label>{{ i18nT("Tutar (TL)") }}<input name="amount" type="number" step="0.01" min="0" max="10000000" required/></label>
              <label class="span-all">{{ i18nT("Not (isteğe bağlı)") }}<textarea name="note" maxlength="1000" :placeholder="i18nT('Yapılan işlemler, değişen parçalar…')"></textarea></label>
              <div class="span-all"><GarageMediaPicker v-if="app.demo" kind="document" :items="photos" :onChange="setPhotos" :onBusy="setProcessing" :disabled="busy"/><p v-else class="small muted">{{ i18nT("Özel belge saklama hizmeti henüz etkin değil.") }}</p></div>
              <div class="span-all end"><button class="button primary" :disabled="busy||processing">{{ i18nT("Bakımı kaydet") }}</button></div>
            </form>
          </section>
        </div>
        <ReminderManager v-if="!vehicle.archived" :key="vehicle.id" :vehicle="vehicle"/>
      </div>
    </template>
  </div>
</template>
