import {z} from 'zod';
import {vehicleSchema,maintenanceSchema} from './index';
import {cleanupGarageMedia,commitGarageMedia,garageMediaReferences,GarageMediaStore,PreparedGarageMedia} from './local-garage-media';

export const GARAGE_KEY='otosanayide-garage-v1';
const id=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const localVehicle=vehicleSchema.extend({id,archived:z.boolean()});
const localMaintenance=maintenanceSchema.safeExtend({id});
const snapshot=z.object({version:z.literal(1),vehicles:z.array(localVehicle).max(50),records:z.array(localMaintenance).max(2000),selectedVehicleId:id.nullable()}).strict().superRefine((v,ctx)=>{
 const ids=new Set(v.vehicles.map(x=>x.id));
 if(ids.size!==v.vehicles.length||new Set(v.records.map(x=>x.id)).size!==v.records.length||v.records.some(x=>!ids.has(x.vehicleId))||(v.selectedVehicleId!==null&&!ids.has(v.selectedVehicleId)))ctx.addIssue({code:'custom',message:'Invalid garage references'});
 try{garageMediaReferences(v);}catch{ctx.addIssue({code:'custom',message:'Invalid media references'});}
});
export type GarageSnapshot=z.infer<typeof snapshot>;
export type GarageVehicle=GarageSnapshot['vehicles'][number];
export type GarageRecord=GarageSnapshot['records'][number];
export const emptyGarage=():GarageSnapshot=>({version:1,vehicles:[],records:[],selectedVehicleId:null});
export function decodeGarage(raw:string|null):GarageSnapshot{
 if(raw===null)return emptyGarage();
 if(raw.length>1_000_000)throw new Error('garage_size');
 return snapshot.parse(JSON.parse(raw));
}
export function parseGarageAmount(input:string):number{
 // No ambiguous thousands separators or silent empty-to-zero conversion.
 if(!/^\d{1,8}([.,]\d{1,2})?$/.test(input.trim()))throw new Error('garage_amount');
 const [whole,fraction='']=input.trim().replace(',','.').split('.');
 const minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(minor>1_000_000_000)throw new Error('garage_amount');
 return minor/100;
}
export function garageHistory(state:GarageSnapshot,vehicleId:string){
 const records=state.records.filter(r=>r.vehicleId===vehicleId).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 return {records,total:records.reduce((sum,r)=>sum+Math.round(r.amount*100),0)/100};
}
export function saveGarageVehicle(state:GarageSnapshot,input:unknown,vehicleId:string):GarageSnapshot{
 const existing=state.vehicles.find(v=>v.id===vehicleId);
 const parsed=vehicleSchema.parse(input);
 const vehicle={...parsed,id:vehicleId,archived:existing?.archived??false};
 return snapshot.parse({...state,vehicles:existing?state.vehicles.map(v=>v.id===vehicleId?vehicle:v):[...state.vehicles,vehicle],selectedVehicleId:vehicleId});
}
export function archiveGarageVehicle(state:GarageSnapshot,vehicleId:string,archived:boolean):GarageSnapshot{
 if(!state.vehicles.some(v=>v.id===vehicleId))throw new Error('garage_vehicle');
 return snapshot.parse({...state,vehicles:state.vehicles.map(v=>v.id===vehicleId?{...v,archived}:v)});
}
export function saveGarageRecord(state:GarageSnapshot,input:unknown,recordId:string):GarageSnapshot{
 const parsed=maintenanceSchema.parse(input);
 const vehicle=state.vehicles.find(v=>v.id===parsed.vehicleId);
 const existing=state.records.find(r=>r.id===recordId);
 if(!vehicle||vehicle.archived||(existing&&existing.vehicleId!==vehicle.id))throw new Error('garage_vehicle');
 const record={...parsed,amount:Math.round(parsed.amount*100)/100,id:recordId};
 return snapshot.parse({...state,records:existing?state.records.map(r=>r.id===recordId?record:r):[...state.records,record],vehicles:state.vehicles.map(v=>v.id===vehicle.id?{...v,mileage:Math.max(v.mileage,parsed.mileage)}:v)});
}
export interface GarageStorage{getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>;exclusive?<T>(action:()=>Promise<T>):Promise<T>}
// One owner per mounted garage; commands are serialized against the last committed state.
export function createGarageRepository(storage:GarageStorage,media?:GarageMediaStore){
 const observers=new Set<(state:GarageSnapshot)=>void>();
 const emit=(state:GarageSnapshot)=>{for(const fn of observers)try{fn(structuredCopy(state));}catch{/* committed writes survive observer failure */}};
 let committed:GarageSnapshot|undefined;
 let queue:Promise<unknown>=Promise.resolve();
 function enqueue<T>(action:()=>Promise<T>):Promise<T>{const job=queue.then(()=>storage.exclusive?storage.exclusive(action):action());queue=job.catch(()=>{});return job;}
 async function commit(change:(state:GarageSnapshot)=>GarageSnapshot,prepared:PreparedGarageMedia[]){
  if(!committed)throw new Error('garage_not_loaded');
  // Refresh under the platform lock so another web tab's completed changes survive.
  committed=decodeGarage(await storage.getItem(GARAGE_KEY));
  const before=committed,next=snapshot.parse(change(structuredCopy(before)));
  const raw=JSON.stringify(next);if(raw.length>1_000_000)throw new Error('garage_size');
  const write=async()=>{await storage.setItem(GARAGE_KEY,raw);committed=next;emit(next);return structuredCopy(next);};
  const oldRefs=garageMediaReferences(before),newRefs=garageMediaReferences(next);
  if(!prepared.length&&oldRefs.size===newRefs.size&&[...oldRefs].every(([id,kind])=>newRefs.get(id)===kind))return {state:await write(),cleanupPending:false};
  if(media)return commitGarageMedia(before,next,prepared,media,write);
  if(prepared.length||[...garageMediaReferences(next).keys()].some(id=>!garageMediaReferences(before).has(id)))throw Error('media_store_required');
  return {state:await write(),cleanupPending:false};
 }
 return {
  subscribe:(fn:(state:GarageSnapshot)=>void)=>{observers.add(fn);return()=>{observers.delete(fn);};},
  load:()=>enqueue(async()=>{committed=undefined;const next=decodeGarage(await storage.getItem(GARAGE_KEY));committed=next;emit(next);return structuredCopy(next);}),
  update:(change:(state:GarageSnapshot)=>GarageSnapshot)=>enqueue(async()=>(await commit(change,[])).state),
  updateWithMedia:(change:(state:GarageSnapshot)=>GarageSnapshot,prepared:PreparedGarageMedia[])=>{
   const releases:Array<()=>void>=[];
   try{for(const item of prepared){const release=item.retain?.();if(release)releases.push(release);}}
   catch(error){releases.forEach(release=>release());throw error;}
   return enqueue(()=>commit(change,prepared)).finally(()=>releases.forEach(release=>release()));
  },
  cleanupMedia:()=>enqueue(async()=>{if(!committed||!media)throw Error('garage_not_loaded');committed=decodeGarage(await storage.getItem(GARAGE_KEY));return cleanupGarageMedia(committed,media,Date.now());})
 };
}
function structuredCopy(state:GarageSnapshot):GarageSnapshot{return JSON.parse(JSON.stringify(state)) as GarageSnapshot;}
