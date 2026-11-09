import {z} from 'zod';
import {documentId} from './claim-review';
export const catalogueHistoryQuery=z.object({businessId:documentId,after:documentId.optional()}).strict();
export type CatalogueHistoryItem={id:string;kind:string;action:string|null;createdAt:string|null;reason:string;profileVersion:number|null;publicationVersion:number|null;checks:{key:string;reference:string}[]};
const known=new Set(['source_import','catalogue_draft','catalogue_publication','profile_submitted','profile_reviewed']);
const version=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;
export function catalogueHistoryProjection(id:string,row:Record<string,unknown>,createdAt:string|null):CatalogueHistoryItem{
 const kind=known.has(String(row.kind))?String(row.kind):'other';
 const action=kind==='catalogue_publication'&&['publish','withdraw'].includes(String(row.action))?String(row.action):kind==='profile_reviewed'&&['approve','reject'].includes(String(row.decision))?String(row.decision):null;
 const checks:CatalogueHistoryItem['checks']=[];
 if(kind==='catalogue_publication'&&action==='publish'&&row.checks&&typeof row.checks==='object')for(const key of ['rights','identity','location','duplicates']){
  const proof=(row.checks as Record<string,unknown>)[key];
  if(proof&&typeof proof==='object'&&(proof as Record<string,unknown>).checked===true&&typeof (proof as Record<string,unknown>).reference==='string')checks.push({key,reference:String((proof as Record<string,unknown>).reference).slice(0,800)});
 }
 return {id,kind,action,createdAt:createdAt&&Number.isFinite(Date.parse(createdAt))?createdAt:null,reason:known.has(kind)&&typeof row.reason==='string'?row.reason.slice(0,1000):'',profileVersion:kind==='other'?null:version(row.profileVersion??(kind==='profile_submitted'?row.expectedVersion:undefined)),publicationVersion:kind==='catalogue_publication'?version(row.version):null,checks};
}
