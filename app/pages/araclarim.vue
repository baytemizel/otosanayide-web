<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight, Car, LoaderCircle} from '@lucide/vue';
import V2PageHeader from '~/components/v2/V2PageHeader.vue';
import GarageHistory from '~/components/v2/garage/GarageHistory.vue';
import GarageRecordModal from '~/components/v2/garage/GarageRecordModal.vue';
import GarageReminderModal from '~/components/v2/garage/GarageReminderModal.vue';
import GarageReminders from '~/components/v2/garage/GarageReminders.vue';
import GarageStats from '~/components/v2/garage/GarageStats.vue';
import GarageVehicleHero from '~/components/v2/garage/GarageVehicleHero.vue';
import GarageVehicleList from '~/components/v2/garage/GarageVehicleList.vue';
import GarageVehicleModal from '~/components/v2/garage/GarageVehicleModal.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {useGarage} from '~/composables/v2/useGarage';
import {useMemberPage} from '~/composables/useMemberPage';
import {useSession} from '~/composables/useSession';
import {formatLongDate} from '~/data/mock/garage';
import {formatDay, formatKm, type GarageRecord, type RecordDraft, type ReminderDraft, type VehicleDraft} from '~/lib/v2/garage';

// W11 · Araçlarım (Figma 123:211) + W12 · Hatırlatma oluştur modal (Figma 125:222).
// ?arac=<id> selects a vehicle, ?hatirlatma=yeni opens the reminder modal.
// Live: GET /api/me?v=2 data from the app store, writes through POST / PATCH / DELETE /api/me. Demo: mock data in memory.
useMemberPage();
const {t, localeTag} = useLocale();
useSeoMeta({title: () => t('Araçlarım')});

const route = useRoute();
const router = useRouter();
const app = useApp();
const session = useSession();
const garage = useGarage();
const {live, vehicles, records} = garage;

const selected = computed(() => vehicles.value.find((v) => v.id === route.query.arac) ?? vehicles.value[0]);
const vehicleRecords = computed(() => records.value.filter((r) => r.vehicleId === selected.value?.id));
const vehicleReminders = computed(() => garage.reminders.value.filter((r) => r.vehicleId === selected.value?.id).sort((a, b) => a.sort - b.sort));
const summary = computed(() => garage.summaryFor(selected.value));

function setQuery(patch: Record<string, string | undefined>) {
  const query = {...route.query, ...patch};
  for (const key of Object.keys(query)) if (query[key] === undefined) delete query[key];
  return router.replace({query});
}

const reminderOpen = computed(() => route.query.hatirlatma === 'yeni' && !!selected.value);
const status = ref('');

function selectVehicle(id: string) {
  status.value = '';
  toggleError.value = '';
  void setQuery({arac: id});
}

/* One write at a time: every modal and switch shares this flag. */
const busy = ref(false);
const modalError = ref('');
async function run(task: () => Promise<void>, onError: (message: string) => void) {
  if (busy.value) return;
  busy.value = true;
  try {
    await task();
  } catch (error) {
    // Store and garage messages are Turkish source text; an API message without English stays as sent.
    onError(t(garage.errorMessage(error)));
  } finally {
    busy.value = false;
  }
}

const toggleError = ref('');
function toggleReminder(id: string, on: boolean) {
  toggleError.value = '';
  void run(async () => {
    await garage.toggleReminder(id, on);
    if (live) status.value = on ? t('Hatırlatma yeniden açıldı.') : t('Hatırlatma kapatıldı; bildirim planlanmaz. Takvime eklediğin kopyayı ayrıca kaldırabilirsin.');
  }, (message) => { toggleError.value = message; });
}

function openReminder() {
  modalError.value = '';
  void setQuery({hatirlatma: 'yeni'});
}
function saveReminder(data: ReminderDraft) {
  modalError.value = '';
  void run(async () => {
    await garage.saveReminder(data);
    const tag = localeTag.value;
    const when = live
      ? (data.date ? formatDay(data.date, tag) : t('{km} hedefi', {km: formatKm(data.dueKm ?? 0, tag)}))
      : formatLongDate(`${data.date}T09:00:00+03:00`, tag);
    status.value = t('{topic} hatırlatması {when} için kaydedildi.', {topic: t(data.topic), when});
    await setQuery({hatirlatma: undefined, arac: data.vehicleId});
  }, (message) => { modalError.value = message; });
}

const vehicleModal = ref<'add' | 'edit' | null>(null);
function openVehicle(mode: 'add' | 'edit') {
  modalError.value = '';
  vehicleModal.value = mode;
}
function saveVehicle(data: VehicleDraft) {
  modalError.value = '';
  void run(async () => {
    const id = await garage.saveVehicle(data);
    vehicleModal.value = null;
    if (live) app.notify(data.id ? t('Araç bilgileri güncellendi.') : t('Araç garajına eklendi.'));
    if (!data.id && id) selectVehicle(id);
  }, (message) => { modalError.value = message; });
}

const recordOpen = ref(false);
/** Live: the record being edited (null = new record). */
const editingRecord = ref<GarageRecord | null>(null);
function openRecord() {
  modalError.value = '';
  editingRecord.value = null;
  recordOpen.value = true;
}
function editRecord(id: string) {
  const record = vehicleRecords.value.find((r) => r.id === id);
  if (!live || !record) return;
  modalError.value = '';
  editingRecord.value = record;
  recordOpen.value = true;
}
function closeRecord() {
  recordOpen.value = false;
  editingRecord.value = null;
}
function saveRecord(data: RecordDraft) {
  modalError.value = '';
  void run(async () => {
    await garage.saveRecord(data);
    closeRecord();
    if (live) app.notify(data.id ? t('Kayıt güncellendi.') : t('Kayıt eklendi.'));
  }, (message) => { modalError.value = message; });
}
function deleteRecord(id: string) {
  modalError.value = '';
  void run(async () => {
    await garage.deleteRecord(id);
    closeRecord();
    app.notify(t('Kayıt silindi.'));
  }, (message) => { modalError.value = message; });
}
</script>

