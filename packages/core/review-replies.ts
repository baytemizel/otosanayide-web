import {z} from 'zod';
const reviewIdSchema=z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
export const replyInputSchema=z.object({businessId:reviewIdSchema,reviewId:reviewIdSchema,expectedVersion:z.number().int().nonnegative(),text:z.string().trim().min(10).max(2000)}).strict();
export const replyWithdrawSchema=replyInputSchema.omit({text:true});
export function mayReply(uid:string,businessId:string,b:Record<string,unknown>,m?:Record<string,unknown>){return b.published===true&&b.sample!==true&&b.ownership==='verified'&&m?.active===true&&m.userId===uid&&m.businessId===businessId&&['owner','staff'].includes(String(m.role));}
export function replyVersion(previous:Record<string,unknown>|undefined,expected:number){
 if((previous?.version??0)!==expected||previous&&!['rejected','hidden'].includes(String(previous.status)))throw Error('Yanıt değişti veya zaten incelemede/yayında. Listeyi yenile.');
 return expected+1;
}
export function publicReply(v:unknown){if(!v||typeof v!=='object')return undefined;const r=v as Record<string,unknown>;return typeof r.text==='string'&&r.text.length>=10&&r.text.length<=2000?{text:r.text}:undefined;}
