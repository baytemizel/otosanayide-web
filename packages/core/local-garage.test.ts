import {test} from 'node:test';
import assert from 'node:assert/strict';
import {archiveGarageVehicle,createGarageRepository,decodeGarage,emptyGarage,GARAGE_KEY,garageHistory,parseGarageAmount,saveGarageRecord,saveGarageVehicle} from './local-garage';
const vehicle={brand:'Toyota',model:'Corolla',year:2020,fuel:'Benzin',mileage:10000};
const maintenance={vehicleId:'a',title:'Yağ değişimi',date:'2026-01-02',mileage:11000,amount:1250.25,note:'Yağ ve filtre'};
test('garage observers see committed loads/writes and cannot corrupt state or roll back storage',async()=>{let raw:string|null=null,fail=false,seen=0;const repo=createGarageRepository({getItem:async()=>raw,setItem:async(_key,value)=>{if(fail)throw Error('quota');raw=value;}});const off=repo.subscribe(value=>{seen++;value.vehicles.length=0;throw Error('observer');});await repo.load();await repo.update(s=>saveGarageVehicle(s,vehicle,'a'));assert.equal(seen,2);assert.equal(decodeGarage(raw).vehicles.length,1);fail=true;await assert.rejects(repo.update(s=>archiveGarageVehicle(s,'a',true)));assert.equal(seen,2);off();fail=false;await repo.load();assert.equal(seen,2);});
test('two vehicles retain isolated histories, selected vehicle and exact expenses after restart',async()=>{
 const values=new Map<string,string>();const storage={getItem:async(k:string)=>values.get(k)??null,setItem:async(k:string,v:string)=>{values.set(k,v);}};
 const repo=createGarageRepository(storage);await repo.load();
 await repo.update(s=>saveGarageVehicle(s,vehicle,'a'));await repo.update(s=>saveGarageVehicle(s,{...vehicle,model:'Yaris'},'b'));
 await repo.update(s=>saveGarageRecord(s,maintenance,'r1'));await repo.update(s=>saveGarageRecord(s,{...maintenance,vehicleId:'b',amount:10.1},'r2'));
 await repo.update(s=>saveGarageRecord(s,{...maintenance,amount:0.1,date:'2025-01-01'},'r3'));
 const restored=await createGarageRepository(storage).load();
 assert.equal(restored.selectedVehicleId,'b');assert.equal(garageHistory(restored,'a').total,1250.35);assert.equal(garageHistory(restored,'b').records.length,1);
 assert.deepEqual(garageHistory(restored,'a').records.map(r=>r.id),['r1','r3']);assert.equal(restored.vehicles[0].mileage,11000);
});
test('concurrent writes serialize and a failed write never commits or poisons subsequent commands',async()=>{
 let raw:string|null=null;let fail=false;
 const repo=createGarageRepository({getItem:async()=>raw,setItem:async(_k,v)=>{if(fail){fail=false;throw Error('full');}raw=v;}});
 await assert.rejects(repo.update(s=>s));await repo.load();
 await Promise.all([repo.update(s=>saveGarageVehicle(s,vehicle,'a')),repo.update(s=>saveGarageVehicle(s,vehicle,'b'))]);
 fail=true;await assert.rejects(repo.update(s=>saveGarageRecord(s,maintenance,'failed')));
 const result=await repo.update(s=>saveGarageRecord(s,maintenance,'success'));
 assert.equal(result.vehicles.length,2);assert.deepEqual(result.records.map(r=>r.id),['success']);assert.equal(decodeGarage(raw).records.length,1);
});
test('corrupt, future format, duplicate, orphan and oversized data are rejected without overwrite',async()=>{
 for(const raw of ['{',JSON.stringify({...emptyGarage(),version:2}), 'x'.repeat(1_000_001),JSON.stringify({...emptyGarage(),selectedVehicleId:'missing'})]){
  let writes=0;const repo=createGarageRepository({getItem:async()=>raw,setItem:async()=>{writes++;}});
  await assert.rejects(repo.load());await assert.rejects(repo.update(()=>emptyGarage()));assert.equal(writes,0);
 }
 const state=saveGarageVehicle(emptyGarage(),vehicle,'a');
 assert.throws(()=>decodeGarage(JSON.stringify({...state,vehicles:[...state.vehicles,...state.vehicles]})));
 assert.throws(()=>saveGarageRecord(emptyGarage(),maintenance,'r'));
 assert.throws(()=>decodeGarage(JSON.stringify({...state,records:[{...maintenance,vehicleId:'missing',id:'r'}]})));
});
test('archive is reversible and retains maintenance, edits cannot silently move records between vehicles',()=>{
 let state=saveGarageVehicle(emptyGarage(),vehicle,'a');state=saveGarageVehicle(state,vehicle,'b');state=saveGarageRecord(state,maintenance,'r');
 state=archiveGarageVehicle(state,'a',true);assert.equal(garageHistory(state,'a').total,1250.25);
 assert.throws(()=>saveGarageRecord(state,maintenance,'new'));state=archiveGarageVehicle(state,'a',false);
 assert.throws(()=>saveGarageRecord(state,{...maintenance,vehicleId:'b'},'r'));
 state=saveGarageRecord(state,{...maintenance,title:'Düzeltilmiş bakım',amount:10,mileage:9000},'r');
 assert.equal(state.records.length,1);assert.equal(state.records[0].amount,10);assert.equal(state.vehicles[0].mileage,11000);
});
test('currency parsing rejects empty, ambiguous, exponent, negative and excessive precision inputs',()=>{
 assert.equal(parseGarageAmount('1250,50'),1250.5);assert.equal(parseGarageAmount('10.10'),10.1);assert.equal(parseGarageAmount('0'),0);
 for(const v of ['','1.250,50','1,250.50','1e3','-1','1.001','Infinity','10000000.01'])assert.throws(()=>parseGarageAmount(v));
});
test('limits, future history, unknown fields and unrelated storage remain protected',async()=>{
 let state=emptyGarage();for(let i=0;i<50;i++)state=saveGarageVehicle(state,vehicle,`v${i}`);
 assert.throws(()=>saveGarageVehicle(state,vehicle,'extra'));
 assert.throws(()=>saveGarageRecord(state,{...maintenance,vehicleId:'v0',date:'2999-01-01'},'r'));
 assert.throws(()=>saveGarageVehicle(emptyGarage(),{...vehicle,secret:'no'},'a'));
 const keys:string[]=[];const repo=createGarageRepository({getItem:async k=>{keys.push(k);return null;},setItem:async k=>{keys.push(k);}});
 await repo.load();await repo.update(s=>saveGarageVehicle(s,vehicle,'a'));assert.ok(keys.every(key=>key===GARAGE_KEY));
});
