import {decodeGarage,GarageSnapshot,GarageVehicle,GarageRecord} from './local-garage';
import {garageText,parseGarageTransfer} from './garage-transfer';
export type GarageRestoreChoice='account'|'device';
export type GarageRestoreConflict={key:string;kind:'vehicle';device:GarageVehicle;account:GarageVehicle}|{key:string;kind:'record';device:GarageRecord;account:GarageRecord};
export type GarageRestoreReview={localSignature:string;accountSignature:string;conflicts:GarageRestoreConflict[];newVehicles:number;newRecords:number};
export function reviewGarageRestore(rawLocal:GarageSnapshot,rawAccount:GarageSnapshot):GarageRestoreReview{
 const local=decodeGarage(JSON.stringify(rawLocal)),account=parseGarageTransfer(rawAccount),text=garageText(local),conflicts:GarageRestoreConflict[]=[];
 const vehicles=new Map(text.vehicles.map(v=>[v.id,v])),records=new Map(text.records.map(r=>[r.id,r]));
 for(const value of account.vehicles){const device=vehicles.get(value.id);if(device&&JSON.stringify(device)!==JSON.stringify(value))conflicts.push({key:'vehicle:'+value.id,kind:'vehicle',device,account:value});}
 for(const value of account.records){const device=records.get(value.id);if(!device)continue;if(device.vehicleId!==value.vehicleId)throw Error('restore_vehicle_conflict');if(JSON.stringify(device)!==JSON.stringify(value))conflicts.push({key:'record:'+value.id,kind:'record',device,account:value});}
 const addedVehicles=account.vehicles.filter(v=>!vehicles.has(v.id)),addedRecords=account.records.filter(r=>!records.has(r.id));
 // Validate combined capacity and references before requesting a decision.
 try{decodeGarage(JSON.stringify({...local,vehicles:[...local.vehicles,...addedVehicles],records:[...local.records,...addedRecords]}));}catch{throw Error('restore_capacity');}
 return {localSignature:JSON.stringify(local),accountSignature:JSON.stringify(account),conflicts,newVehicles:addedVehicles.length,newRecords:addedRecords.length};
}
export function applyGarageRestore(rawLocal:GarageSnapshot,rawAccount:GarageSnapshot,review:GarageRestoreReview,choices:Record<string,GarageRestoreChoice>):GarageSnapshot{
 const local=decodeGarage(JSON.stringify(rawLocal)),account=parseGarageTransfer(rawAccount);
 if(JSON.stringify(local)!==review.localSignature||JSON.stringify(account)!==review.accountSignature)throw Error('restore_changed');
 const fresh=reviewGarageRestore(local,account),expected=new Set(fresh.conflicts.map(c=>c.key));
 if(Object.keys(choices).length!==expected.size||Object.entries(choices).some(([key,value])=>!expected.has(key)||!['account','device'].includes(value)))throw Error('restore_choices');
 const vehicles=new Map(local.vehicles.map(v=>[v.id,v])),records=new Map(local.records.map(r=>[r.id,r]));
 for(const value of account.vehicles){const device=vehicles.get(value.id);if(!device)vehicles.set(value.id,value);else if(choices['vehicle:'+value.id]==='account')vehicles.set(value.id,{...value,...(device.photoId?{photoId:device.photoId}:{})});}
 for(const value of account.records){const device=records.get(value.id);if(!device)records.set(value.id,value);else if(choices['record:'+value.id]==='account')records.set(value.id,{...value,...(device.attachmentIds?{attachmentIds:device.attachmentIds}:{})});}
 try{return decodeGarage(JSON.stringify({...local,vehicles:[...vehicles.values()],records:[...records.values()]}));}catch{throw Error('restore_capacity');}
}
