import {z} from 'zod';
import {adTariffSchema} from '@otosanayide/core/ad-inventory';
import {brandDeliveryInput, brandDeliveryLabels} from '@otosanayide/core/brand-delivery';
import {brandCapacity} from '@otosanayide/core/brand-inventory';
import {brandOrderRecord} from '@otosanayide/core/brand-orders';
import {brandMarket, brandTariffView} from '@otosanayide/core/brand-pricing';
import {campaignView, type CampaignView} from '@otosanayide/core/campaigns';
import {brandCreative, brandStatuses} from '@otosanayide/core/brand-campaigns';
import {cancellationHistoryResponse, cancellationQueueResponse} from '@otosanayide/core/brand-cancellation-queue';
import {paymentCaseReasons, paymentCaseStatuses} from '@otosanayide/core/payment-cases';

/**
 * One reader for the ad/brand/payment endpoints (API-B, flags off by default). A closed
 * feature answers 503 with `{error}`; a proxy may answer with HTML. Both become a typed
 * error with a readable message. An open answer is checked against the packages/core
 * shapes before a panel uses it, so a contract drift shows as an error, not a broken panel.
 */
export class AdRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
  get closed() {
    return this.status === 503;
  }
}

export const closedMessage = 'Bu özellik henüz etkin değil.';
export const malformedMessage = 'Sunucu yanıtı beklenen biçimde değil. Sayfayı yenile; sürerse yöneticiye bildir.';
const MAX_BYTES = 512_000;

function fallback(status: number) {
  if (status === 503) return closedMessage;
  if (status === 401) return 'Oturum süresi doldu. Yeniden giriş yap.';
  if (status === 403) return 'Bu işlem için yetkiniz yok.';
  if (status === 409) return 'Kayıt değişti. Sayfayı yenile.';
  if (status === 429) return 'Çok fazla istek gönderildi. Biraz sonra tekrar dene.';
  return 'İşlem tamamlanamadı. Tekrar dene.';
}

async function body(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length > MAX_BYTES) throw new AdRequestError(response.status, malformedMessage);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function readAdResponse<T>(response: Response, decode: (raw: unknown) => T): Promise<T> {
  const raw = await body(response);
  if (!response.ok) {
    const error = raw && typeof raw === 'object' && typeof (raw as {error?: unknown}).error === 'string' ? (raw as {error: string}).error.slice(0, 300) : '';
    throw new AdRequestError(response.status, error || fallback(response.status));
  }
  try {
    return decode(raw);
  } catch {
    throw new AdRequestError(response.status, malformedMessage);
  }
}

const uuidOrId = z.string().min(1).max(128);
const version = z.number().int().nonnegative();

/** GET /api/admin/ad-tariffs → {tariff: AdTariff & {version} | null} */
export const tariffResponse = z.object({tariff: adTariffSchema.extend({version}).nullable()}).strict();
/** PATCH /api/admin/ad-tariffs → {version} */
export const tariffSaved = z.object({version: z.number().int().positive()}).strict();

/** The shape `brandView` builds on the server (packages/core/brand-campaigns). */
export const brandViewSchema = z.object({
  id: uuidOrId,
  image: z.object({id: z.string().min(1).max(128), width: z.number().int().positive(), height: z.number().int().positive(), bytes: z.number().int().positive()}).strict().optional(),
  creative: brandCreative,
  status: z.enum(brandStatuses),
  version,
  note: z.string().max(1000),
  canReview: z.boolean(),
}).strict();
export const brandCampaignPage = z.object({mediaEnabled: z.boolean(), items: z.array(brandViewSchema).max(20), next: uuidOrId.nullable()}).strict();
export const brandCampaignSaved = z.object({item: brandViewSchema}).strict();

const money = z.object({minor: z.number().int().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/)}).strict();
/** `paymentCaseView` plus the optional amounts the finance list adds. */
export const paymentCaseSchema = z.object({
  id: uuidOrId,
  status: z.enum(paymentCaseStatuses),
  version,
  reason: z.string().refine(v => v === 'unknown' || Object.hasOwn(paymentCaseReasons, v)),
  createdAtMs: z.number().int().nonnegative(),
  note: z.string().max(1000),
  expected: money.nullable().optional(),
  received: money.nullable().optional(),
}).strict();
export const paymentCasePage = z.object({items: z.array(paymentCaseSchema).max(20), next: uuidOrId.nullable()}).strict();
/** PATCH answers only the changed fields; the panel merges them into the row. */
export const paymentCaseSaved = z.object({item: paymentCaseSchema.partial().extend({id: uuidOrId})}).strict();

export {cancellationHistoryResponse, cancellationQueueResponse};

const uuid = z.string().uuid();
const ms = z.number().int().nonnegative().safe();
const minor = z.number().int().nonnegative().safe();

/** GET/POST /api/admin/brand-acceptance: readBrandAcceptance (packages/server) plus `enabled`. */
export const brandAcceptanceResponse = z.object({
  reservationId: uuid,
  acceptance: z.object({reservationId: uuid, status: z.literal('accepted'), acceptedAtMs: ms, committedUntilMs: ms, currency: z.literal('TRY'), totalMinor: z.number().int().positive().safe()}).strict()
    .refine(v => v.committedUntilMs > v.acceptedAtMs).nullable(),
  payment: z.object({recordId: z.string().min(1).max(128), status: z.enum(['pending', 'failed', 'verified', 'needs_review', 'unknown']), checkedAtMs: ms.nullable()}).strict(),
  eligible: z.boolean(),
  expiresAtMs: ms.nullable(),
  checkedAtMs: ms,
  enabled: z.boolean(),
}).strict();

