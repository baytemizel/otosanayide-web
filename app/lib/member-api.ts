import {z} from 'zod';
import {callApi} from './api-read';

const ms = z.number().int().nonnegative().safe();
const id = z.string().regex(/^[A-Za-z0-9_-]{1,120}$/);
const uuid = z.string().uuid();
type Token = () => Promise<string>;

/* web-09 notification preferences */
export const PRODUCT_NEWS_TEXT_VERSION = 'product-news-2026-11';
const delivery = z.enum(['not_enabled', 'enabled']).or(z.string().max(40));
export const preferencesSchema = z.object({
  version: z.number().int().nonnegative(),
  requestUpdates: z.object({inApp: z.literal(true), push: z.boolean(), email: z.boolean()}).passthrough(),
  reminderEmail: z.boolean(),
  productNews: z.object({enabled: z.boolean(), consentAtMs: ms.nullable(), source: z.string().max(20).nullable(), textVersion: z.string().max(80).nullable()}).passthrough(),
  delivery: z.object({requestUpdatesPush: delivery, requestUpdatesEmail: delivery, productNews: delivery}).passthrough(),
  updatedAtMs: ms.nullable(),
}).passthrough();
export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferenceChanges = Partial<{requestUpdatesPush: boolean; requestUpdatesEmail: boolean; reminderEmail: boolean; productNews: boolean; productNewsTextVersion: string}>;
export const preferencesApi = {
  read: async (token: Token) => callApi('/api/me/preferences', {token: await token()}, raw => preferencesSchema.parse(raw)),
  change: async (token: Token, expectedVersion: number, changes: PreferenceChanges) => {
    const body = {expectedVersion, changes: changes.productNews === true ? {...changes, productNewsTextVersion: PRODUCT_NEWS_TEXT_VERSION} : changes};
    return callApi('/api/me/preferences', {method: 'PATCH', token: await token(), body}, raw => preferencesSchema.parse(raw));
  },
};

/* web-13 lists */
export const listSchema = z.object({
  id: uuid, name: z.string().min(1).max(60), kind: z.enum(['list', 'comparison']), businessIds: z.array(id).max(100),
  unavailableIds: z.array(id).max(100).default([]), version: z.number().int().nonnegative(), createdAtMs: ms, updatedAtMs: ms,
}).passthrough();
export type SavedList = z.infer<typeof listSchema>;
export const listsApi = {
  read: async (token: Token) => callApi('/api/me/lists', {token: await token()}, raw => z.object({items: z.array(listSchema).max(20)}).passthrough().parse(raw).items),
  create: async (token: Token, value: {name: string; kind: 'list' | 'comparison'; businessIds: string[]}, operationId: string) =>
    callApi('/api/me/lists', {method: 'POST', token: await token(), body: {...value, operationId}}, raw => listSchema.parse(raw)),
  change: async (token: Token, value: {id: string; expectedVersion: number; name?: string; add?: string[]; remove?: string[]}) =>
    callApi('/api/me/lists', {method: 'PATCH', token: await token(), body: value}, raw => listSchema.parse(raw)),
  remove: async (token: Token, listId: string) => callApi('/api/me/lists?id=' + encodeURIComponent(listId), {method: 'DELETE', token: await token()}, () => null),
};

/* web-10 data export requests (prepared by an operator; no download) */
export const exportSchema = z.object({
  id: uuid, status: z.enum(['submitted', 'in_progress', 'delivered', 'rejected', 'cancelled']), version: z.number().int().nonnegative(),
  reason: z.string().max(80).nullable(), createdAtMs: ms, updatedAtMs: ms,
}).passthrough();
export type ExportRequest = z.infer<typeof exportSchema>;
export const exportsApi = {
  read: async (token: Token) => callApi('/api/me/privacy/exports', {token: await token()}, raw => z.object({items: z.array(exportSchema).max(20), preparation: z.literal('manual')}).passthrough().parse(raw)),
  create: async (token: Token, operationId: string) => callApi('/api/me/privacy/exports', {method: 'POST', token: await token(), body: {operationId}}, raw => z.object({request: exportSchema, preparation: z.literal('manual')}).passthrough().parse(raw)),
  cancel: async (token: Token, item: ExportRequest) => callApi('/api/me/privacy/exports', {method: 'PATCH', token: await token(), body: {id: item.id, expectedVersion: item.version, action: 'cancel'}}, raw => z.object({request: exportSchema}).passthrough().or(exportSchema).parse(raw)),
};

/* web-12 coverage waitlist */
const waitItem = z.object({city: z.string().min(2).max(40), createdAtMs: ms}).passthrough();
export const waitlistApi = {
  read: async (token: Token) => callApi('/api/coverage/waitlist', {token: await token()}, raw => z.object({items: z.array(waitItem).max(10)}).passthrough().parse(raw).items),
  join: async (token: Token, city: string) => callApi('/api/coverage/waitlist', {method: 'POST', token: await token(), body: {city}}, raw => waitItem.parse(raw)),
  leave: async (token: Token, city: string) => callApi('/api/coverage/waitlist?city=' + encodeURIComponent(city), {method: 'DELETE', token: await token()}, () => null),
};

/* web-15 (2) request messages */
export const messageSchema = z.object({id: z.string().min(1).max(128), author: z.enum(['customer', 'business']), text: z.string().max(1000), createdAtMs: ms}).passthrough();
export type RequestMessage = z.infer<typeof messageSchema>;
export const messagesApi = {
  read: async (token: Token, requestId: string, after = '') => callApi(`/api/requests/messages?id=${encodeURIComponent(requestId)}${after ? '&after=' + encodeURIComponent(after) : ''}`, {token: await token()},
    raw => z.object({items: z.array(messageSchema).max(100), next: z.string().max(256).nullable()}).passthrough().parse(raw)),
  send: async (token: Token, requestId: string, text: string, operationId: string) => callApi('/api/requests/messages', {method: 'POST', token: await token(), body: {id: requestId, text, operationId}}, raw => messageSchema.parse(raw)),
};

/* web-15 (3) public availability */
export const availabilitySchema = z.object({
  timezone: z.literal('Europe/Istanbul'),
  slotMinutes: z.union([z.literal(60), z.literal(120)]).nullable(),
  days: z.array(z.object({date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), slots: z.array(z.string().regex(/^([01]\d|2[0-3]):00$/)).max(24)}).passthrough()).max(14),
}).passthrough();
export type Availability = z.infer<typeof availabilitySchema>;
export const availabilityApi = {
  read: (businessId: string, from: string, days = 7) => callApi(`/api/businesses/${encodeURIComponent(businessId)}/availability?from=${from}&days=${days}`, {}, raw => availabilitySchema.parse(raw)),
};

/* portal-05 offer lines on GET /api/requests?v=2 (customer view reads them) */
export const offerExtrasSchema = z.object({
  lines: z.array(z.object({kind: z.enum(['labour', 'parts', 'tax', 'other']), label: z.string().max(120), amountMinor: z.number().int().positive().safe()}).passthrough()).min(1).max(20).optional(),
  totalMinor: z.number().int().positive().safe().optional(),
  currency: z.literal('TRY').optional(),
  excluded: z.string().max(500).optional(),
  mayChangeAfterInspection: z.boolean().optional(),
}).passthrough().refine(v => !v.lines || v.totalMinor === v.lines.reduce((n, l) => n + l.amountMinor, 0));
export function offerExtras(raw: unknown) {
  const parsed = offerExtrasSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/* web-17 own reviews list lives in own-reviews.ts; web-04 report in business-report.ts */
