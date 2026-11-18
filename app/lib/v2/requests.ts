// Pure view-model builders for the Web v2 request and account screens in live mode (W14–W18,
// /yorumlarim, /basvurularim). Demo mode keeps app/data/mock/*; these functions turn API records
// into the shapes the v2 components already draw. No network here.
import {z} from 'zod';
import {requestSchema} from '@otosanayide/core';
import {claimStatusLabels} from '@otosanayide/core/claim-status';
import {requestItem, type RequestItem} from '@otosanayide/core/request-client';
import {ApiError, errorStatus} from '~/lib/api-read';
import {offerExtras, type ExportRequest, type RequestMessage} from '~/lib/member-api';
import type {Notice} from '~/lib/notifications-helpers';
import {istanbulClock} from '~/lib/opening-hours';

const TZ = 'Europe/Istanbul';
const DAY = 86_400_000;

/* ------------------------------------------------------------------ formatting */

/** "₺2.880" / "₺2.880,50": whole lira stay as before, kuruş only when present. */
export const formatMoney = (value: number) => `₺${value.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;

export const longDate = (ms: number) => new Date(ms).toLocaleDateString('tr-TR', {timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric'});
const clock = (ms: number) => new Date(ms).toLocaleTimeString('tr-TR', {timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).replace(':', '.');
export const dateTimeText = (ms: number) => `${new Date(ms).toLocaleDateString('tr-TR', {timeZone: TZ, day: 'numeric', month: 'long', weekday: 'long'})} · ${clock(ms)}`;

/** Short relative time for lists: "12 dk", "3 sa", "Dün", "4 gün", then "12 Kas". */
export function relativeTime(ms: number, now: number) {
  const diff = Math.max(0, now - ms);
  if (diff < 60 * 60_000) return `${Math.max(1, Math.floor(diff / 60_000))} dk`;
  const today = istanbulClock(new Date(now)).date;
  const day = istanbulClock(new Date(ms)).date;
  if (day === today) return `${Math.floor(diff / 3_600_000)} sa`;
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY);
  if (days === 1) return 'Dün';
  if (days < 7) return `${days} gün`;
  return new Date(ms).toLocaleDateString('tr-TR', {timeZone: TZ, day: 'numeric', month: 'short'});
}

/* ------------------------------------------------------------------ errors */

/** A readable Turkish message for a failed live call; the API's own 4xx text is kept when it has one. */
export function liveErrorMessage(error: unknown, fallback = 'İşlem tamamlanamadı. Tekrar dene.', overrides: Partial<Record<number, string>> = {}) {
  const status = errorStatus(error);
  if (overrides[status]) return overrides[status]!;
  if (status === 401) return 'Oturumun sona erdi. Yeniden giriş yap.';
  if (status === 403) return 'Bu işlem için e-posta adresini doğrulaman gerekiyor.';
  if (status === 404) return 'Bu işlem henüz kullanılamıyor.';
  if (status === 429) return 'Çok fazla istek gönderildi. Biraz sonra tekrar dene.';
  if (error instanceof ApiError) return error.message;
  if (error instanceof z.ZodError) return 'Alanları kontrol et.';
  // Internal codes ("request_page", "api_config:missing") and Zod dumps are not shown.
  if (error instanceof Error && error.message.includes(' ') && !error.message.startsWith('[')) return error.message;
  return fallback;
}

/* ------------------------------------------------------------------ W14 wizard */

export interface GarageVehicle {id: string; brand: string; model: string; year: number; fuel?: string; mileage?: number; archived?: boolean}
export interface VehicleOption {id: string; label: string; detail: string; text: string}

/** A garage vehicle as a wizard option; `text` is what the request carries (2–120 characters). */
export function vehicleOption(v: GarageVehicle): VehicleOption {
  const detail = [v.fuel, typeof v.mileage === 'number' ? `${v.mileage.toLocaleString('tr-TR')} km` : ''].filter(Boolean).join(' · ');
  return {id: v.id, label: `${v.brand} ${v.model} · ${v.year}`, detail, text: `${v.brand} ${v.model} ${v.year}`.slice(0, 120)};
}

export function vehicleOptions(vehicles: readonly GarageVehicle[]) {
  return vehicles.filter(v => !v.archived).map(vehicleOption);
}

/** Free-typed "Başka bir araç" text. */
export function otherVehicleText(brand: string, model: string, year: string) {
  return [brand.trim(), model.trim(), year.trim()].filter(Boolean).join(' ').slice(0, 120);
}

export type RequestDraft = {businessId: string; kind: 'quotes' | 'appointments'; service: string; vehicle: string; message: string; preferredDate?: string; preferredSlot?: string};

/**
 * Body of POST /api/requests: the core request schema, then the web-15 `preferredSlot` ("HH:00",
 * appointments with a date only), then the idempotency key.
 */
export function requestBody(draft: RequestDraft, requestKey: string) {
  const value = requestSchema.parse({
    businessId: draft.businessId, kind: draft.kind, service: draft.service, vehicle: draft.vehicle, message: draft.message,
    ...(draft.preferredDate ? {preferredDate: draft.preferredDate} : {}),
  });
  const slot = draft.kind === 'appointments' && value.preferredDate && draft.preferredSlot && /^([01]\d|2[0-3]):00$/.test(draft.preferredSlot) ? {preferredSlot: draft.preferredSlot} : {};
  return {...value, ...slot, requestKey};
}

/** Why a draft cannot be sent yet, in the order the wizard asks. */
export function requestDraftProblem(draft: Pick<RequestDraft, 'service' | 'vehicle' | 'message'>) {
  if (draft.service.trim().length < 2) return 'Bir hizmet seç.';
  if (draft.vehicle.trim().length < 2) return 'Bir araç seç ya da marka ve modeli yaz.';
  if (draft.message.trim().length < 10) return 'Açıklama en az 10 karakter olmalı.';
  if (draft.message.trim().length > 2000) return 'Açıklama en çok 2000 karakter olabilir.';
  return '';
}

/* ------------------------------------------------------------------ W15 requests */

export type LiveRequest = RequestItem & {preferredStartsAt?: string; extras: ReturnType<typeof offerExtras>};
const V2_OFFER_KEYS = ['lines', 'totalMinor', 'currency', 'excluded', 'mayChangeAfterInspection'] as const;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * GET /api/requests?v=2. The v2 additions (offer lines, preferredStartsAt) are taken off and read
 * apart; the remainder must pass the strict core item schema. A malformed item is left out.
 */
export function decodeRequestPage(raw: unknown): {items: LiveRequest[]; next: string | null; dropped: number} {
  if (!isRecord(raw) || !Array.isArray(raw.items)) throw Error('request_page');
  const items: LiveRequest[] = [];
  let dropped = 0;
  for (const entry of raw.items.slice(0, 50)) {
    if (!isRecord(entry)) { dropped++; continue; }
    const {preferredStartsAt, ...core} = entry;
    let extras: ReturnType<typeof offerExtras> = null;
    if (isRecord(core.offer)) {
      const offer = {...core.offer};
      const extra: Record<string, unknown> = {};
      for (const key of V2_OFFER_KEYS) if (key in offer) { extra[key] = offer[key]; delete offer[key]; }
      core.offer = offer;
      extras = Object.keys(extra).length ? offerExtras(extra) : null;
    }
    const parsed = requestItem.safeParse(core);
    if (!parsed.success || items.some(i => i.id === parsed.data.id)) { dropped++; continue; }
    const starts = typeof preferredStartsAt === 'string' && !Number.isNaN(Date.parse(preferredStartsAt)) ? preferredStartsAt : undefined;
    items.push({...parsed.data, ...(starts ? {preferredStartsAt: starts} : {}), extras});
  }
  const next = typeof raw.next === 'string' && raw.next.length <= 256 ? raw.next : null;
  return {items, next, dropped};
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected';
export type Tone = 'orange' | 'lime' | 'cream';
export interface OfferLine {item: string; description: string; amount: number}
/** What OfferQuoteCard / OfferPickCard draw. Demo `MockOffer`s already fit. */
export interface OfferCardView {
  id: string;
  code: string;
  businessId: string;
  validUntil: string;
  lines: OfferLine[];
  note: string;
  notes?: string[];
  kind?: 'quote' | 'appointment';
  startsAtText?: string;
  expired?: boolean;
}

const lineLabels = {labour: 'İşçilik', parts: 'Parça', tax: 'KDV', other: 'Diğer'} as const;
const statusText: Record<RequestItem['status'], string> = {
  requested: 'Yanıt bekleniyor', offered: 'Karar bekleniyor', confirmed: 'Kesinleşti', declined: 'İşletme reddetti', cancelled: 'İptal edildi', completed: 'Tamamlandı',
};
const statusTone: Record<RequestItem['status'], Tone> = {requested: 'cream', offered: 'orange', confirmed: 'lime', declined: 'cream', cancelled: 'cream', completed: 'cream'};

export interface RequestView {
  id: string;
  kind: 'quotes' | 'appointments';
  kindText: string;
  service: string;
  vehicle: string;
  message: string;
  businessId: string;
  businessName: string;
  status: RequestItem['status'];
  statusLabel: string;
  tone: Tone;
  offer: OfferCardView | null;
  offerStatus: OfferStatus | null;
  preferredText: string;
  resolution: string;
  version: number;
  canAccept: boolean;
  canCancel: boolean;
  messagesOpen: boolean;
  amount: number | null;
}

/** A member's live request as the W15 screen shows it (one business, at most one offer). */
export function requestView(item: LiveRequest, now: number): RequestView {
  const offer = item.offer;
  const quote = item.kind === 'quotes';
  let lines: OfferLine[] = [];
  if (offer && quote) {
    lines = item.extras?.lines
      ? item.extras.lines.map(line => ({item: lineLabels[line.kind] ?? 'Diğer', description: line.label, amount: line.amountMinor / 100}))
      : offer.price !== undefined ? [{item: 'Ön teklif', description: item.service, amount: offer.price}] : [];
  }
  const expired = !!offer && item.status === 'offered' && offer.expiresAtMs <= now;
  const notes = [
    item.extras?.excluded ? `Dahil olmayan: ${item.extras.excluded}` : '',
    offer && quote && item.extras?.mayChangeAfterInspection !== false ? 'Ön inceleme sonrası değişebilir.' : '',
    expired ? 'Bu önerinin süresi doldu; işletmeden yeni yanıt bekle.' : '',
  ].filter(Boolean);
  const offerView: OfferCardView | null = offer ? {
    id: item.id, code: item.id, businessId: item.businessId, validUntil: longDate(offer.expiresAtMs), lines, note: offer.text, notes,
    kind: quote ? 'quote' : 'appointment', ...(offer.startsAt ? {startsAtText: dateTimeText(Date.parse(offer.startsAt))} : {}), expired,
  } : null;
  const offerStatus: OfferStatus | null = !offer ? null : item.status === 'offered' ? 'pending' : ['confirmed', 'completed'].includes(item.status) ? 'accepted' : 'rejected';
  const preferredText = item.preferredStartsAt ? `${dateTimeText(Date.parse(item.preferredStartsAt))} · onay değildir`
    : item.preferredDate ? `${longDate(Date.parse(`${item.preferredDate}T12:00:00+03:00`))} · onay değildir` : '';
  const amount = lines.length ? lines.reduce((sum, line) => sum + line.amount, 0) : null;
  return {
    id: item.id, kind: item.kind, kindText: quote ? 'Teklif talebi' : 'Randevu talebi', service: item.service, vehicle: item.vehicle, message: item.message,
    businessId: item.businessId, businessName: item.businessName, status: item.status,
    statusLabel: item.status === 'offered' && !quote ? 'Saat önerildi' : statusText[item.status], tone: statusTone[item.status],
    offer: offerView, offerStatus, preferredText, resolution: item.resolution ?? '', version: item.version,
    canAccept: item.status === 'offered' && !expired, canCancel: ['requested', 'offered', 'confirmed'].includes(item.status),
    messagesOpen: ['requested', 'offered', 'confirmed'].includes(item.status), amount,
  };
}

export interface ThreadMessage {from: 'business' | 'member'; text: string; time: string}
export function threadMessage(message: RequestMessage): ThreadMessage {
  return {from: message.author === 'customer' ? 'member' : 'business', text: message.text, time: `${new Date(message.createdAtMs).toLocaleDateString('tr-TR', {timeZone: TZ, day: 'numeric', month: 'short'})} ${clock(message.createdAtMs)}`};
}

/* ------------------------------------------------------------------ W16 appointment */

export interface AvailabilityDay {date: string; slots: string[]}
export interface CalendarDay {date: string; short: string; num: string; closed: boolean; free: number; slots: string[]}

export const istanbulToday = (now = new Date()) => istanbulClock(now).date;
export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const utcLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Date(`${date}T00:00:00Z`).toLocaleDateString('tr-TR', {timeZone: 'UTC', ...options});

/** Week strip for the live calendar: `count` days from `from`; a day without slots is shown closed. */
export function calendarDays(from: string, days: readonly AvailabilityDay[], count = 7): CalendarDay[] {
  return Array.from({length: count}, (_, i) => {
    const date = addDays(from, i);
    const slots = [...(days.find(d => d.date === date)?.slots ?? [])].sort();
    return {date, short: utcLabel(date, {weekday: 'short'}).replace('.', '').toLocaleUpperCase('tr-TR'), num: String(Number(date.slice(8, 10))), closed: !slots.length, free: slots.length, slots};
  });
}

/** "09:00" → "09.00" (the v2 screens write times with a dot). */
export const slotLabel = (slot: string) => slot.replace(':', '.');
export const dayLongText = (date: string) => `${utcLabel(date, {weekday: 'long'})} ${utcLabel(date, {day: 'numeric', month: 'long'})}`;
export const monthTitle = (date: string) => {
  const text = utcLabel(date, {month: 'long', year: 'numeric'});
  return text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1);
};

/* ------------------------------------------------------------------ W17 notifications */

const noticeSchema = z.object({
  id: z.string().min(1).max(200), createdAtMs: z.number().int().nonnegative(), read: z.boolean(),
  requestId: z.string().max(200).optional(), status: z.string().max(40).optional(), kind: z.literal('reminder').optional(),
  vehicleLabel: z.string().max(200).optional(), title: z.string().max(200).optional(), phase: z.string().max(40).optional(),
  dueDate: z.string().max(20).nullable().optional(), dueKm: z.number().nullable().optional(),
}).passthrough();

export function decodeNotices(raw: unknown): {items: Notice[]; next: string | null} {
  if (!isRecord(raw) || !Array.isArray(raw.items)) throw Error('notice_page');
  const items = raw.items.flatMap(entry => {
    const parsed = noticeSchema.safeParse(entry);
    return parsed.success ? [parsed.data as Notice] : [];
  });
  return {items, next: typeof raw.next === 'string' ? raw.next : null};
}

/** NotificationRow's shape (same as the demo `MockNotification`). */
export interface NotificationView {id: string; kind: 'talep' | 'yorum' | 'garaj'; icon: 'file' | 'calendar' | 'bell' | 'message' | 'shield'; tone: 'orange' | 'lime' | 'sky' | 'cream'; title: string; text: string; time: string; unread: boolean; to: string}

const noticeTitles: Record<string, string> = {requested: 'Talebin iletildi', offered: 'Yanıt geldi', confirmed: 'Talep kesinleşti', declined: 'İşletme reddetti', cancelled: 'Talep iptal edildi', completed: 'Talep tamamlandı'};
const phaseText: Record<string, string> = {advance: 'Hatırlatma tarihin yaklaşıyor', mileage: 'Kilometre hedefine ulaşıldı'};

export function notificationView(notice: Notice, now: number): NotificationView {
  const time = relativeTime(notice.createdAtMs, now);
  if (notice.kind === 'reminder') {
    const due = [notice.dueDate ? longDate(Date.parse(`${notice.dueDate}T12:00:00+03:00`)) : '', notice.dueKm != null ? `${notice.dueKm.toLocaleString('tr-TR')} km` : ''].filter(Boolean).join(' · ');
    return {
      id: notice.id, kind: 'garaj', icon: 'bell', tone: 'sky', title: notice.title || 'Araç hatırlatması',
      text: [notice.vehicleLabel, phaseText[notice.phase ?? ''] ?? 'Hatırlatma tarihi geldi veya geçti', due].filter(Boolean).join(' · '),
      time, unread: !notice.read, to: '/hatirlatmalar',
    };
  }
  const status = notice.status ?? '';
  return {
    id: notice.id, kind: 'talep', icon: status === 'confirmed' ? 'calendar' : 'file', tone: status === 'offered' ? 'orange' : status === 'confirmed' ? 'lime' : 'cream',
    title: noticeTitles[status] ?? 'Talep güncellemesi', text: 'Olay anındaki durum. Güncel bilgi için talebi aç.',
    time, unread: !notice.read, to: notice.requestId ? `/taleplerim?talep=${encodeURIComponent(notice.requestId)}` : '/taleplerim',
  };
}

/** Filter chip → `kind` query of GET /api/notifications (web-11). Reviews have no notifications in the API. */
export const noticeKindParam = (filter: string) => (filter === 'talep' ? 'request' : filter === 'garaj' ? 'reminder' : '');

/* ------------------------------------------------------------------ W18 data export */

export const exportLabels: Record<ExportRequest['status'], string> = {submitted: 'Talep alındı', in_progress: 'Hazırlanıyor', delivered: 'Teslim edildi', rejected: 'Reddedildi', cancelled: 'İptal edildi'};

export function exportSummary(items: readonly ExportRequest[]) {
  const latest = [...items].sort((a, b) => b.createdAtMs - a.createdAtMs)[0] ?? null;
  const open = items.some(i => i.status === 'submitted' || i.status === 'in_progress');
  return {latest, open, label: latest ? `${exportLabels[latest.status]} · ${longDate(latest.updatedAtMs)}` : '', tone: (latest && ['delivered'].includes(latest.status) ? 'lime' : latest && open ? 'orange' : 'cream') as Tone};
}

export function exportErrorMessage(error: unknown) {
  return liveErrorMessage(error, 'Talep gönderilemedi. Tekrar dene.', {
    428: 'Güvenlik için son 10 dakika içinde yeniden giriş yapman gerekiyor. Çıkış yapıp tekrar giriş yap.',
    409: 'Açık bir veri kopyası talebin var.',
    429: 'Günde bir veri kopyası talebi verebilirsin.',
    403: 'Veri kopyası istemek için önce e-posta adresini doğrula.',
  });
}

/* ------------------------------------------------------------------ /yorumlarim */

export const ownReviewStatus = {
  pending: {label: 'İncelemede', tone: 'orange'}, approved: {label: 'Yayında', tone: 'lime'}, rejected: {label: 'Yayımlanmadı', tone: 'cream'},
  hidden: {label: 'Gizlendi', tone: 'cream'}, withdrawn: {label: 'Geri çekildi', tone: 'cream'},
} as const satisfies Record<string, {label: string; tone: Tone}>;

export interface OwnReviewRow {id: string; businessId: string; business: string; available: boolean; rating: number | null; text: string; date: string; status: string; label: string; tone: Tone; reason: string; version: number; canEdit: boolean; canWithdraw: boolean}

export function ownReviewRow(item: {businessId: string; businessName: string; businessAvailable?: boolean; updatedAtMs?: number; review: {id: string; text: string; rating: number | null; status: string; reason: string; version: number; canEdit: boolean; canWithdraw: boolean}}): OwnReviewRow {
  const status = ownReviewStatus[item.review.status as keyof typeof ownReviewStatus] ?? {label: 'Belirtilmedi', tone: 'cream' as const};
  return {
    id: item.review.id, businessId: item.businessId, business: item.businessName || 'İşletme', available: item.businessAvailable !== false,
    rating: item.review.rating, text: item.review.text, date: item.updatedAtMs ? longDate(item.updatedAtMs) : '', status: item.review.status,
    label: status.label, tone: status.tone, reason: item.review.reason, version: item.review.version, canEdit: item.review.canEdit, canWithdraw: item.review.canWithdraw,
  };
}

/* ------------------------------------------------------------------ /basvurularim */

const claimSchema = z.object({
  id: z.string().min(1).max(200), name: z.string().max(240).optional().default(''), city: z.string().max(80).optional().default(''),
  address: z.string().max(500).optional().default(''), status: z.string().max(40), reviewReason: z.string().max(2000).optional().default(''),
  businessId: z.string().max(120).nullable().optional().default(null), reply: z.string().max(2000).optional().default(''),
}).passthrough();
export type LiveClaim = z.infer<typeof claimSchema>;

export function decodeClaims(raw: unknown): LiveClaim[] {
  if (!isRecord(raw) || !Array.isArray(raw.claims)) throw Error('claims');
  return raw.claims.flatMap(entry => {
    const parsed = claimSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

const claimNotes: Record<string, string> = {
  submitted: 'Başvurun ekibimizde inceleniyor.',
  needs_information: 'Ek bilgi istendi. Aşağıdan yanıt verebilirsin.',
  approved: 'Onaylandı. İşletmeyi işletme panelinden yönetirsin.',
  rejected: 'Başvuru onaylanmadı.',
};

export function claimRow(claim: LiveClaim) {
  return {
    id: claim.id, businessId: claim.businessId, business: claim.name || 'İşletme', place: [claim.city].filter(Boolean).join(''),
    label: claimStatusLabels[claim.status] ?? 'Belirtilmedi', tone: (claim.status === 'approved' ? 'lime' : claim.status === 'rejected' ? 'cream' : 'orange') as Tone,
    note: claim.reviewReason || claimNotes[claim.status] || '', reply: claim.reply, canReply: claim.status === 'needs_information',
  };
}
