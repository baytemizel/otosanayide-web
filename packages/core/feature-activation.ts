import {z} from 'zod';
const id=z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
const base={businessId:id,version:z.number().int().nonnegative()};
export const activationAction=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('request'),features:z.object({quotes:z.boolean(),appointments:z.boolean()}).strict().refine(v=>v.quotes||v.appointments),monitorInbox:z.literal(true),capacityReady:z.literal(true)}).strict(),
 z.object({...base,action:z.enum(['approve','reject','pause']),reason:z.string().trim().min(10).max(1000)}).strict()
]);
export type ActivationAction=z.infer<typeof activationAction>;
export type ActivationBusiness={ownerUid?:string;ownership?:string;published?:boolean;sample?:boolean;activationVersion?:number;ownerReady?:boolean;features?:{quotes:boolean;appointments:boolean}};
export type ActivationRequest={status:string;applicantId:string;features:{quotes:boolean;appointments:boolean};monitorInbox:boolean;capacityReady:boolean};
export function activationOwner(uid:string,bid:string,b:ActivationBusiness,m:Record<string,unknown>|undefined){return b.ownerUid===uid&&b.ownership==='verified'&&m?.userId===uid&&m.businessId===bid&&m.active===true&&m.role==='owner';}
export function activationTransition(b:ActivationBusiness,previous:ActivationRequest|undefined,a:ActivationAction,who:{uid:string;owner:boolean;admin:boolean;affiliated:boolean;applicantStillOwner:boolean}){
 const permitted=a.action==='request'?who.owner:a.action==='pause'?who.owner||(who.admin&&!who.affiliated):who.admin&&!who.affiliated&&previous?.applicantId!==who.uid;
 if(!permitted)throw Error('forbidden');
 if((b.activationVersion??0)!==a.version)throw Error('stale');
 const version=a.version+1;
 if(a.action==='pause'){
  if(!who.owner&&(!who.admin||who.affiliated))throw Error('forbidden');
  return {version,status:'paused',business:{activationVersion:version,ownerReady:false,features:{quotes:false,appointments:false}}};
 }
 if(a.action==='request'){
  if(!who.owner||b.sample||!b.published||b.ownership!=='verified')throw Error('forbidden');
  return {version,status:'pending',business:{activationVersion:version}};
 }
 if(!who.admin||who.affiliated||previous?.applicantId===who.uid)throw Error('forbidden');
 if(previous?.status!=='pending')throw Error('stale');
 if(a.action==='approve'){
  if(!who.applicantStillOwner||b.sample||!b.published||b.ownership!=='verified'||!previous.monitorInbox||!previous.capacityReady||!(previous.features.quotes||previous.features.appointments))throw Error('ineligible');
  return {version,status:'approved',business:{activationVersion:version,ownerReady:true,features:previous.features}};
 }
 return {version,status:'rejected',business:{activationVersion:version}};
}
