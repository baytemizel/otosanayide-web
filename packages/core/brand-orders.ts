import {z} from 'zod';
export const brandOrderInput=z.object({reservationId:z.string().uuid()}).strict();
const minor=z.number().int().nonnegative().max(18_000_000_000);
export const brandOrderRecord=z.object({reservationId:z.string().uuid(),campaignId:z.string().uuid(),campaignVersion:z.number().int().positive(),tariffVersion:z.number().int().positive(),capacityVersion:z.number().int().positive(),currency:z.literal('TRY'),subtotalMinor:minor,taxMinor:minor,totalMinor:minor,createdAtMs:z.number().int().nonnegative(),expiresAtMs:z.number().int().positive(),status:z.literal('prepared')}).strict().refine(v=>v.totalMinor>0&&v.totalMinor===v.subtotalMinor+v.taxMinor&&v.expiresAtMs>v.createdAtMs);
export type BrandOrderRecord=z.infer<typeof brandOrderRecord>;
export type BrandOrderStatus='prepared'|'expired'|'cancelled'|'invalidated';
export function brandOrderView(o:BrandOrderRecord,status:BrandOrderStatus){return {...o,id:o.reservationId,status,payable:false as const};}
