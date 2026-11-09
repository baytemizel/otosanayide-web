import {z} from 'zod';
export const refundReviewTarget=z.object({reservationId:z.string().uuid(),eventId:z.string().regex(/^[A-Za-z0-9-]{1,128}$/)}).strict();
export const refundReviewQuery=refundReviewTarget.extend({before:z.string().regex(/^[1-9]\d{0,8}$/).transform(Number).optional()});
export const refundReviewAction=refundReviewTarget.extend({version:z.number().int().min(0).max(999999998),status:z.enum(['reviewing','closed']),note:z.string().trim().min(10).max(1000),acknowledged:z.boolean().default(false)}).refine(v=>v.status!=='closed'||v.acknowledged);
export const refundReviewStatus=z.enum(['open','reviewing','closed']);
export const refundReviewHistory=z.object({version:z.number().int().positive().max(999999999),previousStatus:refundReviewStatus,status:z.enum(['reviewing','closed']),note:z.string().min(10).max(1000),updatedAtMs:z.number().int().nonnegative().safe()}).strict();
export const refundReviewResponse=refundReviewTarget.extend({enabled:z.boolean(),status:refundReviewStatus,version:z.number().int().min(0).max(999999999),note:z.string().max(1000),updatedAtMs:z.number().int().nonnegative().safe().nullable(),history:z.array(refundReviewHistory).max(20),next:z.number().int().positive().nullable()});
export const refundReviewLabels={open:'İnceleme açılmadı',reviewing:'Uzlaştırma inceleniyor',closed:'İdari inceleme kapatıldı'};
