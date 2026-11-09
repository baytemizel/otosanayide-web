import {z} from 'zod';
import {decodeGarage,GarageSnapshot} from './local-garage';

export const GARAGE_TRANSFER_BYTES=500_000;
// Selected vehicle and private media identifiers belong to the device, never the backup.
export function garageText(state:GarageSnapshot):GarageSnapshot{
 const valid=decodeGarage(JSON.stringify(state));
 return {...valid,selectedVehicleId:null,
  vehicles:valid.vehicles.map(({photoId:_,...v})=>v).sort((a,b)=>a.id.localeCompare(b.id)),
  records:valid.records.map(({attachmentIds:_,...r})=>r).sort((a,b)=>a.id.localeCompare(b.id))};
}
export function parseGarageTransfer(value:unknown):GarageSnapshot{
 const raw=JSON.stringify(value);
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>GARAGE_TRANSFER_BYTES)throw Error('transfer_size');
 const valid=decodeGarage(raw),text=garageText(valid);
 if(valid.selectedVehicleId!==null||valid.vehicles.some(v=>v.photoId!==undefined)||valid.records.some(r=>r.attachmentIds!==undefined))throw Error('transfer_media');
 return text;
}
const transfer=z.unknown().transform((v,ctx)=>{try{return parseGarageTransfer(v);}catch{ctx.addIssue({code:'custom',message:'Geçersiz garaj yedeği.'});return z.NEVER;}});
export const garageBackupWrite=z.object({expectedRevision:z.number().int().min(0).max(1_000_000_000),operationId:z.string().uuid(),garage:transfer}).strict();
export const garageBackupSchema=z.object({revision:z.number().int().min(1).max(1_000_000_001),updatedAt:z.string().datetime(),operationId:z.string().uuid(),garage:transfer}).strict();
export type GarageBackup=z.infer<typeof garageBackupSchema>;
export function planGarageBackup(previous:unknown,input:unknown,now:string){
 const before=previous===null?null:garageBackupSchema.parse(previous),write=garageBackupWrite.parse(input);
 if(before?.operationId===write.operationId){
  if(before.revision===write.expectedRevision+1&&JSON.stringify(before.garage)===JSON.stringify(write.garage))return {backup:before,changed:false};
  throw Error('transfer_conflict');
 }
 if((before?.revision??0)!==write.expectedRevision)throw Error('transfer_conflict');
 if(before&&now<before.updatedAt)throw Error('transfer_clock');
 return {backup:garageBackupSchema.parse({garage:write.garage,operationId:write.operationId,revision:write.expectedRevision+1,updatedAt:now}),changed:true};
}
// Add missing identities only. Conflicting text is never silently replaced; local media survives.
export function mergeGarageBackup(local:GarageSnapshot,remote:GarageSnapshot):GarageSnapshot{
 const current=decodeGarage(JSON.stringify(local)),incoming=parseGarageTransfer(remote);
 const text=garageText(current);
 for(const key of ['vehicles','records'] as const){
  const existing=new Map(text[key].map(v=>[v.id,JSON.stringify(v)] as const));
  for(const item of incoming[key])if(existing.has(item.id)&&existing.get(item.id)!==JSON.stringify(item))throw Error('transfer_conflict');
 }
 const vehicles=[...current.vehicles,...incoming.vehicles.filter(v=>!current.vehicles.some(l=>l.id===v.id))];
 const records=[...current.records,...incoming.records.filter(r=>!current.records.some(l=>l.id===r.id))];
 return decodeGarage(JSON.stringify({...current,vehicles,records}));
}

// In-flight account A responses cannot appear in account B's view, even A -> B -> A.
export function createSessionFence(){let epoch=0;return {change:()=>++epoch,capture:()=>{const captured=epoch;return ()=>{if(captured!==epoch)throw Error('session_changed');};}};}
export function garageApiUrl(origin:string){
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('api_origin');
 return `${url.origin}/api/me/garage`;
}
export function garageOriginAllowed(origin:string|null,serverOrigin:string,configuredOrigin?:string){
 if(origin===null)return true; // Native clients still require a verified bearer token.
 try{
  const source=new URL(origin),server=new URL(serverOrigin);
  if(source.origin!==origin)return false;
  if(origin===server.origin)return true;
  if(configuredOrigin){try{garageApiUrl(configuredOrigin);if(origin===configuredOrigin)return true;}catch{}}
  const loopback=(host:string)=>['localhost','127.0.0.1','[::1]'].includes(host);
  // Next canonicalizes 127.0.0.1 to localhost in NextURL; never generalize this to arbitrary hosts.
  return loopback(source.hostname)&&loopback(server.hostname)&&source.protocol===server.protocol&&source.port===server.port;
 }catch{return false;}
}
