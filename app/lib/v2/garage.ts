import {maintenanceSchema, reminderSchema, reminderStatus, vehicleSchema, type Maintenance, type Reminder, type Vehicle} from '@otosanayide/core';
import {AccountRequestError} from '@otosanayide/core/account-client';
import type {MockRecord, MockVehicle} from '~/data/mock/garage';

/**
 * W11 Araçlarım / W12 Hatırlatma view models. Demo data (app/data/mock/garage.ts) already has the
 * MockVehicle / MockRecord shape; live records from GET /api/me are mapped here. Fields the account
 * model does not have (plate, transmission, record kind, document label, several notice days) are
 * left empty and the components hide them in live mode.
 */
export type GarageVehicle = MockVehicle & {source?: Vehicle; inspectionDueDate?: string};
export type GarageRecord = MockRecord & {source?: Maintenance};
export type GarageTone = 'orange' | 'green' | 'muted';

/** Reminder with every display value precomputed, so demo (fixed "today") and live share the components. */
export type GarageReminderView = {
  id: string;
  vehicleId: string;
  topic: string;
  /** Eyebrow on the W11 summary card. */
  label: string;
  /** "1 Aralık 2026" or "Hedef 94.000 km". */
  dateText: string;
  /** Third line of the summary card. */
  whenText: string;
  /** "Hedef gün", "1 gün önce, 7 gün önce". */
  notifyText: string;
  /** "14 gün", "3 ay", "Bugün", "2 gün geçti", "7.600 km", "Eşik geldi". */
  remaining: string;
  /** Right-hand text when switched off ("Kapalı" in the mock, "Tamamlandı" in live). */
  offText: string;
  progress: number;
  tone: GarageTone;
  push: boolean;
  email: boolean;
  active: boolean;
  /** Sort key: days left for dated reminders; km-only ones come after every dated one. */
  sort: number;
  /** Live only: the stored reminder (for .ics and the completed toggle). */
  source?: Reminder;
};

export const notifyOptions = [
  {value: 0, label: 'Hedef gün'},
  {value: 1, label: '1 gün önce'},
  {value: 3, label: '3 gün önce'},
  {value: 7, label: '7 gün önce'},
] as const;

/** Fuel values of the account model (vehicleSchema). */
export const liveFuels = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrikli'] as const;

const DAY = 86_400_000;
/** Ring windows for live reminders (the API keeps no creation date): the arc fills over the last 180 days / 10.000 km. */
export const DATE_WINDOW_DAYS = 180;
export const KM_WINDOW = 10_000;

/** Today's date in Türkiye as yyyy-mm-dd. */
export const istanbulToday = (now = new Date()) => now.toLocaleDateString('sv-SE', {timeZone: 'Europe/Istanbul'});

/** Whole days from `from` to `to` (both yyyy-mm-dd). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

/** yyyy-mm-dd plus `days`. */
export function addDays(date: string, days: number) {
  return new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);
}

/** "14 gün", "3 ay", "Bugün", "2 gün geçti" (same rule as the mock screens). */
export function remainingText(days: number) {
  if (days < 0) return `${-days} gün geçti`;
  if (days === 0) return 'Bugün';
  if (days <= 60) return `${days} gün`;
  return `${Math.round(days / 30.4)} ay`;
}

/** Share of a window that has passed, 0.04..1 (the ring never looks empty while it runs). */
export function ringProgress(left: number, window: number) {
  if (left <= 0) return 1;
  return Math.min(1, Math.max(0.04, 1 - left / window));
}

