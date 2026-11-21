import {
  garagePlateSchema, garageTransmissions, maintenanceSchema, normalizeGaragePlate, reminderSchema, reminderStatus, vehicleSchema,
  type Maintenance, type Reminder, type Vehicle, type maintenanceDocumentKinds, type maintenanceTypes, type reminderTopics,
} from '@otosanayide/core';
import {AccountRequestError} from '@otosanayide/core/account-client';
import {turkish, type Translate} from '~/lib/i18n';
import type {MockRecord, MockRecordIcon, MockVehicle} from '~/data/mock/garage';

/**
 * W11 Araçlarım / W12 Hatırlatma view models. Demo data (app/data/mock/garage.ts) already has the
 * MockVehicle / MockRecord shape; live records from GET /api/me?v=2 are mapped here, including the
 * v2-02 fields (plate, transmission, record type / provider / document label, reminder on/off, topic
 * and several notice days). The account model has no "hide plate" flag; that option stays demo-only.
 *
 * Text (K223): option labels stay Turkish source text that the components translate with `t`. Builders
 * of display text take `t` (default: Turkish passthrough) and a locale tag for dates and numbers
 * (default 'tr-TR'), so the unit tests keep reading Turkish.
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
  /** Right-hand text when switched off ("Kapalı"; live: "Tamamlandı" for a reminder marked completed). */
  offText: string;
  progress: number;
  tone: GarageTone;
  push: boolean;
  email: boolean;
  active: boolean;
  /** Sort key: days left for dated reminders; km-only ones come after every dated one. */
  sort: number;
  /** Live only: the stored reminder (for .ics and the on/off toggle). */
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

export type Transmission = (typeof garageTransmissions)[number];
export type MaintenanceType = (typeof maintenanceTypes)[number];
export type DocumentKind = (typeof maintenanceDocumentKinds)[number];
export type ReminderTopic = (typeof reminderTopics)[number];

/** "Vites" options (vehicle.transmission). */
export const transmissionOptions: {value: Transmission; label: string}[] = [
  {value: 'manual', label: 'Manuel'},
  {value: 'automatic', label: 'Otomatik'},
  {value: 'semi_automatic', label: 'Yarı otomatik'},
];
export const transmissionLabel = (value?: string) => transmissionOptions.find((o) => o.value === value)?.label ?? '';

/** Record "Tür" (maintenance.type): label, history icon and the W11 Bakım / Gider filter it falls under. */
export const recordTypes: {value: MaintenanceType; label: string; icon: MockRecordIcon; kind: MockRecord['kind']}[] = [
  {value: 'periodic', label: 'Periyodik bakım', icon: 'wrench', kind: 'bakim'},
  {value: 'oil', label: 'Yağ değişimi', icon: 'droplet', kind: 'bakim'},
  {value: 'tyre', label: 'Lastik', icon: 'tyre', kind: 'bakim'},
  {value: 'brake', label: 'Fren', icon: 'wrench', kind: 'bakim'},
  {value: 'repair', label: 'Onarım', icon: 'wrench', kind: 'bakim'},
  {value: 'inspection', label: 'Muayene', icon: 'shield', kind: 'gider'},
  {value: 'insurance', label: 'Sigorta', icon: 'shield', kind: 'gider'},
  {value: 'other', label: 'Diğer', icon: 'file', kind: 'bakim'},
];

/** "Belge" options (maintenance.documentKind; '' = none). Only the label is stored, no file. */
export const documentOptions: {value: DocumentKind | ''; label: string}[] = [
  {value: '', label: 'Yok'},
  {value: 'invoice', label: 'Fatura'},
  {value: 'policy', label: 'Poliçe'},
  {value: 'other', label: 'Diğer belge'},
];
const documentTag: Record<DocumentKind, string> = {invoice: 'Fatura', policy: 'Poliçe', other: 'Belge'};

