import {z} from 'zod';
import {emptyGarage} from './local-garage';
import {GarageBackup,garageBackupSchema} from './garage-transfer';

export const GARAGE_RECYCLE_DAYS=30;
const revision=z.number().int().min(1).max(1_000_000_001);
const meta={version:z.literal(1),operationId:z.string().uuid(),revision,changedAt:z.string().datetime()};
export const garageRecycleSchema=z.discriminatedUnion('state',[
 z.object({...meta,state:z.literal('trashed'),purgeAfter:z.string().datetime(),backup:garageBackupSchema}).strict(),
 z.object({...meta,state:z.literal('restored')}).strict(),
 z.object({...meta,state:z.literal('purged')}).strict(),
]).superRefine((value,ctx)=>{
 if(value.state==='trashed'&&(value.revision!==value.backup.revision+1||Date.parse(value.changedAt)<Date.parse(value.backup.updatedAt)||Date.parse(value.purgeAfter)!==Date.parse(value.changedAt)+GARAGE_RECYCLE_DAYS*86400000))ctx.addIssue({code:'custom',message:'Invalid recycle metadata.'});
});
export const garageRecycleAction=z.object({action:z.enum(['trash','restore']),expectedRevision:revision,operationId:z.string().uuid(),acknowledged:z.literal(true)}).strict();
export const garageRecycleStatus=z.object({state:z.enum(['none','available','trashed','expired','shared']),revision:revision.nullable(),vehicles:z.number().int().min(0).max(50),records:z.number().int().min(0).max(2000),purgeAfter:z.string().datetime().nullable()}).strict();
export type GarageRecycleStatus=z.infer<typeof garageRecycleStatus>;
export type GarageRecycle=z.infer<typeof garageRecycleSchema>;
export function recycleStatus(backup:GarageBackup|null,recycle:GarageRecycle|null,shared:boolean,now:string):GarageRecycleStatus{
 z.string().datetime().parse(now);
 if(shared)return garageRecycleStatus.parse({state:'shared',revision:backup?.revision??null,vehicles:0,records:0,purgeAfter:null});
 if(recycle?.state==='trashed'){
  assertEmptyBackup(backup,recycle.revision,recycle.operationId);
  return garageRecycleStatus.parse({state:Date.parse(now)>=Date.parse(recycle.purgeAfter)?'expired':'trashed',revision:backup!.revision,vehicles:recycle.backup.garage.vehicles.length,records:recycle.backup.garage.records.length,purgeAfter:recycle.purgeAfter});
 }
 return garageRecycleStatus.parse({state:backup&&(backup.garage.vehicles.length||backup.garage.records.length)?'available':'none',revision:backup?.revision??null,vehicles:backup?.garage.vehicles.length??0,records:backup?.garage.records.length??0,purgeAfter:null});
}
function assertEmptyBackup(backup:GarageBackup|null,rev:number,operationId:string){if(!backup||backup.revision!==rev||backup.operationId!==operationId||backup.garage.vehicles.length||backup.garage.records.length)throw Error('recycle_corrupt');}
export function planGarageRecycle(previous:unknown,stored:unknown,raw:unknown,shared:boolean,now:string){
 const backup=previous===null?null:garageBackupSchema.parse(previous),recycle=stored===null?null:garageRecycleSchema.parse(stored),input=garageRecycleAction.parse(raw);z.string().datetime().parse(now);
 if(shared)throw Error('recycle_shared');
 if(!backup)throw Error('recycle_conflict');
 if(recycle?.operationId===input.operationId){
  const state=input.action==='trash'?'trashed':'restored';
  if(recycle.state===state&&recycle.revision===input.expectedRevision+1&&backup.revision===recycle.revision&&backup.operationId===input.operationId){
   if(recycle.state==='trashed')assertEmptyBackup(backup,recycle.revision,recycle.operationId);
   return {backup,recycle,changed:false};
  }
  throw Error('recycle_conflict');
 }
 if(backup.revision!==input.expectedRevision||Date.parse(now)<Date.parse(backup.updatedAt))throw Error('recycle_conflict');
 const nextRevision=backup.revision+1;
 if(input.action==='trash'){
  if(recycle?.state==='trashed'||!(backup.garage.vehicles.length||backup.garage.records.length))throw Error('recycle_conflict');
  const next=garageBackupSchema.parse({revision:nextRevision,operationId:input.operationId,updatedAt:now,garage:emptyGarage()});
  return {backup:next,recycle:garageRecycleSchema.parse({version:1,state:'trashed',revision:nextRevision,operationId:input.operationId,changedAt:now,purgeAfter:new Date(Date.parse(now)+GARAGE_RECYCLE_DAYS*86400000).toISOString(),backup}),changed:true};
 }
 if(recycle?.state!=='trashed'||Date.parse(now)<Date.parse(recycle.changedAt)||Date.parse(now)>=Date.parse(recycle.purgeAfter))throw Error('recycle_conflict');
 assertEmptyBackup(backup,recycle.revision,recycle.operationId);
 return {backup:garageBackupSchema.parse({...recycle.backup,revision:nextRevision,operationId:input.operationId,updatedAt:now}),recycle:garageRecycleSchema.parse({version:1,state:'restored',revision:nextRevision,operationId:input.operationId,changedAt:now}),changed:true};
}
export function planGaragePurge(previous:unknown,stored:unknown,shared:boolean,now:string){
 const backup=previous===null?null:garageBackupSchema.parse(previous),recycle=stored===null?null:garageRecycleSchema.parse(stored);z.string().datetime().parse(now);
 if(!recycle||recycle.state!=='trashed'||Date.parse(now)<Date.parse(recycle.purgeAfter))return null;
 if(shared)throw Error('recycle_shared');
 assertEmptyBackup(backup,recycle.revision,recycle.operationId);
 return garageRecycleSchema.parse({version:1,state:'purged',revision:recycle.revision,operationId:recycle.operationId,changedAt:now});
}
