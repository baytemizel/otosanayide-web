import {z} from 'zod';
import {paymentCaseId,paymentCaseAmounts,paymentCaseStatuses,paymentCaseAction} from './payment-cases';
export const brandReviewQuery=z.union([z.object({after:paymentCaseId.optional()}).strict(),z.object({recordId:z.string().uuid()}).strict(),z.object({caseId:paymentCaseId,before:z.coerce.number().int().positive().optional()}).strict()]);
export const brandReviewReasons:Record<string,string>={amount_or_capture:'Tutar, para birimi veya ödeme zamanı uyuşmuyor',additional_payment:'Ek ödeme alındı',expired:'Rezervasyonun süresi doldu',cancelled:'Rezervasyon iptal edildi',invalidated:'Reklam rezervasyonunun koşulları değişti'};
export const brandLedgerLabels:Record<string,string>={pending:'Ödeme sonucu bekleniyor',failed:'Ödeme başarısız',verified:'Ödeme sonucu doğrulandı',needs_review:'Ödeme incelemesi gerekli',unknown:'Doğrulanmış ödeme durumu yok'};
export function brandLedgerView(recordId:string,state:Record<string,unknown>|undefined){return {recordId,status:typeof state?.status==='string'&&['pending','failed','verified','needs_review'].includes(state.status)?state.status:'unknown',checkedAtMs:Number.isSafeInteger(state?.checkedAtMs)&&Number(state?.checkedAtMs)>=0?Number(state?.checkedAtMs):null};}
export function brandReviewView(id:string,c:Record<string,unknown>,order?:Record<string,unknown>,receipt?:Record<string,unknown>,state?:Record<string,unknown>){
 const recordId=z.string().uuid().safeParse(c.recordId),bound=recordId.success&&c.receiptId===id&&receipt?.recordId===c.recordId;
 return {id,recordId:recordId.success?recordId.data:null,status:paymentCaseStatuses.includes(c.status as any)?c.status as typeof paymentCaseStatuses[number]:'unknown',version:Number.isSafeInteger(c.version)&&Number(c.version)>=0?Number(c.version):0,note:typeof c.note==='string'?c.note.slice(0,1000):'',reason:typeof c.reason==='string'&&brandReviewReasons[c.reason]?c.reason:'unknown',createdAtMs:Number.isSafeInteger(c.createdAtMs)&&Number(c.createdAtMs)>=0?Number(c.createdAtMs):null,...paymentCaseAmounts(recordId.success&&order?.reservationId===c.recordId?order:undefined,bound?receipt:undefined),payment:brandLedgerView(recordId.success?recordId.data:'',recordId.success?state:undefined)};
}
export type BrandReviewView=ReturnType<typeof brandReviewView>;

export const brandReviewAction=paymentCaseAction;
export function brandReviewChange(c:Record<string,unknown>,raw:unknown,now:number){
 const a=brandReviewAction.parse(raw),v=c.version===undefined?0:c.version;
 if(!paymentCaseStatuses.includes(c.status as any)||!Number.isSafeInteger(v)||Number(v)<0)throw Error('corrupt');
 if(v!==a.version)throw Error('conflict');if(c.status===a.status)throw Error('state');
 return {status:a.status,version:a.version+1,note:a.note,updatedAtMs:now};
}
export function brandHistoryView(d:Record<string,unknown>){return {version:Number(d.version),status:paymentCaseStatuses.includes(d.status as any)?String(d.status):'unknown',previousStatus:paymentCaseStatuses.includes(d.previousStatus as any)?String(d.previousStatus):'unknown',note:typeof d.note==='string'?d.note.slice(0,1000):'',updatedAtMs:typeof d.updatedAtMs==='number'?d.updatedAtMs:0};}
