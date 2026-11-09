import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyGarage,saveGarageVehicle,saveGarageRecord,createGarageRepository} from './local-garage';
import {garageText,parseGarageTransfer,garageBackupWrite,planGarageBackup,mergeGarageBackup,createSessionFence,garageApiUrl,garageOriginAllowed} from './garage-transfer';
import {fetchGarageBackup} from './garage-transfer-client';
const operationId='93f7bafc-32c8-4217-890c-96371584c19a',photoId='d1d15b8d-af91-4143-a224-c2038a647ae3',now='2026-10-20T12:00:00.000Z';
function garage(){return saveGarageRecord(saveGarageVehicle(emptyGarage(),{brand:'Honda',model:'Civic',year:2020,mileage:40_000,fuel:'Benzin',photoId},'v1'),{vehicleId:'v1',title:'Yağ değişimi',date:'2026-01-01',mileage:40_100,amount:2000,note:'Not',attachmentIds:['e6964235-358c-45cc-9e07-3cc950cebd76']},'r1');}
const input=()=>({expectedRevision:0,operationId,garage:garageText(garage())});
test('text projection removes all private media and selection without mutating local data',()=>{
 const source=garage(),before=JSON.stringify(source),result=garageText(source);
 assert.equal(JSON.stringify(source),before);assert.equal(result.selectedVehicleId,null);assert.equal(result.vehicles[0].photoId,undefined);assert.equal(result.records[0].attachmentIds,undefined);
 assert.deepEqual(parseGarageTransfer(result),result);assert.throws(()=>parseGarageTransfer(source));assert.throws(()=>garageBackupWrite.parse({...input(),uid:'other'}));
 assert.throws(()=>parseGarageTransfer({...result,vehicles:[{...result.vehicles[0],photoId:undefined,secret:'x'}]}));
});
test('first backup and exact response-loss retry are idempotent; stale writes cannot overwrite',()=>{
 const first=planGarageBackup(null,input(),now);assert.equal(first.changed,true);assert.equal(first.backup.revision,1);
 assert.deepEqual(planGarageBackup(first.backup,input(),now),{backup:first.backup,changed:false});
 assert.throws(()=>planGarageBackup(first.backup,{...input(),operationId:photoId},now),/transfer_conflict/);
 assert.throws(()=>planGarageBackup(first.backup,{...input(),garage:emptyGarage()},now),/transfer_conflict/);
 const second=planGarageBackup(first.backup,{...input(),expectedRevision:1,operationId:photoId},now);assert.equal(second.backup.revision,2);
 assert.throws(()=>planGarageBackup(second.backup,input(),now),/transfer_conflict/);
 assert.throws(()=>planGarageBackup(second.backup,{...input(),expectedRevision:2,operationId:'324da021-d794-4e5a-b20a-e7c1c52bf60b'},'2026-10-19T12:00:00.000Z'),/transfer_clock/);
});
test('invalid relationship, malformed stored state and UTF-8 size overflow fail closed',()=>{
 const text=garageText(garage());assert.throws(()=>parseGarageTransfer({...text,records:[{...text.records[0],vehicleId:'other'}]}));
 assert.throws(()=>planGarageBackup({revision:1},input(),now));
 const records=Array.from({length:600},(_,i)=>({...text.records[0],id:`r${i}`,note:'ğ'.repeat(900)}));
 assert.throws(()=>parseGarageTransfer({...text,records}),/transfer_size/);
});
test('add-only restore preserves local selection, archived records and media, repeated restore has no duplicates',()=>{
 const local=garage();const remote=saveGarageVehicle(garageText(local),{brand:'BMW',model:'320',year:2023,mileage:5,fuel:'Dizel'},'v2');remote.selectedVehicleId=null;
 const merged=mergeGarageBackup(local,remote);assert.equal(merged.vehicles.length,2);assert.equal(merged.records.length,1);assert.equal(merged.selectedVehicleId,'v1');assert.equal(merged.vehicles[0].photoId,photoId);assert.deepEqual(merged.records[0].attachmentIds,local.records[0].attachmentIds);
 assert.deepEqual(mergeGarageBackup(merged,remote),merged);assert.equal(local.vehicles.length,1);
 const changed=garageText(remote);changed.vehicles[0].model='Different';assert.throws(()=>mergeGarageBackup(local,changed),/transfer_conflict/);
 const changedRecord=garageText(remote);changedRecord.records[0].amount=3;assert.throws(()=>mergeGarageBackup(local,changedRecord),/transfer_conflict/);
});
test('restore rechecks latest persisted state and fails without replacing concurrent local changes',async()=>{
 let raw=JSON.stringify(garage());const repo=createGarageRepository({getItem:async()=>raw,setItem:async(_,v)=>{raw=v;}});await repo.load();
 const edited=garage();edited.vehicles[0].model='Edited elsewhere';raw=JSON.stringify(edited);
 await assert.rejects(repo.update(local=>mergeGarageBackup(local,input().garage)),/transfer_conflict/);assert.equal(raw,JSON.stringify(edited));
});
test('session epoch rejects old account responses even when same account signs in again',()=>{
 const fence=createSessionFence(),a=fence.capture();a();fence.change();assert.throws(a,/session_changed/);const b=fence.capture();fence.change();assert.throws(b,/session_changed/);assert.throws(a,/session_changed/);fence.capture()();
});
test('API credentials can only be sent to a plain HTTPS origin',()=>{
 assert.equal(garageApiUrl('https://www.otosanayide.com'),'https://www.otosanayide.com/api/me/garage');
 for(const origin of ['http://127.0.0.1:3001','https://user:secret@example.com','https://example.com/path','https://example.com/?token=secret','https://example.com/#x'])assert.throws(()=>garageApiUrl(origin));
});
const options=()=>({origin:'https://www.otosanayide.com',token:async()=>'synthetic-id-token',guard:()=>{},locale:'tr'});
test('CORS handles only exact HTTPS origins and same-port loopback normalization',()=>{
 assert.equal(garageOriginAllowed(null,'http://localhost:3002'),true);
 assert.equal(garageOriginAllowed('http://127.0.0.1:3002','http://localhost:3002'),true);
 for(const origin of ['null','http://127.0.0.1:3003','https://127.0.0.1:3002','https://foreign.example.test','http://localhost.evil.test:3002'])assert.equal(garageOriginAllowed(origin,'http://localhost:3002'),false);
 assert.equal(garageOriginAllowed('https://www.otosanayide.com','http://localhost:3002','https://www.otosanayide.com'),true);
 assert.equal(garageOriginAllowed('https://www.otosanayide.com','http://localhost:3002','https://www.otosanayide.com/'),false);
 assert.equal(garageOriginAllowed('http://foreign.example.test','http://localhost:3002','http://foreign.example.test'),false);
});
test('authenticated API uses bounded strict responses, explicit language, bearer and PUT payload',async()=>{
 const backup=planGarageBackup(null,input(),now).backup;
 const result=await fetchGarageBackup({...options(),input:input(),request:async(url,init)=>{assert.equal(String(url),'https://www.otosanayide.com/api/me/garage');assert.equal(init?.method,'PUT');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer synthetic-id-token');assert.equal(init?.redirect,'error');assert.deepEqual(JSON.parse(init!.body as string),input());return Response.json({backup});}});
 assert.deepEqual(result,backup);
 await assert.rejects(fetchGarageBackup({...options(),request:async()=>Response.json({backup:null,uid:'other'})}));
 await assert.rejects(fetchGarageBackup({...options(),input:input(),request:async()=>Response.json({backup:null})}));
 await assert.rejects(fetchGarageBackup({...options(),request:async()=>new Response('x'.repeat(510_001))}),RangeError);
});
test('account switch while obtaining token never sends a request; switch during response never exposes data',async()=>{
 const fence=createSessionFence();let requested=false;
 await assert.rejects(fetchGarageBackup({...options(),guard:fence.capture(),token:async()=>{fence.change();return 'old';},request:async()=>{requested=true;return Response.json({backup:null});}}),/session_changed/);assert.equal(requested,false);
 const check=fence.capture();await assert.rejects(fetchGarageBackup({...options(),guard:check,request:async()=>{fence.change();return Response.json({backup:null});}}),/session_changed/);
});
test('HTTP failures are safe codes, no remote errors or credentials reflected',async()=>{
 for(const [status,code] of [[401,'session_expired'],[403,'email_unverified'],[409,'transfer_conflict'],[503,'backup_disabled'],[500,'backup_request']] as const)
  await assert.rejects(fetchGarageBackup({...options(),request:async()=>new Response('private server detail',{status})}),new RegExp(code));
});
test('timeout covers token acquisition and forbids a late credential request',async()=>{
 let resolveToken!:(v:string)=>void,requested=false;
 const token=new Promise<string>(resolve=>{resolveToken=resolve;});
 await assert.rejects(fetchGarageBackup({...options(),timeoutMs:10,token:()=>token,request:async()=>{requested=true;return Response.json({backup:null});}}),/backup_timeout/);
 resolveToken('late');await new Promise(resolve=>setTimeout(resolve,10));assert.equal(requested,false);
});
