import {z} from 'zod';
import {campaignInput,campaignAction,campaignStatuses,type CampaignInput} from './campaigns';
import {cities,categories} from './index';
import {documentId} from './claim-review';
import {accountJson,AccountRequestError} from './account-client';
import {searchOrigin} from './search-client';
const safeInt=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const ownerCampaignAction=z.discriminatedUnion('action',[campaignAction.options[0],campaignAction.options[1]]);
export type OwnerCampaignAction=z.infer<typeof ownerCampaignAction>;
export const ownerCampaignItem=campaignInput.safeExtend({id:z.string().uuid(),businessId:documentId,businessName:z.string().max(160),approvedProfileVersion:safeInt.optional(),status:z.enum(campaignStatuses),version:safeInt.refine(v=>v>0),reason:z.string().max(1000),createdAtMs:safeInt,updatedAtMs:safeInt}).strict();
export type OwnerCampaignItem=z.infer<typeof ownerCampaignItem>;
export const campaignBranch=z.object({id:documentId,name:z.string().min(1).max(200),city:z.string().max(100),categories:z.array(z.string().refine(v=>categories.some(c=>c.id===v))).max(categories.length),published:z.boolean(),coordinateVerified:z.boolean()}).strict().refine(v=>new Set(v.categories).size===v.categories.length);
export const ownerCampaignPage=z.object({business:campaignBranch,items:z.array(ownerCampaignItem).max(20),next:z.string().uuid().nullable()}).strict().superRefine((p,c)=>{
 if(p.items.some(v=>v.businessId!==p.business.id)||new Set(p.items.map(v=>v.id)).size!==p.items.length||p.items.some((v,i)=>i>0&&v.id<=p.items[i-1].id)||p.next!==null&&(p.items.length!==20||p.next!==p.items.at(-1)?.id))c.addIssue({code:'custom',message:'campaign_page'});
});
export type OwnerCampaignPage=z.infer<typeof ownerCampaignPage>;
export function projectCampaignBranch(id:string,b:Record<string,unknown>){return campaignBranch.parse({id,name:b.name,city:typeof b.city==='string'?b.city:'',categories:Array.isArray(b.categories)?b.categories.filter(v=>categories.some(c=>c.id===v)):[],published:b.published===true,coordinateVerified:b.coordinateStatus==='verified'&&typeof b.latitude==='number'&&Number.isFinite(b.latitude)&&Math.abs(b.latitude)<=90&&typeof b.longitude==='number'&&Number.isFinite(b.longitude)&&Math.abs(b.longitude)<=180});}
export function campaignFields(v:CampaignInput):CampaignInput{return {placement:v.placement,city:v.city,category:v.category,days:v.days,startDate:v.startDate,headline:v.headline,description:v.description};}
export function campaignTargetValid(b:z.infer<typeof campaignBranch>,v:CampaignInput){return b.city===v.city&&cities.includes(b.city)&&b.categories.includes(v.category);}
export function campaignActions(v:OwnerCampaignItem){return {edit:v.status==='draft'||v.status==='rejected',submit:v.status==='draft',cancel:['draft','pending','approved','rejected'].includes(v.status)};}
export function campaignHttpInput(method:string,q:URLSearchParams,type:string|null){
 if(method!=='GET'){if([...q.keys()].length)throw Error('campaign_query');if(!/^application\/json(?:\s*;|$)/i.test(type??''))throw Error('campaign_content_type');return;}
 const queue=q.get('queue')==='true',owner=q.get('scope')==='owner',keys=queue?['queue','status','after']:owner?['businessId','scope','after','id']:['businessId','after'];
 for(const k of q.keys())if(!keys.includes(k)||q.getAll(k).length!==1)throw Error('campaign_query');
 if(queue){if(q.has('status'))z.enum(campaignStatuses).parse(q.get('status'));}else documentId.parse(q.get('businessId'));
 if(q.has('scope')&&!owner)throw Error('campaign_scope');if(q.get('after'))z.string().uuid().parse(q.get('after'));
 if(q.has('id')){z.string().uuid().parse(q.get('id'));if(q.has('after'))throw Error('campaign_lookup');}
}
export type OwnerCampaignCall={type:'read';businessId:string;after?:string;id?:string}|{type:'action';value:OwnerCampaignAction};
export async function fetchOwnerCampaigns(o:{origin:string;locale:string;token:()=>Promise<string>;guard:()=>void;request?:typeof fetch},call:OwnerCampaignCall){
 const url=new URL('/api/campaigns',searchOrigin(o.origin));let payload:OwnerCampaignAction|undefined;
 if(call.type==='read'){url.searchParams.set('businessId',documentId.parse(call.businessId));url.searchParams.set('scope','owner');if(call.after)url.searchParams.set('after',z.string().uuid().parse(call.after));if(call.id){if(call.after)throw Error('campaign_lookup');url.searchParams.set('id',z.string().uuid().parse(call.id));}}else payload=ownerCampaignAction.parse(call.value);
 let token='';try{return(await accountJson({guard:o.guard,token:async()=>{token=await o.token();return token;},request:signal=>(o.request??fetch)(url,{method:payload?'PATCH':'GET',signal,credentials:'omit',cache:'no-store',redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/json','Accept-Language':o.locale,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})}),decode:raw=>{
  if(call.type==='read'){const v=ownerCampaignPage.parse(raw);if(v.business.id!==call.businessId||call.id&&(v.next!==null||v.items.length>1||v.items.some(r=>r.id!==call.id))||call.after&&v.items.some(r=>r.id<=call.after!))throw Error('campaign_binding');return v;}
  const v=z.object({item:ownerCampaignItem}).strict().parse(raw);if(v.item.id!==call.value.id||v.item.businessId!==call.value.businessId||v.item.version!==call.value.version+1||v.item.status!==({save:'draft',submit:'pending',cancel:'cancelled'} as const)[call.value.action]||call.value.action==='save'&&JSON.stringify(campaignFields(v.item))!==JSON.stringify(campaignFields(call.value.value)))throw Error('campaign_receipt');return v;
 }})).value;}catch(e){if(e instanceof AccountRequestError&&e.status===409)throw Error('campaign_conflict');throw e;}
}