<template>
  <div class="garage-page">
    <V2PageHeader :eyebrow="t('GARAJIM')" :title="t('Araçlarım')">
      <button type="button" class="btn btn-dark" :disabled="garage.loading.value" @click="openVehicle('add')">{{ t('Araç ekle') }}<ArrowRight aria-hidden="true"/></button>
    </V2PageHeader>

    <div v-if="garage.loading.value" class="state v2-wrap" role="status">
      <LoaderCircle :size="22" class="spin" aria-hidden="true"/>
      <p class="t-body-md t-muted">{{ t('Garajın yükleniyor…') }}</p>
    </div>

    <div v-else-if="!selected" class="v2-wrap empty-wrap">
      <section class="empty" aria-labelledby="empty-title">
        <span class="empty-icon" aria-hidden="true"><Car :size="28"/></span>
        <h2 id="empty-title" class="t-h3">{{ t('Garajın henüz boş') }}</h2>
        <p class="t-body-md t-muted">{{ t('Aracını ekle; bakım geçmişini biriktir, muayene ve bakım tarihlerini unutma.') }} {{ live ? t('Plaka zorunlu değil; şasi numarası istemiyoruz.') : t('Plaka veya şasi numarası istemiyoruz.') }}</p>
        <div class="empty-actions">
          <button type="button" class="btn btn-primary" @click="openVehicle('add')">{{ t('İlk aracını ekle') }}<ArrowRight aria-hidden="true"/></button>
          <button v-if="live" type="button" class="btn btn-outline" :disabled="garage.reloading.value" @click="garage.reload()">{{ garage.reloading.value ? t('Yenileniyor…') : t('Kayıtları yenile') }}</button>
        </div>
        <p v-if="garage.loadError.value" class="load-err t-body-sm" role="alert">{{ t(garage.loadError.value) }}</p>
      </section>
    </div>

    <div v-else class="content v2-wrap">
      <GarageVehicleList class="side" :vehicles="vehicles" :selected-id="selected.id" :live="live" @select="selectVehicle"/>
      <div class="main">
        <GarageVehicleHero :vehicle="selected" :live="live" @edit="openVehicle('edit')" @add-record="openRecord"/>
        <GarageStats :reminders="summary" :records="vehicleRecords" :year="garage.year" @add-reminder="openReminder"/>
        <GarageHistory :key="selected.id" :records="vehicleRecords" :live="live" :busy="busy" @edit="editRecord"/>
        <GarageReminders :reminders="vehicleReminders" :status="status" :error="toggleError" :busy="busy" :note="live ? t('Push ve e-posta tercihlerin kaydedilir; gönderim hizmeti henüz açık değil.') : undefined" @add="openReminder" @toggle="toggleReminder"/>
      </div>
    </div>

    <GarageReminderModal
      v-if="selected"
      :open="reminderOpen"
      :vehicles="vehicles"
      :vehicle-id="selected.id"
      :live="live"
      :today="garage.today"
      :email="session.email.value"
      :email-verified="session.emailVerified.value"
      :busy="busy"
      :error="modalError"
      :calendar="garage.liveCalendar"
      @close="setQuery({hatirlatma: undefined})"
      @save="saveReminder"/>
    <GarageVehicleModal :open="vehicleModal !== null" :vehicle="vehicleModal === 'edit' ? selected : null" :live="live" :busy="busy" :error="modalError" @close="vehicleModal = null" @save="saveVehicle"/>
    <GarageRecordModal v-if="selected" :open="recordOpen" :vehicle="selected" :record="editingRecord" :today="garage.today" :live="live" :busy="busy" :error="modalError" @close="closeRecord" @save="saveRecord" @delete="deleteRecord"/>
  </div>
</template>

<style scoped>
.content{display:grid;grid-template-columns:360px minmax(0,1fr);gap:32px;align-items:start;padding-top:36px;padding-bottom:104px}
.main{display:flex;flex-direction:column;gap:24px;min-width:0}
.state{display:flex;align-items:center;gap:12px;padding-top:48px;padding-bottom:104px}
.spin{animation:spin 1s linear infinite;color:var(--ink-500)}
@keyframes spin{to{transform:rotate(360deg)}}
.empty-wrap{padding-top:36px;padding-bottom:104px}
.empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:56px 24px;text-align:center;background:var(--white);border:1px dashed var(--cream-200);border-radius:28px}
.empty p{max-width:520px}
.empty-icon{width:64px;height:64px;border-radius:999px;display:grid;place-items:center;background:var(--lime-400);color:var(--ink-900);margin-bottom:4px}
.empty-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px}
.load-err{padding:10px 14px;border-radius:14px;background:var(--orange-100);font-weight:600;color:var(--ink-800)}
@media (max-width:1100px){.content{grid-template-columns:300px minmax(0,1fr);gap:24px}}
@media (max-width:900px){
  .content{grid-template-columns:1fr;padding-top:24px;padding-bottom:64px}
  .main{gap:16px}
  .empty-wrap{padding-top:24px;padding-bottom:64px}
}
</style>