/** "₺7.850", "₺1.250,5" (kuruş only when there are any). */
export const formatTry = (value: number) => `₺${value.toLocaleString('tr-TR', {maximumFractionDigits: 2})}`;
export const formatKm = (value: number) => `${value.toLocaleString('tr-TR')} km`;
/** "1 Aralık 2026" for a yyyy-mm-dd date (noon Türkiye time, so no day shift). */
export const formatDay = (date: string) => new Date(`${date}T12:00:00+03:00`).toLocaleDateString('tr-TR', {timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric'});

export function notifyText(values: readonly number[]) {
  return notifyOptions.filter((o) => values.includes(o.value)).map((o) => o.label).join(', ');
}

export function liveVehicle(v: Vehicle): GarageVehicle {
  return {
    id: v.id,
    model: `${v.brand} ${v.model}`,
    year: v.year,
    plate: null,
    plateHidden: false,
    fuel: v.fuel,
    transmission: '',
    km: v.mileage,
    inspectionDueDate: v.inspectionDueDate,
    source: v,
  };
}

export function liveRecord(m: Maintenance): GarageRecord {
  const km = formatKm(m.mileage);
  return {
    id: m.id,
    vehicleId: m.vehicleId,
    title: m.title,
    detail: m.note ? `${m.note} · ${km}` : km,
    kind: 'bakim',
    icon: 'wrench',
    document: m.attachmentIds?.length ? 'Belge' : null,
    amount: m.amount,
    date: m.date,
    source: m,
  };
}

/** A stored reminder as shown on W11. `vehicle` gives the last recorded mileage for km targets. */
export function liveReminder(r: Reminder, vehicle: Pick<Vehicle, 'mileage'> | undefined, today: string): GarageReminderView {
  const active = !r.completed;
  const status = vehicle ? reminderStatus(r, vehicle as Vehicle, today) : {overdue: false, remainingKm: undefined};
  const channels = r.channels ?? [];
  const base = {
    id: r.id,
    vehicleId: r.vehicleId,
    topic: r.title,
    label: r.title,
    notifyText: notifyText([r.advanceDays ?? 1]),
    offText: 'Tamamlandı',
    push: channels.includes('push'),
    email: channels.includes('email'),
    active,
    source: r,
  };
  if (r.dueDate) {
    const days = daysBetween(today, r.dueDate);
    const near = status.overdue || days <= 30;
    return {
      ...base,
      dateText: formatDay(r.dueDate) + (r.dueKm !== undefined ? ` · ${formatKm(r.dueKm)}` : ''),
      whenText: formatDay(r.dueDate),
      remaining: remainingText(days),
      progress: ringProgress(days, DATE_WINDOW_DAYS),
      tone: !active ? 'muted' : near ? 'orange' : 'green',
      sort: days,
    };
  }
  const left = status.remainingKm ?? 0;
  const target = formatKm(r.dueKm ?? 0);
  return {
    ...base,
    dateText: `Hedef ${target}`,
    whenText: `Hedef ${target}`,
    remaining: status.remainingKm === undefined ? target : left <= 0 ? 'Eşik geldi' : formatKm(left),
    progress: status.remainingKm === undefined ? 0.04 : ringProgress(left, KM_WINDOW),
    tone: !active ? 'muted' : status.overdue || left <= 1000 ? 'orange' : 'green',
    sort: 1_000_000 + left,
  };
}

/** The vehicle's inspection date as a read-only summary card ("Muayene"), if one is set. */
export function inspectionView(v: GarageVehicle, today: string): GarageReminderView | null {
  if (!v.inspectionDueDate) return null;
  const days = daysBetween(today, v.inspectionDueDate);
  return {
    id: `muayene-${v.id}`,
    vehicleId: v.id,
    topic: 'Araç muayenesi',
    label: 'Muayene',
    dateText: formatDay(v.inspectionDueDate),
    whenText: formatDay(v.inspectionDueDate),
    notifyText: '',
    remaining: remainingText(days),
    offText: '',
    progress: ringProgress(days, 365),
    tone: days <= 30 ? 'orange' : 'green',
    push: false,
    email: false,
    active: true,
    sort: days,
  };
}

/** Same fields the stored reminder has, for PATCH /api/me (the update schema is strict). */
export function reminderPayload(r: Reminder) {
  return {vehicleId: r.vehicleId, title: r.title, dueDate: r.dueDate, dueKm: r.dueKm, channels: r.channels, advanceDays: r.advanceDays, completed: r.completed ?? false};
}

/* ---------- forms ---------- */

export type VehicleDraft = {id?: string; brand: string; model: string; year: number; km: number; fuel: string; transmission: string; plate: string | null; plateHidden: boolean; inspectionDueDate: string};
export type RecordDraft = {vehicleId: string; title: string; place: string; kind: MockRecord['kind']; amount: number; date: string; document: string; mileage: number};
export type ReminderDraft = {vehicleId: string; topic: string; date: string; dueKm: number | null; notify: number[]; push: boolean; email: boolean};

/** Turkish money input: "2400", "2.400", "2400,50", "2.400,50". Null when it is not an amount. */
export function parseAmount(input: string): number | null {
  const text = input.trim().replace(/\s/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$|^\d+\.\d{1,2}$/.test(text)) return null;
  const value = /^\d+\.\d{1,2}$/.test(text) ? Number(text) : Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/** Whole number from "86.400" / "86400"; null for anything else. */
export function parseWhole(input: string): number | null {
  const text = input.trim().replace(/[.\s]/g, '');
  return /^\d{1,9}$/.test(text) ? Number(text) : null;
}

/** Live vehicle (vehicleSchema). The photo stays as it was; plate and transmission are not stored. */
export function vehicleInput(draft: VehicleDraft, existing?: Vehicle) {
  return vehicleSchema.parse({
    brand: draft.brand,
    model: draft.model,
    year: draft.year,
    fuel: draft.fuel,
    mileage: draft.km,
    ...(draft.inspectionDueDate ? {inspectionDueDate: draft.inspectionDueDate} : {}),
    ...(existing?.photoId ? {photoId: existing.photoId} : {}),
  });
}

/** Live maintenance record (maintenanceSchema). Kind and document label have no field in the model. */
export function maintenanceInput(draft: RecordDraft) {
  return maintenanceSchema.parse({vehicleId: draft.vehicleId, title: draft.title, date: draft.date, mileage: draft.mileage, amount: draft.amount, note: draft.place});
}

/** Live reminder (reminderSchema): one notice day, push / e-mail preference. */
export function reminderInput(draft: ReminderDraft) {
  const channels = [...(draft.push ? ['push' as const] : []), ...(draft.email ? ['email' as const] : [])];
  return reminderSchema.parse({
    vehicleId: draft.vehicleId,
    title: draft.topic,
    completed: false,
    ...(draft.date ? {dueDate: draft.date} : {}),
    ...(draft.dueKm !== null ? {dueKm: draft.dueKm} : {}),
    channels,
    advanceDays: draft.notify[0] ?? 0,
  });
}

/** "d***@example.com" */
export function maskEmail(email: string) {
  const [user = '', domain = ''] = email.split('@');
  return domain ? `${user.charAt(0)}***@${domain}` : '';
}

/** Readable message for a failed garage write (app.save / app.update). */
export function garageErrorMessage(error: unknown) {
  if (error instanceof AccountRequestError) {
    if (error.status === 401) return 'Oturum süresi doldu. Yeniden giriş yap.';
    if (error.status === 403) return 'Önce e-posta adresini doğrula. Bağlantıyı Hesabım › Güvenlik bölümünden yeniden isteyebilirsin.';
    if (error.status === 429) return 'Çok fazla işlem yapıldı. Biraz sonra tekrar dene.';
    return error.message;
  }
  if (error instanceof Error && error.message && !error.message.startsWith('[') && !error.message.includes('_')) return error.message;
  return 'Bilgileri kontrol edip tekrar dene.';
}
