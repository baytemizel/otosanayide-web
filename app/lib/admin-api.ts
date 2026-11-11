import {z} from 'zod';
import {callApi} from './api-read';

const ms = z.number().int().nonnegative().safe();
type Token = () => Promise<string>;

/* web-16 (1) overview: queue counts only */
export const overviewSchema = z.object({queues: z.record(z.string().max(40), z.number().int().nonnegative()), generatedAtMs: ms}).passthrough();
/* web-16 (4) read-only flags */
export const flagsSchema = z.object({
  flags: z.array(z.object({name: z.string().max(80), key: z.string().max(80), enabled: z.boolean(), source: z.string().max(20)}).passthrough()).max(200),
  workers: z.array(z.object({key: z.string().max(80), enabled: z.boolean(), source: z.string().max(20)}).passthrough()).max(200).default([]),
  pushDriver: z.string().max(20).optional(),
  writable: z.literal(false),
}).passthrough();
/* web-04 admin queue */
export const businessReportSchema = z.object({
  id: z.string().uuid(), businessId: z.string().min(1).max(120), businessName: z.string().max(160),
  reason: z.enum(['closed', 'moved', 'phone', 'address', 'location', 'hours', 'services', 'other']), note: z.string().max(1000),
  status: z.enum(['submitted', 'resolved', 'dismissed']), version: z.number().int().nonnegative(), resolution: z.string().max(1000).nullable(),
  createdAtMs: ms, updatedAtMs: ms,
}).passthrough();
export type BusinessReport = z.infer<typeof businessReportSchema>;
/* web-10 admin export queue */
export const adminExportSchema = z.object({
  id: z.string().uuid(), ownerUid: z.string().min(1).max(128), status: z.enum(['submitted', 'in_progress', 'delivered', 'rejected', 'cancelled']),
  version: z.number().int().nonnegative(), reason: z.string().max(80).nullable(), createdAtMs: ms, updatedAtMs: ms,
}).passthrough();
export type AdminExport = z.infer<typeof adminExportSchema>;
const page = <T extends z.ZodTypeAny>(item: T) => z.object({items: z.array(item).max(50), next: z.string().max(256).nullable()}).passthrough();

export const adminApi = {
  overview: async (token: Token) => callApi('/api/admin/overview', {token: await token()}, raw => overviewSchema.parse(raw)),
  flags: async (token: Token) => callApi('/api/admin/flags', {token: await token()}, raw => flagsSchema.parse(raw)),
  reports: async (token: Token, status: 'submitted' | 'resolved' | 'dismissed', after = '') =>
    callApi(`/api/admin/business-reports?status=${status}${after ? '&after=' + encodeURIComponent(after) : ''}`, {token: await token()}, raw => page(businessReportSchema).parse(raw)),
  decideReport: async (token: Token, value: {id: string; expectedVersion: number; decision: 'resolved' | 'dismissed'; resolution: string}) =>
    callApi('/api/admin/business-reports', {method: 'PATCH', token: await token(), body: value}, raw => z.object({ok: z.literal(true)}).passthrough().parse(raw)),
  exports: async (token: Token, status: 'submitted' | 'in_progress', after = '') =>
    callApi(`/api/admin/privacy?kind=export&status=${status}${after ? '&after=' + encodeURIComponent(after) : ''}`, {token: await token()}, raw => page(adminExportSchema).parse(raw)),
  decideExport: async (token: Token, value: {requestId: string; expectedVersion: number; action: 'start' | 'deliver' | 'reject'; reason?: string}) =>
    callApi('/api/admin/privacy', {method: 'POST', token: await token(), body: {kind: 'export', ...value}}, raw => raw),
};