/** W12 "Konu" in live: the title shown on the card plus the API topic it is filed under. */
export const liveReminderTopics: {label: string; topic: ReminderTopic}[] = [
  {label: 'Periyodik bakım', topic: 'periodic'},
  {label: 'Araç muayenesi', topic: 'inspection'},
  {label: 'Lastik değişimi', topic: 'tyre'},
  {label: 'Yağ değişimi', topic: 'oil'},
  {label: 'Trafik sigortası', topic: 'insurance'},
  {label: 'Kasko', topic: 'insurance'},
  {label: 'Egzoz emisyon', topic: 'other'},
  {label: 'Diğer', topic: 'other'},
];
export const reminderTopicFor = (title: string): ReminderTopic => liveReminderTopics.find((t) => t.label === title)?.topic ?? 'other';
/** Summary-card eyebrow, as in the mock ("Sonraki bakım", "Muayene"); other topics use the title. */
const topicEyebrow: Partial<Record<ReminderTopic, string>> = {periodic: 'Sonraki bakım', inspection: 'Muayene'};

/** At most three notice days per reminder (API advanceDaysList: 1–3 of 0, 1, 3, 7). */
export const MAX_NOTICE_DAYS = 3;

/** Plate as the API stores it ("34abc123" → "34 ABC 123"), or an error text (Turkish source). Empty input = no plate. */
export function checkPlate(input: string): {plate: string | null; error: string} {
  if (!input.trim()) return {plate: null, error: ''};
  const plate = normalizeGaragePlate(input);
  return garagePlateSchema.safeParse(plate).success ? {plate, error: ''} : {plate: null, error: 'Plakayı 34 ABC 123 biçiminde yaz.'};
}

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
export function remainingText(days: number, t: Translate = turkish) {
  if (days < 0) return t('{count} gün geçti', {count: -days});
  if (days === 0) return t('Bugün');
  if (days <= 60) return t('{count} gün', {count: days});
  return t('{count} ay', {count: Math.round(days / 30.4)});
}

/** Share of a window that has passed, 0.04..1 (the ring never looks empty while it runs). */
export function ringProgress(left: number, window: number) {
  if (left <= 0) return 1;
  return Math.min(1, Math.max(0.04, 1 - left / window));
}

