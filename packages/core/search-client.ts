import {z} from 'zod';
import {cities,categories,sampleBusinesses,searchBusinesses,type Business} from './index';
import {parseSearchRequest} from './search-request';
import {boundedBytes} from './bounded-body';
import {contactPhone,businessContactEmail} from './contact';
const text=(max:number)=>z.string().trim().max(max);
const publicBusiness=z.object({
 id:z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),name:text(160).min(2),city:text(80).refine(v=>cities.includes(v)),district:text(100).min(2),address:text(500).min(10),
 categories:z.array(text(80).refine(v=>categories.some(c=>c.id===v))).min(1).max(12),services:z.array(text(120)).max(50),brands:z.array(text(80)).max(100),
 contactEmail:text(254).refine(v=>!v||!!businessContactEmail(v)).optional(),phone:text(80).refine(v=>!v||!!contactPhone(v)).optional(),website:text(500).refine(v=>{if(!v)return true;try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}).optional(),
 latitude:z.number().finite().min(35.7).max(42.3).optional(),longitude:z.number().finite().min(25.5).max(45).optional(),coordinateStatus:z.enum(['verified','unverified']),
 ownership:z.enum(['unclaimed','pending','verified']),features:z.object({quotes:z.boolean(),appointments:z.boolean()}).strict(),ownerReady:z.boolean(),published:z.literal(true),sample:z.boolean().optional(),
 coverPhotoId:z.string().uuid().optional(),image:z.literal('/workshop.png').optional(),cardPayment:z.boolean().optional(),wc:z.boolean().optional(),hours:text(300).optional(),distance:z.number().finite().min(0).max(20_000).optional()
}).strict().superRefine((b,ctx)=>{
 if(b.coordinateStatus==='verified'?(b.latitude===undefined||b.longitude===undefined):(b.latitude!==undefined||b.longitude!==undefined))ctx.addIssue({code:'custom',message:'Invalid coordinates.'});
 if((b.features.quotes||b.features.appointments||b.ownerReady)&&(b.ownership!=='verified'||!b.ownerReady))ctx.addIssue({code:'custom',message:'Invalid activation.'});
 if(b.coverPhotoId&&(b.sample||b.ownership!=='verified'))ctx.addIssue({code:'custom',message:'Invalid cover.'});
 if(b.sample&&(b.phone||b.contactEmail||b.website||b.latitude!==undefined||b.longitude!==undefined||b.ownership==='verified'||b.features.quotes||b.features.appointments))ctx.addIssue({code:'custom',message:'Sample contact is forbidden.'});
});
const schema=z.object({items:z.array(publicBusiness).max(24),districts:z.array(text(100).min(1)).max(100),mode:z.enum(['demo','live']),sponsored:z.array(z.object({business:publicBusiness,headline:text(200),description:text(1000),expiresAtMs:z.number().int().nonnegative(),metricToken:text(4096).optional()}).strict()).max(6).optional()}).strict();
export type SearchResult={items:Business[];districts:string[];mode:'demo'|'live'};
export function decodeSearchResult(value:unknown,expected:'demo'|'live'):SearchResult{
 const v=schema.parse(value),all=[...v.items,...(v.sponsored??[]).map(s=>s.business)];
 if(v.mode!==expected||all.some(b=>expected==='demo'?!b.sample:b.sample===true)||new Set(v.items.map(b=>b.id)).size!==v.items.length||new Set(v.districts).size!==v.districts.length)throw Error('search_response');
 return {items:v.items,districts:v.districts,mode:v.mode};
}
export type SearchCriteria=ReturnType<typeof parseSearchRequest>;
export function searchParams(input:SearchCriteria){const p=new URLSearchParams();for(const key of ['q','city','district','category','service','brand','card'] as const)p.set(key,String(input[key]));if(input.center){p.set('lat',String(input.center.latitude));p.set('lng',String(input.center.longitude));}if(input.radius!==undefined)p.set('radius',String(input.radius));parseSearchRequest(p);return p;}
export function searchOrigin(raw:string){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||u.port||/^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[)/i.test(u.hostname))throw Error('search_config');return u.origin;}
export function localSearch(input:SearchCriteria):SearchResult{
 const filter=parseSearchRequest(searchParams(input));
 return decodeSearchResult({items:filter.city||filter.center?searchBusinesses(sampleBusinesses,filter).slice(0,24):[],districts:[...new Set(sampleBusinesses.filter(b=>b.published&&b.city===filter.city).map(b=>b.district))].sort((a,b)=>a.localeCompare(b,'tr')),mode:'demo'},'demo');
}
export class SearchRequestError extends Error{constructor(public code:'cancelled'|'timeout'|'unavailable'|'invalid'|'configuration'){super('search_'+code);}}
export async function fetchSearch(input:SearchCriteria,options:{origin:string;signal?:AbortSignal;request?:typeof fetch;timeoutMs?:number}):Promise<SearchResult>{
 let url:string;try{url=searchOrigin(options.origin)+'/api/search?'+searchParams(input);}catch{throw new SearchRequestError('configuration');}
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined,abort:()=>void=()=>{};
 const interruption=new Promise<never>((_,reject)=>{abort=()=>{controller.abort();reject(new SearchRequestError('cancelled'));};options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();timer=setTimeout(()=>{controller.abort();reject(new SearchRequestError('timeout'));},options.timeoutMs??12_000);});
 try{return await Promise.race([interruption,(async()=>{if(controller.signal.aborted)throw new SearchRequestError('cancelled');let response:Response;try{response=await (options.request??fetch)(url,{method:'GET',signal:controller.signal,redirect:'error',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}});}catch{if(controller.signal.aborted)throw new SearchRequestError('cancelled');throw new SearchRequestError('unavailable');}
 if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new SearchRequestError('unavailable');
 try{if(Number(response.headers.get('content-length')??0)>250_000)throw Error('size');const raw=response.body?new TextDecoder().decode(await boundedBytes(response,250_000)):await response.text();if(new TextEncoder().encode(raw).length>250_000)throw Error('size');return decodeSearchResult(JSON.parse(raw),'live');}catch{throw new SearchRequestError('invalid');}
 })()]);}finally{clearTimeout(timer);controller.abort();options.signal?.removeEventListener('abort',abort);}
}
