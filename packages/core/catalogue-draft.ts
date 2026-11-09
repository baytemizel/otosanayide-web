import {businessContactEmail} from './contact';
import {qualityEvidenceProjection} from './catalogue-quality';
import {z} from 'zod';
import {businessProfileSchema,profileProjection} from './business-management';
import {documentId} from './claim-review';
export const catalogueDraftAction=z.object({businessId:documentId,profileVersion:z.number().int().nonnegative(),publicationVersion:z.number().int().nonnegative(),reason:z.string().trim().min(10).max(1000),profile:businessProfileSchema}).strict();
export function mayPrepareCatalogue(b:Record<string,unknown>,actor:{uid:string;admin:boolean;affiliated:boolean}){
 return actor.admin&&!actor.affiliated&&b.ownerUid!==actor.uid&&!b.ownerUid&&b.ownership==='unclaimed'&&b.published===false&&b.sample!==true;
}
export function catalogueDraftTransition(b:Record<string,unknown>,input:z.infer<typeof catalogueDraftAction>,actor:{uid:string;admin:boolean;affiliated:boolean}){
 if(!mayPrepareCatalogue(b,actor))throw Error('forbidden');
 if((b.profileVersion??0)!==input.profileVersion||(b.publicationVersion??0)!==input.publicationVersion)throw Error('stale');
 return {...profileProjection(input.profile,b),profileVersion:input.profileVersion+1,coordinateStatus:'unverified',ownerReady:false,features:{quotes:false,appointments:false},activationVersion:Number(b.activationVersion??0)+1};
}
const text=(v:unknown,max=1000)=>typeof v==='string'?v.slice(0,max):'';
const list=(v:unknown)=>Array.isArray(v)?v.filter((s):s is string=>typeof s==='string').slice(0,50).map(s=>s.slice(0,200)):[];
function url(v:unknown){try{const u=new URL(text(v,2000));return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
// Evidence is an explicit, read-only subset; rawSource and internal identities never leave the API.
export function catalogueEvidenceProjection(source:Record<string,unknown>|undefined){
 if(!source)return null;
 const c=source.coordinateEvidence&&typeof source.coordinateEvidence==='object'?source.coordinateEvidence as Record<string,unknown>:{};
 const coordinates=typeof c.latitude==='number'&&Number.isFinite(c.latitude)&&Math.abs(c.latitude)<=90&&typeof c.longitude==='number'&&Number.isFinite(c.longitude)&&Math.abs(c.longitude)<=180?{latitude:c.latitude,longitude:c.longitude}:null;
 return {name:text(source.name),address:text(source.address,5000),phone:text(source.phone),...(businessContactEmail(source.contactEmail)?{contactEmail:businessContactEmail(source.contactEmail)!.address}:{}),website:url(source.website),source:url(source.source),categoryCandidates:list(source.categoryCandidates),specialtyCandidates:list(source.specialtyCandidates),flags:list(source.flags),coordinates,coordinateSource:url(c.source),coordinateNote:text(c.type),quality:qualityEvidenceProjection(source.rawSource)};
}