/** "₺7.850", "₺1.250,5" (kuruş only when there are any). `tag`: the locale tag for the number format. */
export const formatTry = (value: number, tag = 'tr-TR') => `₺${value.toLocaleString(tag, {maximumFractionDigits: 2})}`;
export const formatKm = (value: number, tag = 'tr-TR') => `${value.toLocaleString(tag)} km`;
/** "1 Aralık 2026" for a yyyy-mm-dd date (noon Türkiye time, so no day shift). */
export const formatDay = (date: string, tag = 'tr-TR') => new Date(`${date}T12:00:00+03:00`).toLocaleDateString(tag, {timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric'});

export function notifyText(values: readonly number[], t: Translate = turkish) {
  return notifyOptions.filter((o) => values.includes(o.value)).map((o) => t(o.label)).join(', ');
}

export function liveVehicle(v: Vehicle): GarageVehicle {
  return {
    id: v.id,
    model: `${v.brand} ${v.model}`,
    year: v.year,
    plate: v.plate ?? null,
    plateHidden: false,
    fuel: v.fuel,
    transmission: transmissionLabel(v.transmission),
    km: v.mileage,
    inspectionDueDate: v.inspectionDueDate,
    source: v,
  };
}

/** `document` stays a Turkish source label ("Fatura"); the history row translates it. */
export function liveRecord(m: Maintenance, t: Translate = turkish, tag = 'tr-TR'): GarageRecord {
  const type = recordTypes.find((r) => r.value === m.type);
  // The API returns no business name for businessId; a record linked only to a listed business says so.
  const provider = m.providerName ?? (m.businessId ? t('Kayıtlı servis') : '');
  return {
    id: m.id,
    vehicleId: m.vehicleId,
    title: m.title,
    detail: [provider, m.note, formatKm(m.mileage, tag)].filter(Boolean).join(' · '),
    kind: type?.kind ?? 'bakim',
    icon: type?.icon ?? 'wrench',
    document: m.documentKind ? documentTag[m.documentKind] : m.attachmentIds?.length ? 'Belge' : null,
    amount: m.amount,
    date: m.date,
    source: m,
  };
}

/**
 * A stored reminder as shown on W11. `vehicle` gives the last recorded mileage for km targets.
 * The title is the topic label picked in W12, so it is translated too (an unknown title stays as written).
 */
export function liveReminder(r: Reminder, vehicle: Pick<Vehicle, 'mileage'> | undefined, today: string, t: Translate = turkish, tag = 'tr-TR'): GarageReminderView {
  // Switch = enabled (v2). A reminder marked completed (old web toggle, mobile) also counts as off.
  const active = r.enabled !== false && !r.completed;
  const status = vehicle ? reminderStatus(r, vehicle as Vehicle, today) : {overdue: false, remainingKm: undefined};
  const channels = r.channels ?? [];
  const base = {
    id: r.id,
    vehicleId: r.vehicleId,
    topic: t(r.title),
    label: t((r.topic && topicEyebrow[r.topic]) || r.title),
    notifyText: notifyText(r.advanceDaysList ?? [r.advanceDays ?? 1], t),
    offText: r.completed ? t('Tamamlandı') : t('Kapalı', {ctx: 'switch'}),
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
      dateText: formatDay(r.dueDate, tag) + (r.dueKm !== undefined ? ` · ${formatKm(r.dueKm, tag)}` : ''),
      whenText: formatDay(r.dueDate, tag),
      remaining: remainingText(days, t),
      progress: ringProgress(days, DATE_WINDOW_DAYS),
      tone: !active ? 'muted' : near ? 'orange' : 'green',
      sort: days,
    };
  }
  const left = status.remainingKm ?? 0;
  const target = formatKm(r.dueKm ?? 0, tag);
  return {
    ...base,
    dateText: t('Hedef {target}', {target}),
    whenText: t('Hedef {target}', {target}),
    remaining: status.remainingKm === undefined ? target : left <= 0 ? t('Eşik geldi') : formatKm(left, tag),
    progress: status.remainingKm === undefined ? 0.04 : ringProgress(left, KM_WINDOW),
    tone: !active ? 'muted' : status.overdue || left <= 1000 ? 'orange' : 'green',
    sort: 1_000_000 + left,
  };
}

/** The vehicle's inspection date as a read-only summary card ("Muayene"), if one is set. */
export function inspectionView(v: GarageVehicle, today: string, t: Translate = turkish, tag = 'tr-TR'): GarageReminderView | null {
  if (!v.inspectionDueDate) return null;
  const days = daysBetween(today, v.inspectionDueDate);
  return {
    id: `muayene-${v.id}`,
    vehicleId: v.id,
    topic: t('Araç muayenesi'),
    label: t('Muayene'),
    dateText: formatDay(v.inspectionDueDate, tag),
    whenText: formatDay(v.inspectionDueDate, tag),
    notifyText: '',
    remaining: remainingText(days, t),
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
  return {
    vehicleId: r.vehicleId, title: r.title, dueDate: r.dueDate, dueKm: r.dueKm, channels: r.channels, advanceDays: r.advanceDays, completed: r.completed ?? false,
    enabled: r.enabled ?? true, topic: r.topic, advanceDaysList: r.advanceDaysList,
  };
}

/** Switch on = enabled and no longer completed; switch off = disabled (the API stops planning and sending it). */
export function reminderToggle(r: Reminder, on: boolean) {
  return on ? {...reminderPayload(r), enabled: true, completed: false} : {...reminderPayload(r), enabled: false};
}

/* ---------- forms ---------- */

/** `transmission`: demo label ("Manuel"); live API value ("manual") or '' when not given. */
export type VehicleDraft = {id?: string; brand: string; model: string; year: number; km: number; fuel: string; transmission: string; plate: string | null; plateHidden: boolean; inspectionDueDate: string};
/**
 * `place`: demo "Servis veya not"; live the service name (providerName). Live only: `id` (edit), `type`,
 * `documentKind` ('' = none) and `note`. Demo uses `kind` and the `document` label.
 */
export type RecordDraft = {
  id?: string; vehicleId: string; title: string; place: string; kind: MockRecord['kind']; amount: number; date: string; document: string; mileage: number;
  type?: MaintenanceType; documentKind?: DocumentKind | ''; note?: string;
};
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

/**
 * v2 field for a write: the value, `null` to clear one the stored record has (PATCH), or nothing.
 * Absent fields are kept by the API, so a v2 field this form does not edit is simply not sent.
 */
function v2Field<K extends string, V>(key: K, value: V | null | undefined, stored: unknown) {
  if (value !== null && value !== undefined && value !== '') return {[key]: value} as Record<K, V>;
  return stored !== undefined ? ({[key]: null} as Record<K, null>) : {};
}

/** Strict schema check of a write; `null` values (clear on PATCH) are checked as absent. */
function checked<T extends object>(value: T, schema: {parse: (v: unknown) => unknown}) {
  schema.parse(Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null)));
  return value;
}

