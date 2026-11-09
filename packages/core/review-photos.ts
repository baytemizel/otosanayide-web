import {z} from 'zod';
export const photoId=z.string().uuid();
export const photoLimits={maxFiles:3,maxBytes:2500000,maxPixels:24000000,edge:1600,thumbnail:320,maxAttempts:20};
export const reviewPhotoDecision=z.object({id:photoId,version:z.number().int().positive(),decision:z.enum(['approve','reject','hide']),reason:z.string().trim().min(10).max(1000),attested:z.boolean()}).strict();
export function photoSubmission(r:Record<string,unknown>){return r.submissionVersion??1;}
export function photoMatches(p:Record<string,unknown>,r:Record<string,unknown>|undefined){return !!r&&p.userId===r.userId&&p.businessId===r.businessId&&p.submissionVersion===photoSubmission(r);}
export function photoCanUpload(uid:string,r:Record<string,unknown>|undefined){return !!r&&r.userId===uid&&['pending','approved'].includes(String(r.status));}
export function photoIsPublic(p:Record<string,unknown>|undefined,r:Record<string,unknown>|undefined,b:Record<string,unknown>|undefined){return !!p&&photoMatches(p,r)&&p.status==='approved'&&r?.status==='approved'&&b?.published===true&&b.sample!==true;}
export function photoIds(value:unknown):string[]{return Array.isArray(value)?value.filter((id):id is string=>photoId.safeParse(id).success).slice(0,3):[];}
export function photoCleanupDue(p:Record<string,unknown>,now:number){return p.status==='purging'||(['uploading','failed'].includes(String(p.status))&&typeof p.createdAtMs==='number'&&p.createdAtMs+86400000<=now)||(['pending','rejected','withdrawn','hidden'].includes(String(p.status))&&typeof p.expiresAtMs==='number'&&p.expiresAtMs<=now);}
export function photoMayPublish(p:Record<string,unknown>,r:Record<string,unknown>|undefined,b:Record<string,unknown>|undefined,view:Record<string,unknown>|undefined,attested:boolean,now:number){return attested&&p.status==='pending'&&photoMatches(p,r)&&r?.status==='approved'&&b?.published===true&&b.sample!==true&&typeof p.expiresAtMs==='number'&&p.expiresAtMs>now&&typeof p.sha256==='string'&&view?.sha256===p.sha256;}
