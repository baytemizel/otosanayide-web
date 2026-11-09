import {z} from 'zod';
import {vehicleSchema,maintenanceSchema} from './index';
import {decodeGarage,emptyGarage,GarageSnapshot,saveGarageRecord,saveGarageVehicle} from './local-garage';
import {GarageBackup,garageText,parseGarageTransfer,garageBackupSchema,garageBackupWrite,planGarageBackup} from './garage-transfer';

export const sharedGarageMigration=z.object({expectedRevision:z.number().int().min(0).max(1_000_000_000),operationId:z.string().uuid(),fingerprint:z.string().regex(/^[a-f0-9]{64}$/),acknowledged:z.literal(true)}).strict();
// Only known storage metadata is removed. Unknown content fails schema validation.
export function accountGarage(vehicles:unknown[],maintenance:unknown[]):GarageSnapshot{
 const clean=(raw:unknown)=>{const {createdAt:_,updatedAt:__,...value}=z.record(z.string(),z.unknown()).parse(raw);return value;};
 return decodeGarage(JSON.stringify({...emptyGarage(),vehicles:vehicles.map(raw=>{const value=clean(raw);return {...value,archived:value.archived??false};}),records:maintenance.map(clean)}));
}
export function combineSharedGarage(base:GarageSnapshot,incoming:GarageSnapshot,replace:boolean):GarageSnapshot{
 const left=parseGarageTransfer(base),right=parseGarageTransfer(incoming);
 function combine<T extends {id:string;vehicleId?:string}>(old:T[],next:T[]):T[]{const map=new Map(old.map(v=>[v.id,v]));for(const value of next){const existing=map.get(value.id);if(existing){if(existing.vehicleId!==value.vehicleId)throw Error('shared_conflict');if(!replace&&JSON.stringify(existing)!==JSON.stringify(value))throw Error('shared_conflict');}map.set(value.id,value);}return [...map.values()];}
 return parseGarageTransfer({...emptyGarage(),vehicles:combine(left.vehicles,right.vehicles),records:combine(left.records,right.records)});
}
export function planSharedGarageWrite(previous:GarageBackup,raw:unknown,now:string,previousDigest:string|null,digest:string){
 const input=garageBackupWrite.parse(raw);
 if(previous.operationId===input.operationId&&previousDigest!==digest)throw Error('shared_conflict');
 const garage=combineSharedGarage(previous.garage,input.garage,true);
 return planGarageBackup(previous,{...input,garage},now);
}
export function changeSharedAccountGarage(previous:GarageBackup,resource:'vehicles'|'maintenance',id:string,raw:unknown,update:boolean,operationId:string,now:string){
 const state=garageBackupSchema.parse(previous).garage;
 const existing=(resource==='vehicles'?state.vehicles:state.records).find(v=>v.id===id);
 if(update?!existing:!!existing)throw Error('shared_conflict');
 let next:GarageSnapshot;
 if(resource==='vehicles')next=saveGarageVehicle(state,vehicleSchema.parse(raw),id);
 else next=saveGarageRecord(state,maintenanceSchema.parse(raw),id);
 return planGarageBackup(previous,{expectedRevision:previous.revision,operationId,garage:garageText(next)},now).backup;
}
