import {z} from 'zod';
import {documentId} from './claim-review';
export const evidenceLimits={maxFiles:5,maxBytes:4*1024*1024,maxPixels:16_000_000,retentionDays:90} as const;
export const evidenceKind=z.enum(['registration','authorization','workplace']);
export const evidenceKinds={registration:'İşletme kaydı belgesi',authorization:'Temsil / yetki belgesi',workplace:'İşyeri bilgisi belgesi'};
export const evidenceVerificationSchema=z.object({claimId:documentId,evidenceIds:z.array(z.string().uuid()).min(1).max(5).refine(ids=>new Set(ids).size===ids.length),evidenceRevision:z.number().int().positive(),attested:z.literal(true),reason:z.string().trim().min(10).max(1000)}).strict();
export function canReadEvidence(uid:string,admin:boolean,verified:boolean,claim:Record<string,unknown>|undefined){return verified&&!!claim&&(claim.userId===uid||admin);}
export function canUploadEvidence(uid:string,verified:boolean,claim:Record<string,unknown>|undefined){return verified&&!!claim&&claim.userId===uid&&['submitted','needs_information'].includes(String(claim.status));}
export function reviewableEvidence(evidence:Record<string,unknown>|undefined,claimId:string,userId:string,view:Record<string,unknown>|undefined,reviewerId:string,now:number){return !!evidence&&evidence.claimId===claimId&&evidence.userId===userId&&evidence.status==='ready'&&typeof evidence.expiresAtMs==='number'&&evidence.expiresAtMs>now&&!!view&&view.reviewerId===reviewerId&&view.sha256===evidence.sha256;}
export function currentEvidenceProof(proof:Record<string,unknown>|undefined,claim:Record<string,unknown>,now:number){return !!proof&&Number.isInteger(claim.evidenceRevision)&&proof.evidenceRevision===claim.evidenceRevision&&(claim.pendingEvidenceUploads??0)===0&&typeof proof.expiresAtMs==='number'&&proof.expiresAtMs>now;}
