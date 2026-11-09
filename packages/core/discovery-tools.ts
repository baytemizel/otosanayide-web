import {z} from 'zod';
import {parseSearchRequest} from './search-request';
import type {Business} from './index';

const criteriaSchema=z.object({q:z.string(),city:z.string(),district:z.string(),category:z.string(),service:z.string(),brand:z.string(),card:z.boolean(),areaMode:z.enum(['city','nearby']).optional(),radius:z.number().finite().min(1).max(200).optional()}).strict();
export type SavedCriteria=z.infer<typeof criteriaSchema>;
export function savedCriteria(value:unknown):SavedCriteria{
 const input=criteriaSchema.parse(value),p=new URLSearchParams();
 for(const [key,v] of Object.entries(input))if(key!=='areaMode'&&key!=='radius')p.set(key,String(v));
 const parsed=parseSearchRequest(p);if(!parsed.city)throw Error('search_city_required');
 if(input.radius!==undefined&&input.areaMode!=='nearby')throw Error('search_radius_scope_required');
 return criteriaSchema.parse({q:parsed.q,city:parsed.city,district:parsed.district,category:parsed.category,service:parsed.service,brand:parsed.brand,card:parsed.card,...(input.areaMode==='nearby'?{areaMode:'nearby',radius:input.radius??25}:{})});
}
const itemSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(60),criteria:criteriaSchema}).strict();
const schema=z.object({version:z.literal(1),items:z.array(itemSchema).max(20)}).strict();
export type SavedSearch=z.infer<typeof itemSchema>;
export function parseSavedSearches(raw:string|null):SavedSearch[]{
 if(raw===null)return [];if(raw.length>40000)throw Error('search_storage_invalid');
 const result=schema.parse(JSON.parse(raw));const ids=new Set<string>();
 return result.items.map(item=>{if(ids.has(item.id))throw Error('search_storage_invalid');ids.add(item.id);return {...item,criteria:savedCriteria(item.criteria)};});
}
export function createSavedSearchRepository(storage:{getItem:(key:string)=>Promise<string|null>|string|null;setItem:(key:string,value:string)=>Promise<void>|void},scope:string){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(scope))throw Error('search_scope_invalid');
 const key='otosanayide-saved-searches-v1:'+scope;let raw:string|null=null,loaded=false,queue=Promise.resolve();
 async function read(){loaded=false;const next=await storage.getItem(key),items=parseSavedSearches(next);raw=next;loaded=true;return items;}
 function mutate(change:(items:SavedSearch[])=>SavedSearch[],guard:()=>void=()=>{}){
  const operation=queue.then(async()=>{guard();if(!loaded)throw Error('search_storage_unread');const current=await storage.getItem(key);guard();if(current!==raw)throw Error('search_storage_conflict');const items=change(parseSavedSearches(raw)),next=JSON.stringify({version:1,items});parseSavedSearches(next);guard();await storage.setItem(key,next);raw=next;guard();return items;});
  queue=operation.then(()=>{},()=>{});return operation;
 }
 return {read,add:(item:SavedSearch,guard?:()=>void)=>mutate(items=>{const valid=itemSchema.parse(item),criteria=savedCriteria(valid.criteria);if(items.some(i=>JSON.stringify(i.criteria)===JSON.stringify(criteria)))throw Error('search_duplicate');return [...items,{...valid,criteria}];},guard),remove:(id:string,guard?:()=>void)=>mutate(items=>items.filter(i=>i.id!==id),guard)};
}
export function toggleComparison(items:Business[],business:Business):Business[]{
 if(items.some(b=>b.id===business.id))return items.filter(b=>b.id!==business.id);
 if(!business.published||items.length>=3)throw Error('comparison_limit');
 return [...items,business];
}
export function comparisonFacts(b:Business){return {location:[b.district,b.city].filter(Boolean).join(', '),services:b.services,brands:b.brands,card:b.cardPayment===true?'yes':b.cardPayment===false?'no':'unknown',wc:b.wc===true?'yes':b.wc===false?'no':'unknown',hours:b.hours||null,verified:b.ownership==='verified',sample:!!b.sample};}
