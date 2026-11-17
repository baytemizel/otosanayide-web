// Synthetic garage data for the Web v2 account screens (W11 Araçlarım, W12 Hatırlatma, W13 Kaydedilenler).
// Plates are obviously fake ("ÖRN"), workshops start with "Örnek". Nothing here is real member data.
import {useState} from '#imports';

export interface MockVehicle {
  id: string;
  /** "BMW 320i" */
  model: string;
  year: number;
  /** Null when the member did not add a plate (plate is optional). */
  plate: string | null;
  /** Plate is masked in lists ("(gizli)") but shown on the selected vehicle. */
  plateHidden: boolean;
  fuel: string;
  transmission: string;
  km: number;
}

export type MockRecordKind = 'bakim' | 'gider';
export type MockRecordIcon = 'wrench' | 'tyre' | 'shield' | 'battery' | 'droplet' | 'file';

export interface MockRecord {
  id: string;
  vehicleId: string;
  title: string;
  /** Second line: workshop · km, or a short note. */
  detail: string;
  kind: MockRecordKind;
  icon: MockRecordIcon;
  /** Attached document label ("Fatura", "Poliçe"), if any. */
  document: string | null;
  amount: number;
  /** ISO date (yyyy-mm-dd). */
  date: string;
}

export type MockNotifyOffset = 0 | 1 | 3 | 7;

export interface MockReminder {
  id: string;
  vehicleId: string;
  topic: string;
  /** Eyebrow on the W11 summary card ("SONRAKİ BAKIM"); falls back to the topic. */
  label?: string;
  /** ISO date-time, Türkiye saati. */
  due: string;
  /** Length of the reminder window in days; the ring shows how much of it has passed. */
  windowDays: number;
  notify: MockNotifyOffset[];
  push: boolean;
  email: boolean;
  active: boolean;
}

export interface MockSavedList {
  id: string;
  name: string;
  businessIds: string[];
}

/** Fixed "today" for the mock screens so the countdowns match the Figma frames. */
export const mockToday = new Date('2026-11-17T09:00:00+03:00');

export const mockVehicles: MockVehicle[] = [
  {id: 'ornek-bmw', model: 'BMW 320i', year: 2019, plate: '34 ÖRN 001', plateHidden: true, fuel: 'Benzin', transmission: 'Otomatik', km: 86400},
  {id: 'ornek-togg', model: 'Togg T10X', year: 2024, plate: null, plateHidden: false, fuel: 'Elektrik', transmission: 'Otomatik', km: 12100},
];

export const mockRecords: MockRecord[] = [
  {id: 'r1', vehicleId: 'ornek-bmw', title: 'Periyodik bakım', detail: 'Örnek Teknik Garaj · 86.400 km', kind: 'bakim', icon: 'wrench', document: 'Fatura', amount: 7850, date: '2026-10-12'},
  {id: 'r2', vehicleId: 'ornek-bmw', title: 'Lastik değişimi', detail: 'Örnek Lastik Noktası · 81.200 km', kind: 'bakim', icon: 'tyre', document: 'Fatura', amount: 2400, date: '2026-06-03'},
  {id: 'r3', vehicleId: 'ornek-bmw', title: 'Trafik sigortası', detail: 'Poliçe yenileme', kind: 'gider', icon: 'shield', document: 'Poliçe', amount: 750, date: '2026-02-18'},
  {id: 'r4', vehicleId: 'ornek-togg', title: 'Batarya kontrolü', detail: 'Örnek Elektrikli Araç Servisi · 10.000 km', kind: 'bakim', icon: 'battery', document: 'Fatura', amount: 1200, date: '2026-09-05'},
  {id: 'r5', vehicleId: 'ornek-togg', title: 'Kasko yenileme', detail: 'Poliçe yenileme', kind: 'gider', icon: 'shield', document: 'Poliçe', amount: 9400, date: '2026-04-01'},
];

