import {z} from 'zod';import {reviewIdSchema} from './review-policy';
export const caseInput=z.object({reviewId:reviewIdSchema,kind:z.enum(['report','appeal']),text:z.string().trim().min(10).max(2000)}).strict();
export const caseDecision=z.object({id:reviewIdSchema,decision:z.enum(['dismiss','remove','reopen','superseded']),reason:z.string().trim().min(10).max(1000),reviewed:z.literal(true)}).strict();
export function canFileCase(uid:string,kind:string,r:Record<string,unknown>|undefined){return !!r&&(kind==='report'?r.status==='approved'&&r.userId!==uid:r.userId===uid&&['rejected','hidden'].includes(String(r.status)));}
export function caseAction(uid:string,c:Record<string,unknown>,r:Record<string,unknown>|undefined,decision:string){
 if(c.status!=='open')throw Error('Başvuru zaten sonuçlandı.');
 if(uid===c.userId||uid===r?.userId||(c.kind==='appeal'&&uid===r?.reviewedBy))throw Error('Bu başvuruyu başka bir yönetici incelemeli.');
 const stale=!r||r.businessId!==c.businessId||(r.version??1)!==c.reviewVersion;
 if(decision==='superseded'){if(!stale)throw Error('İçerik sürümü değişmedi.');return 'none';}
 if(stale)throw Error('İçerik değişti; başvuruyu güncelliğini yitirmiş olarak kapat.');
 if(decision==='dismiss')return 'none';
 if(decision==='remove'&&c.kind==='report'&&r!.status==='approved')return 'hide';
 if(decision==='reopen'&&c.kind==='appeal'&&['rejected','hidden'].includes(String(r!.status)))return 'pending';
 throw Error('Bu başvuru için karar kullanılamıyor.');
}
export function caseView(id:string,v:Record<string,unknown>){return {id,reviewId:v.reviewId,businessId:v.businessId,kind:v.kind,text:v.text,status:v.status,decision:v.decision??'',reason:v.reason??''};}
