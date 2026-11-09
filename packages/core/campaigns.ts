import {z} from 'zod';
import {cities,categories} from './index';
import {documentId} from './claim-review';
export const campaignInput=z.object({placement:z.enum(['search','category','home']),city:z.string().refine(v=>cities.includes(v)),category:z.string().refine(v=>categories.some(c=>c.id===v)),days:z.union([z.literal(7),z.literal(30)]),startDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}),headline:z.string().trim().min(5).max(80),description:z.string().trim().min(10).max(300)}).strict();
export type CampaignInput=z.infer<typeof campaignInput>;
export const campaignStatuses=['draft','pending','approved','rejected','cancelled','scheduled'] as const;
const base={id:z.string().uuid(),businessId:documentId,version:z.number().int().nonnegative()};
export const campaignAction=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('save'),value:campaignInput}).strict(),
 z.object({...base,action:z.enum(['submit','cancel'])}).strict(),
 z.object({...base,action:z.enum(['approve','reject']),reason:z.string().trim().min(10).max(1000)}).strict()
]);
export type CampaignAction=z.infer<typeof campaignAction>;
export type CampaignRecord=CampaignInput&{businessId:string;businessName?:string;approvedProfileVersion?:number;status:typeof campaignStatuses[number];version:number;reason:string;createdAtMs:number;updatedAtMs:number};
export type CampaignView=CampaignRecord&{id:string};
export function ownsCampaignBusiness(uid:string,bid:string,b:Record<string,unknown>,m:Record<string,unknown>|undefined){return b.sample!==true&&b.ownership==='verified'&&m?.active===true&&m.userId===uid&&m.businessId===bid&&m.role==='owner';}
export function campaignScheduleEligible(startDate:string,now:number){const start=Date.parse(startDate+'T00:00:00+03:00');return Number.isFinite(start)&&start>now&&start<=now+180*86400000;}
export function campaignEligible(b:Record<string,unknown>,v:CampaignInput,now:number){
 return b.ownership==='verified'&&b.published===true&&b.sample!==true&&b.coordinateStatus==='verified'&&typeof b.latitude==='number'&&Number.isFinite(b.latitude)&&Math.abs(b.latitude)<=90&&typeof b.longitude==='number'&&Number.isFinite(b.longitude)&&Math.abs(b.longitude)<=180&&b.city===v.city&&Array.isArray(b.categories)&&b.categories.includes(v.category)&&campaignScheduleEligible(v.startDate,now);
}
export function campaignTransition(previous:CampaignRecord|null,a:CampaignAction,b:Record<string,unknown>,auth:{owner:boolean;admin:boolean;affiliated:boolean},now:number):CampaignRecord{
 const review=a.action==='approve'||a.action==='reject';
 if(review?(!auth.admin||auth.affiliated):!auth.owner)throw Error('forbidden');
 if((previous?.version??0)!==a.version||previous&&previous.businessId!==a.businessId)throw Error('conflict');
 if(a.action==='save'){
  if(previous&&!['draft','rejected'].includes(previous.status))throw Error('state');
  if(b.city!==a.value.city||!Array.isArray(b.categories)||!b.categories.includes(a.value.category))throw Error('target');
  return {...campaignInput.parse(a.value),businessId:a.businessId,businessName:typeof b.name==='string'?b.name.slice(0,160):'',status:'draft',version:a.version+1,reason:'',createdAtMs:previous?.createdAtMs??now,updatedAtMs:now};
 }
 if(!previous)throw Error('missing');
 let status:CampaignRecord['status'];
 if(a.action==='submit') {if(previous.status!=='draft'||!campaignEligible(b,previous,now))throw Error('eligibility');status='pending';}
 else if(a.action==='cancel'){if(!['draft','pending','approved','rejected'].includes(previous.status))throw Error('state');status='cancelled';}
 else {if(previous.status!=='pending')throw Error('state');if(a.action==='approve'&&!campaignEligible(b,previous,now))throw Error('eligibility');status=a.action==='approve'?'approved':'rejected';}
 return {...previous,...(a.action==='approve'?{approvedProfileVersion:typeof b.profileVersion==='number'?b.profileVersion:0}:{}),businessName:typeof b.name==='string'?b.name.slice(0,160):previous.businessName??'',status,version:a.version+1,reason:review?a.reason:previous.reason,updatedAtMs:now};
}
export function campaignView(id:string,row:Record<string,unknown>):CampaignView|null{
 const parsed=campaignInput.safeParse(Object.fromEntries(Object.keys(campaignInput.shape).map(k=>[k,row[k]])));
 if(!parsed.success||!campaignStatuses.includes(row.status as CampaignRecord['status'])||!documentId.safeParse(row.businessId).success||!Number.isSafeInteger(row.version)||Number(row.version)<1)return null;
 return {id,...parsed.data,...(Number.isSafeInteger(row.approvedProfileVersion)?{approvedProfileVersion:Number(row.approvedProfileVersion)}:{}),businessId:String(row.businessId),businessName:typeof row.businessName==='string'?row.businessName.slice(0,160):'',status:row.status as CampaignRecord['status'],version:Number(row.version),reason:typeof row.reason==='string'?row.reason.slice(0,1000):'',createdAtMs:typeof row.createdAtMs==='number'?row.createdAtMs:0,updatedAtMs:typeof row.updatedAtMs==='number'?row.updatedAtMs:0};
}
