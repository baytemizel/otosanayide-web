import {computed, ref} from 'vue';
import {reminderCalendar} from '@otosanayide/core/calendar';
import type {Reminder, Vehicle} from '@otosanayide/core';
import {useApp} from '~/composables/useApp';
import {demoMode} from '~/lib/env';
import {
  daysUntil, formatLongDate, formatLongDateTime, formatRemaining, mockNotifyOptions, mockToday, reminderProgress, useMockGarage,
  type MockNotifyOffset, type MockReminder,
} from '~/data/mock/garage';
import {
  garageErrorMessage, inspectionView, istanbulToday, liveRecord, liveReminder, liveVehicle, maintenanceInput, reminderInput, reminderPayload, vehicleInput,
  type GarageRecord, type GarageReminderView, type GarageVehicle, type RecordDraft, type ReminderDraft, type VehicleDraft,
} from '~/lib/v2/garage';

/** The W11/W12 mock reminder with the display values the components read (same output as before). */
function mockReminderView(r: MockReminder): GarageReminderView {
  const days = daysUntil(r.due);
  return {
    id: r.id,
    vehicleId: r.vehicleId,
    topic: r.topic,
    label: r.label ?? r.topic,
    dateText: formatLongDate(r.due),
    // Figma: the service reminder shows its time (09.00), the others only the date.
    whenText: r.topic === 'Periyodik bakım' ? formatLongDateTime(r.due) : formatLongDate(r.due),
    notifyText: mockNotifyOptions.filter((o) => r.notify.includes(o.value)).map((o) => o.label).join(', '),
    remaining: formatRemaining(r.due),
    offText: 'Kapalı',
    progress: reminderProgress(r),
    tone: !r.active ? 'muted' : days <= 30 ? 'orange' : 'green',
    push: r.push,
    email: r.email,
    active: r.active,
    sort: days,
  };
}

/**
 * Data for /araclarim (W11) and the W12 reminder modal.
 * Live: vehicles, maintenance and reminders from the app store (GET /api/me); writes go through
 * app.save / app.update (POST / PATCH /api/me). Demo: the in-memory mock garage, unchanged.
 */
export function useGarage() {
  const app = useApp();
  const live = !demoMode();
  const mock = useMockGarage();
  const today = live ? istanbulToday() : mockToday.toISOString().slice(0, 10);
  const year = live ? Number(today.slice(0, 4)) : mockToday.getFullYear();

  const vehicles = computed<GarageVehicle[]>(() => (live ? app.data.vehicles.filter((v) => !v.archived).map(liveVehicle) : mock.vehicles.value));
  const records = computed<GarageRecord[]>(() => (live ? app.data.maintenance.map(liveRecord) : mock.records.value));
  const reminders = computed<GarageReminderView[]>(() => {
    if (!live) return mock.reminders.value.map(mockReminderView);
    return app.data.reminders.map((r) => liveReminder(r, app.data.vehicles.find((v) => v.id === r.vehicleId), today));
  });
  /** Summary cards also count the vehicle's inspection date (live model field). */
  const summaryFor = (vehicle: GarageVehicle | undefined) => {
    const own = reminders.value.filter((r) => r.vehicleId === vehicle?.id);
    const inspection = live && vehicle ? inspectionView(vehicle, today) : null;
    return inspection ? [...own, inspection] : own;
  };

  /** Live only: the first GET /api/me has not finished. */
  const loading = computed(() => live && !app.ready);
  const reloading = ref(false);
  const loadError = ref('');

  async function reload() {
    if (!live || reloading.value) return;
    reloading.value = true;
    loadError.value = '';
    try {
      await app.refresh();
    } catch (error) {
      loadError.value = error instanceof Error && error.message ? error.message : 'Garaj kayıtları yüklenemedi. Bağlantını kontrol edip tekrar dene.';
    } finally {
      reloading.value = false;
    }
  }

  /** Returns the saved vehicle's id. */
  async function saveVehicle(draft: VehicleDraft): Promise<string> {
    if (!live) {
      const value = {model: draft.model, year: draft.year, km: draft.km, fuel: draft.fuel, transmission: draft.transmission, plate: draft.plate, plateHidden: draft.plateHidden};
      if (draft.id) {
        mock.vehicles.value = mock.vehicles.value.map((v) => (v.id === draft.id ? {...v, ...value, id: v.id} : v));
        return draft.id;
      }
      const id = `arac-${Date.now()}`;
      mock.vehicles.value = [...mock.vehicles.value, {...value, id}];
      return id;
    }
    const existing = draft.id ? app.data.vehicles.find((v) => v.id === draft.id) : undefined;
    const value = vehicleInput(draft, existing as Vehicle | undefined);
    if (draft.id) {
      await app.update('vehicles', draft.id, value);
      return draft.id;
    }
    const before = new Set(app.data.vehicles.map((v) => v.id));
    await app.save('vehicles', value);
    return app.data.vehicles.find((v) => !before.has(v.id))?.id ?? '';
  }

  async function saveRecord(draft: RecordDraft) {
    if (!live) {
      const vehicle = mock.vehicles.value.find((v) => v.id === draft.vehicleId);
      const km = `${(vehicle?.km ?? 0).toLocaleString('tr-TR')} km`;
      mock.records.value = [...mock.records.value, {
        id: `k-${Date.now()}`,
        vehicleId: draft.vehicleId,
        title: draft.title,
        detail: draft.place ? `${draft.place} · ${km}` : km,
        kind: draft.kind,
        icon: draft.kind === 'bakim' ? 'wrench' : 'file',
        document: draft.document === 'Yok' ? null : draft.document,
        amount: Math.round(draft.amount),
        date: draft.date,
      }];
      return;
    }
    await app.save('maintenance', maintenanceInput(draft));
  }

  async function saveReminder(draft: ReminderDraft) {
    if (!live) {
      const due = `${draft.date}T09:00:00+03:00`;
      const left = Math.max(daysUntil(due), 0);
      mock.reminders.value = [...mock.reminders.value, {
        id: `h-${Date.now()}`,
        vehicleId: draft.vehicleId,
        topic: draft.topic,
        due,
        windowDays: Math.max(left + 14, 30),
        notify: (draft.notify.length ? draft.notify : [0]) as MockNotifyOffset[],
        push: draft.push,
        email: draft.email,
        active: true,
      }];
      return;
    }
    await app.save('reminders', reminderInput(draft));
  }

  async function toggleReminder(id: string, on: boolean) {
    if (!live) {
      mock.reminders.value = mock.reminders.value.map((r) => (r.id === id ? {...r, active: on} : r));
      return;
    }
    const stored = app.data.reminders.find((r) => r.id === id);
    if (!stored) throw Error('Hatırlatma bulunamadı. Sayfayı yenile.');
    await app.update('reminders', id, {...reminderPayload(stored), completed: !on});
  }

  /** Live .ics for a reminder draft (packages/core/calendar), as the old ReminderActions did. */
  function liveCalendar(draft: ReminderDraft) {
    const vehicle = app.data.vehicles.find((v) => v.id === draft.vehicleId);
    if (!vehicle) throw Error('Araç bulunamadı.');
    const value = reminderInput(draft);
    return reminderCalendar({...value, id: crypto.randomUUID()} as Reminder, vehicle as Vehicle);
  }

  return {live, today, year, vehicles, records, reminders, summaryFor, loading, reloading, loadError, reload, saveVehicle, saveRecord, saveReminder, toggleReminder, liveCalendar, errorMessage: garageErrorMessage};
}
