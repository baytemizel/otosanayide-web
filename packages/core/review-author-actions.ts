import {z} from 'zod';import {reviewSchema} from './index';import {reviewIdSchema} from './review-policy';
export const authorReviewAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('edit'),businessId:reviewIdSchema,expectedVersion:z.number().int().positive(),review:reviewSchema}).strict(),
 z.object({action:z.literal('withdraw'),businessId:reviewIdSchema,expectedVersion:z.number().int().positive(),confirmed:z.literal(true)}).strict()
]).refine(v=>v.action!=='edit'||v.businessId===v.review.businessId,'Yorum işletmesi değiştirilemez.');
export function authorReviewPermissions(v:Record<string,unknown>){return {canEdit:v.moderationHold!==true&&['pending','approved','rejected','withdrawn'].includes(String(v.status)),canWithdraw:['pending','approved','rejected','hidden'].includes(String(v.status))};}
export function authorReviewTransition(uid:string,businessId:string,v:Record<string,unknown>|undefined,expectedVersion:number,action:'edit'|'withdraw'){
 if(!v||v.userId!==uid||v.businessId!==businessId)throw Error('Yorum bulunamadı.');
 if((v.version??1)!==expectedVersion)throw Error('Yorum değişti. Güncel sürümü yükleyip yeniden dene.');
 const permissions=authorReviewPermissions(v);if(action==='edit'?!permissions.canEdit:!permissions.canWithdraw)throw Error('Bu yorum için işlem kullanılamıyor.');
 return {status:action==='edit'?'pending':'withdrawn',version:expectedVersion+1,submissionVersion:expectedVersion+1,delta:v.status==='approved'?-1:0,moderationHold:v.moderationHold===true||v.status==='hidden'};
}