/** Live vehicle (vehicleSchema + v2 plate / transmission). The photo and VIN are kept as they were. */
export function vehicleInput(draft: VehicleDraft, existing?: Vehicle) {
  const transmission = (garageTransmissions as readonly string[]).includes(draft.transmission) ? (draft.transmission as Transmission) : null;
  return checked({
    brand: draft.brand,
    model: draft.model,
    year: draft.year,
    fuel: draft.fuel as Vehicle['fuel'],
    mileage: draft.km,
    ...(draft.inspectionDueDate ? {inspectionDueDate: draft.inspectionDueDate} : {}),
    ...(existing?.photoId ? {photoId: existing.photoId} : {}),
    ...v2Field('plate', draft.plate ? normalizeGaragePlate(draft.plate) : null, existing?.plate),
    ...v2Field('transmission', transmission, existing?.transmission),
  }, vehicleSchema);
}

/**
 * Live maintenance record (maintenanceSchema + v2 type / providerName / documentKind). On edit the whole
 * record is sent (PATCH replaces it); businessId is not edited on the web, so it is left out and kept.
 */
export function maintenanceInput(draft: RecordDraft, existing?: Maintenance) {
  return checked({
    vehicleId: draft.vehicleId,
    title: draft.title,
    date: draft.date,
    mileage: draft.mileage,
    amount: draft.amount,
    note: draft.note ?? '',
    ...v2Field('type', draft.type, existing?.type),
    ...v2Field('providerName', draft.place.trim(), existing?.providerName),
    ...v2Field('documentKind', draft.documentKind, existing?.documentKind),
  }, maintenanceSchema);
}

/** Live reminder (reminderSchema + v2): up to three notice days, topic, push / e-mail preference, switched on. */
export function reminderInput(draft: ReminderDraft) {
  const channels = [...(draft.push ? ['push' as const] : []), ...(draft.email ? ['email' as const] : [])];
  const days = [...new Set(draft.notify.length ? draft.notify : [0])].sort((a, b) => a - b).slice(0, MAX_NOTICE_DAYS);
  return reminderSchema.parse({
    vehicleId: draft.vehicleId,
    title: draft.topic,
    completed: false,
    enabled: true,
    topic: reminderTopicFor(draft.topic),
    ...(draft.date ? {dueDate: draft.date} : {}),
    ...(draft.dueKm !== null ? {dueKm: draft.dueKm} : {}),
    channels,
    // advanceDays must equal the earliest (largest) day of the list.
    advanceDays: Math.max(...days),
    advanceDaysList: days,
  });
}

/** "d***@example.com" */
export function maskEmail(email: string) {
  const [user = '', domain = ''] = email.split('@');
  return domain ? `${user.charAt(0)}***@${domain}` : '';
}

/** Readable message for a failed garage write (app.save / app.update): Turkish source text the component translates. */
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