/** GET /api/admin/brand-metrics: metricSummary (packages/core/ad-metrics) plus `enabled` and `campaignId`. */
export const brandMetricResponse = z.object({
  rows: z.array(z.object({date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), views: minor, clicks: minor}).strict()).max(90),
  views: minor,
  clicks: minor,
  ctr: z.number().min(0).max(100).nullable(),
  enabled: z.boolean(),
  campaignId: uuid,
}).strict().refine(v => v.views === v.rows.reduce((n, r) => n + r.views, 0) && v.clicks === v.rows.reduce((n, r) => n + r.clicks, 0));

/** brandOrderView: the core order record plus id, derived status and payable:false. */
const brandOrderViewSchema = z.custom<Record<string, unknown>>(raw => {
  if (!raw || typeof raw !== 'object') return false;
  const {id, status, payable, ...record} = raw as Record<string, unknown>;
  return brandOrderRecord.safeParse({...record, status: 'prepared'}).success && id === record.reservationId && payable === false
    && ['prepared', 'expired', 'cancelled', 'invalidated'].includes(status as string);
});
/** GET /api/admin/brand-orders → {enabled, checkoutEnabled, order}; POST → {order}. */
export const brandOrderResponse = z.object({enabled: z.boolean(), checkoutEnabled: z.boolean(), order: brandOrderViewSchema.nullable()}).strict();
export const brandOrderPrepared = z.object({order: brandOrderViewSchema}).strict();

/** The reservation view readBrandHold builds (packages/server/brand-inventory). */
const brandHold = z.object({
  id: uuid, campaignId: uuid, status: z.enum(['held', 'committed', 'released', 'expired']), expiresAtMs: ms,
  committedUntilMs: ms.optional(), totalMinor: z.number().int().positive().safe(), currency: z.literal('TRY'),
  campaignVersion: z.number().int().positive(), tariffVersion: z.number().int().positive(), capacityVersion: z.number().int().positive(),
}).passthrough();
/** GET /api/admin/brand-reservations → {enabled, capacity, reservation}. */
export const brandReservationsResponse = z.object({enabled: z.boolean(), capacity: brandCapacity.nullable(), reservation: brandHold.nullable()}).strict();
export const brandReservationSaved = z.object({reservation: brandHold}).strict();
export const brandReservationReleased = z.object({released: z.literal(true)}).strict();
/** PATCH /api/admin/brand-capacities → {capacity}. */
export const brandCapacitySaved = z.object({capacity: brandCapacity}).strict();

/** GET/PATCH /api/admin/brand-tariffs → {tariff}; checked with the core brandTariffView. */
export const brandTariffResponse = z.object({tariff: z.unknown()}).strict().transform((v, ctx) => {
  if (v.tariff === null) return {tariff: null};
  try {
    return {tariff: brandTariffView(v.tariff as Record<string, unknown>)};
  } catch {
    ctx.addIssue({code: 'custom', message: 'tariff'});
    return z.NEVER;
  }
});
/** POST /api/admin/brand-quote → {quote}: the shape brandPrice (packages/core) builds. */
export const brandQuoteResponse = z.object({quote: z.object({
  kind: z.literal('estimate'), campaignId: uuid, campaignVersion: z.number().int().positive(), tariffVersion: z.number().int().positive(),
  market: brandMarket, startDate: z.string(), endDate: z.string(), days: z.number().int().positive().max(90), currency: z.literal('TRY'),
  dailyMinor: minor, taxBasisPoints: z.number().int().min(0).max(10000), subtotalMinor: minor, taxMinor: minor, totalMinor: minor,
  createdAtMs: ms, expiresAtMs: ms, reservation: z.literal(false), payable: z.literal(false),
}).strict().refine(q => q.totalMinor === q.subtotalMinor + q.taxMinor)}).strict();

/** GET /api/admin/brand-preview → {context, eligible, reason, ad, checkedAtMs}. */
export const brandPreviewResponse = z.object({
  context: brandDeliveryInput,
  eligible: z.boolean(),
  reason: z.string().refine(v => Object.hasOwn(brandDeliveryLabels, v)),
  ad: z.object({brand: z.string(), headline: z.string(), description: z.string(), url: z.string().url(), image: z.object({id: z.string().min(1), width: z.number().int().positive(), height: z.number().int().positive()}).passthrough()}).passthrough().nullable(),
  checkedAtMs: ms,
}).strict().refine(v => v.eligible === (v.reason === 'eligible') && (v.eligible ? v.ad !== null : v.ad === null));
/** POST /api/admin/brand-media → {item: brandView}. */
export const brandMediaSaved = brandCampaignSaved;

/** GET /api/campaigns: every row must survive the core campaignView builder unchanged in meaning. */
const campaignRow = z.custom<CampaignView>(raw => {
  if (!raw || typeof raw !== 'object') return false;
  const row = raw as Record<string, unknown>;
  return typeof row.id === 'string' && campaignView(row.id, row) !== null;
});
export const campaignPage = z.object({business: z.unknown().optional(), items: z.array(campaignRow).max(20), next: z.string().min(1).max(128).nullable()}).strict();
export const campaignSaved = z.object({item: campaignRow}).strict();

/** Binary answers (brand images): an error body is read like JSON, success must be a WebP of sane size. */
export async function readAdImage(response: Response, maxBytes = 2_500_000): Promise<Blob> {
  if (!response.ok) return readAdResponse(response, () => {
    throw new Error('unreachable');
  });
  if (response.headers.get('content-type') !== 'image/webp') throw new AdRequestError(response.status, malformedMessage);
  const blob = await response.blob();
  if (!blob.size || blob.size > maxBytes) throw new AdRequestError(response.status, malformedMessage);
  return blob;
}