export const mockReminders: MockReminder[] = [
  {id: 'h1', vehicleId: 'ornek-bmw', topic: 'Periyodik bakım', label: 'Sonraki bakım', due: '2026-12-01T09:00:00+03:00', windowDays: 70, notify: [0, 1, 7], push: true, email: true, active: true},
  {id: 'h2', vehicleId: 'ornek-bmw', topic: 'Araç muayenesi', label: 'Muayene', due: '2027-02-18T09:00:00+03:00', windowDays: 186, notify: [0, 7], push: true, email: true, active: true},
  {id: 'h3', vehicleId: 'ornek-bmw', topic: 'Trafik sigortası', due: '2027-02-18T09:00:00+03:00', windowDays: 365, notify: [7], push: false, email: true, active: false},
  {id: 'h4', vehicleId: 'ornek-togg', topic: 'Periyodik bakım', label: 'Sonraki bakım', due: '2027-03-10T09:00:00+03:00', windowDays: 365, notify: [0, 7], push: true, email: false, active: true},
];

export const mockReminderTopics = ['Periyodik bakım', 'Araç muayenesi', 'Lastik değişimi', 'Trafik sigortası', 'Kasko', 'Egzoz emisyon', 'Diğer'];

export const mockNotifyOptions: {value: MockNotifyOffset; label: string}[] = [
  {value: 0, label: 'Hedef gün'},
  {value: 1, label: '1 gün önce'},
  {value: 3, label: '3 gün önce'},
  {value: 7, label: '7 gün önce'},
];

export const mockSavedLists: MockSavedList[] = [
  {id: 'kis-hazirligi', name: 'Kış hazırlığı', businessIds: ['ornek-klima-servis', 'ornek-lastik-rot', 'ornek-oto-elektrik']},
  {id: 'bmw-servisleri', name: 'BMW servisleri', businessIds: ['ornek-teknik-garaj', 'ornek-sanayi-motor']},
  {id: 'ekspertiz-adaylari', name: 'Ekspertiz adayları', businessIds: ['ornek-atasehir-ekspertiz']},
];

/** In-memory garage state shared by /araclarim and its modals (resets on reload). */
export function useMockGarage() {
  const vehicles = useState<MockVehicle[]>('v2-mock-vehicles', () => mockVehicles.map((v) => ({...v})));
  const records = useState<MockRecord[]>('v2-mock-records', () => mockRecords.map((r) => ({...r})));
  const reminders = useState<MockReminder[]>('v2-mock-reminders', () => mockReminders.map((r) => ({...r, notify: [...r.notify]})));
  return {vehicles, records, reminders};
}

/** In-memory saved lists for /kaydedilenler. */
export function useMockSavedLists() {
  return useState<MockSavedList[]>('v2-mock-saved-lists', () => mockSavedLists.map((l) => ({...l, businessIds: [...l.businessIds]})));
}

const DAY = 86_400_000;

export function daysUntil(iso: string, from: Date = mockToday) {
  return Math.round((new Date(iso).getTime() - from.getTime()) / DAY);
}

/** "14 gün", "3 ay", "Bugün", "2 gün geçti". */
export function formatRemaining(iso: string) {
  const days = daysUntil(iso);
  if (days < 0) return `${-days} gün geçti`;
  if (days === 0) return 'Bugün';
  if (days <= 60) return `${days} gün`;
  return `${Math.round(days / 30.4)} ay`;
}

/** Share of the reminder window that has passed, 0..1 (the ring fills as the date gets closer). */
export function reminderProgress(reminder: MockReminder) {
  const left = daysUntil(reminder.due);
  if (left <= 0) return 1;
  return Math.min(1, Math.max(0.04, 1 - left / reminder.windowDays));
}

const trDate = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString('tr-TR', {timeZone: 'Europe/Istanbul', ...opts});

/** "1 Aralık 2026" */
export const formatLongDate = (iso: string) => trDate(iso, {day: 'numeric', month: 'long', year: 'numeric'});
/** "1 Aralık 2026 · 09.00" */
export const formatLongDateTime = (iso: string) => `${formatLongDate(iso)} · ${new Date(iso).toLocaleTimeString('tr-TR', {timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit'}).replace(':', '.')}`;
/** "12 Eki 2026" */
export const formatShortDate = (iso: string) => trDate(iso, {day: 'numeric', month: 'short', year: 'numeric'});
/** "₺7.850" */
export const formatTry = (value: number) => `₺${value.toLocaleString('tr-TR', {maximumFractionDigits: 0})}`;
export const formatKmValue = (value: number) => `${value.toLocaleString('tr-TR')} km`;
export const vehicleTitle = (v: MockVehicle) => `${v.model} · ${v.year}`;
