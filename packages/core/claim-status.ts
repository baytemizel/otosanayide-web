import {z} from 'zod';
import {documentId} from './claim-review';
export const claimReplySchema=z.object({claimId:documentId,message:z.string().trim().min(10).max(2000)}).strict();
export const claimStatusLabels:Record<string,string>={submitted:'İncelemede',needs_information:'Ek bilgi bekleniyor',approved:'Onaylandı',rejected:'Reddedildi'};
export function ownClaimView(id:string,data:Record<string,unknown>){return {id,name:data.name,city:data.city,address:data.address,status:data.status,reviewReason:typeof data.reviewReason==='string'?data.reviewReason:'',businessId:typeof data.businessId==='string'?data.businessId:null,reply:typeof data.reply==='string'?data.reply:''};}
export function canReplyToClaim(uid:string,claim:Record<string,unknown>|undefined){return !!claim&&claim.userId===uid&&claim.status==='needs_information';}
