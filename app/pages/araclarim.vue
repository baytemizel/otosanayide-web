<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight} from '@lucide/vue';
import V2PageHeader from '~/components/v2/V2PageHeader.vue';
import GarageHistory from '~/components/v2/garage/GarageHistory.vue';
import GarageRecordModal from '~/components/v2/garage/GarageRecordModal.vue';
import GarageReminderModal from '~/components/v2/garage/GarageReminderModal.vue';
import GarageReminders from '~/components/v2/garage/GarageReminders.vue';
import GarageStats from '~/components/v2/garage/GarageStats.vue';
import GarageVehicleHero from '~/components/v2/garage/GarageVehicleHero.vue';
import GarageVehicleList from '~/components/v2/garage/GarageVehicleList.vue';
import GarageVehicleModal from '~/components/v2/garage/GarageVehicleModal.vue';
import {useMemberPage} from '~/composables/useMemberPage';
import {daysUntil, formatLongDate, useMockGarage, type MockRecord, type MockReminder, type MockVehicle} from '~/data/mock/garage';

// W11 · Araçlarım (Figma 123:211) + W12 · Hatırlatma oluştur modal (Figma 125:222).
// ?arac=<id> selects a vehicle, ?hatirlatma=yeni opens the reminder modal. Mock data in memory.
useMemberPage();
useSeoMeta({title: 'Araçlarım'});

const route = useRoute();
const router = useRouter();
const {vehicles, records, reminders} = useMockGarage();

const selected = computed(() => vehicles.value.find((v) => v.id === route.query.arac) ?? vehicles.value[0]!);
const vehicleRecords = computed(() => records.value.filter((r) => r.vehicleId === selected.value.id));
const vehicleReminders = computed(() => reminders.value.filter((r) => r.vehicleId === selected.value.id).sort((a, b) => a.due.localeCompare(b.due)));

function setQuery(patch: Record<string, string | undefined>) {
  const query = {...route.query, ...patch};
  for (const key of Object.keys(query)) if (query[key] === undefined) delete query[key];
  return router.replace({query});
}

const reminderOpen = computed(() => route.query.hatirlatma === 'yeni');
const status = ref('');

function selectVehicle(id: string) {
  status.value = '';
  void setQuery({arac: id});
}

function toggleReminder(id: string, on: boolean) {
  reminders.value = reminders.value.map((r) => (r.id === id ? {...r, active: on} : r));
}

function saveReminder(data: Omit<MockReminder, 'id' | 'windowDays'>) {
  const left = Math.max(daysUntil(data.due), 0);
  reminders.value = [...reminders.value, {...data, id: `h-${Date.now()}`, windowDays: Math.max(left + 14, 30)}];
  status.value = `${data.topic} hatırlatması ${formatLongDate(data.due)} için kaydedildi.`;
  void setQuery({hatirlatma: undefined, arac: data.vehicleId});
}

const vehicleModal = ref<'add' | 'edit' | null>(null);
function saveVehicle(data: Omit<MockVehicle, 'id'> & {id?: string}) {
  if (data.id) {
    vehicles.value = vehicles.value.map((v) => (v.id === data.id ? {...v, ...data, id: v.id} : v));
    vehicleModal.value = null;
    return;
  }
  const id = `arac-${Date.now()}`;
  vehicles.value = [...vehicles.value, {...data, id}];
  vehicleModal.value = null;
  selectVehicle(id);
}

const recordOpen = ref(false);
function saveRecord(data: Omit<MockRecord, 'id'>) {
  records.value = [...records.value, {...data, id: `k-${Date.now()}`}];
  recordOpen.value = false;
}
</script>

<template>
  <div class="garage-page">
    <V2PageHeader eyebrow="GARAJIM" title="Araçlarım">
      <button type="button" class="btn btn-dark" @click="vehicleModal = 'add'">Araç ekle<ArrowRight aria-hidden="true"/></button>
    </V2PageHeader>

    <div class="content v2-wrap">
      <GarageVehicleList class="side" :vehicles="vehicles" :selected-id="selected.id" @select="selectVehicle"/>
      <div class="main">
        <GarageVehicleHero :vehicle="selected" @edit="vehicleModal = 'edit'" @add-record="recordOpen = true"/>
        <GarageStats :reminders="vehicleReminders" :records="vehicleRecords" @add-reminder="setQuery({hatirlatma: 'yeni'})"/>
        <GarageHistory :key="selected.id" :records="vehicleRecords"/>
        <GarageReminders :reminders="vehicleReminders" :status="status" @add="setQuery({hatirlatma: 'yeni'})" @toggle="toggleReminder"/>
      </div>
    </div>

    <GarageReminderModal :open="reminderOpen" :vehicles="vehicles" :vehicle-id="selected.id" @close="setQuery({hatirlatma: undefined})" @save="saveReminder"/>
    <GarageVehicleModal :open="vehicleModal !== null" :vehicle="vehicleModal === 'edit' ? selected : null" @close="vehicleModal = null" @save="saveVehicle"/>
    <GarageRecordModal :open="recordOpen" :vehicle="selected" @close="recordOpen = false" @save="saveRecord"/>
  </div>
</template>

<style scoped>
.content{display:grid;grid-template-columns:360px minmax(0,1fr);gap:32px;align-items:start;padding-top:36px;padding-bottom:104px}
.main{display:flex;flex-direction:column;gap:24px;min-width:0}
@media (max-width:1100px){.content{grid-template-columns:300px minmax(0,1fr);gap:24px}}
@media (max-width:900px){
  .content{grid-template-columns:1fr;padding-top:24px;padding-bottom:64px}
  .main{gap:16px}
}
</style>
