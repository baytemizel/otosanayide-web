import test from 'node:test';import assert from 'node:assert/strict';
import {accountJson,parseAccountData,createAccountReadGate,createAccountMutationGate,createPreviewAccountRepository} from './account-client';
import {createSessionFence} from './garage-transfer';
const data=()=>({vehicles:[{id:'car',brand:'Honda',model:'Civic',year:2020,mileage:40000,fuel:'Benzin'}],maintenance:[],reminders:[],favorites:[]});
test('legacy account decoder preserves media/IDs and validates shared revision and relationships',()=>{
 const next=parseAccountData(data());assert.equal(next.vehicles[0].id,'car');assert.equal(next.vehicles[0].archived,false);
 for(const patch of [{vehicles:[{...data().vehicles[0],uid:'foreign'}]},{garageShared:true},{maintenance:[{id:'bad',vehicleId:'absent',title:'Bakım',date:'2026-01-01',mileage:0,amount:1,note:''}]},{vehicles:[...data().vehicles,...data().vehicles]}])assert.throws(()=>parseAccountData({...data(),...patch}));
});
test('old reads cannot undo writes, later refreshes or the shared model activation',()=>{
 const gate=createAccountReadGate(),before=parseAccountData(data()),next={...before,garageShared:true,garageRevision:4};
 const old=gate.begin(),newer=gate.begin();assert.equal(gate.accept(old,before,next),false);assert.equal(gate.accept(newer,before,next),true);gate.invalidate();assert.equal(gate.accept(newer,before,next),false);
 const ticket=gate.begin();assert.equal(gate.accept(ticket,next,{...next,garageRevision:3}),false);assert.equal(gate.accept(ticket,next,before),false);assert.equal(gate.accept(ticket,next,{...next,garageRevision:5}),true);
});
test('account A token and responses are rejected after logout or A-B-A session changes',async()=>{
 const fence=createSessionFence();let sent=false;
 await assert.rejects(accountJson({guard:fence.capture(),token:async()=>{fence.change();return 'old';},request:async()=>{sent=true;return Response.json(data());},decode:parseAccountData}),/session_changed/);assert.equal(sent,false);
 await assert.rejects(accountJson({guard:fence.capture(),token:async()=>'synthetic',request:async()=>{fence.change();fence.change();return Response.json(data());},decode:parseAccountData}),/session_changed/);
});
test('account change during response body read never decodes or applies data',async()=>{
 const fence=createSessionFence();let decoded=false;
 await assert.rejects(accountJson({guard:fence.capture(),token:async()=>'synthetic',request:async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));fence.change();controller.enqueue(new TextEncoder().encode('}'));controller.close();}})),decode:()=>{decoded=true;return {};}}),/session_changed/);assert.equal(decoded,false);
});
test('account transport bounds responses, hides server error content and returns revision for final caller check',async()=>{
 const fence=createSessionFence(),result=await accountJson({guard:fence.capture(),token:async()=>'synthetic',request:async()=>Response.json(data(),{headers:{'X-Garage-Revision':'4'}}),decode:parseAccountData});assert.equal(result.revision,'4');result.check();fence.change();assert.throws(result.check,/session_changed/);
 await assert.rejects(accountJson({guard:()=>{},token:async()=>'synthetic',request:async()=>new Response('x'.repeat(1_100_001)),decode:parseAccountData}),RangeError);
 for(const status of [401,409,500,503])await assert.rejects(accountJson({guard:()=>{},token:async()=>'synthetic',request:async()=>new Response('PRIVATE-CANARY',{status}),decode:parseAccountData}),error=>error instanceof Error&&!error.message.includes('PRIVATE-CANARY'));
});
test('timeout during token acquisition never transmits credentials after returning',async()=>{
 let resolve!:(value:string)=>void,sent=false;const token=new Promise<string>(r=>{resolve=r;});
 await assert.rejects(accountJson({guard:()=>{},token:()=>token,timeoutMs:10,request:async()=>{sent=true;return Response.json(data());},decode:parseAccountData}),/zaman aşımı/);resolve('late');await new Promise(r=>setTimeout(r,10));assert.equal(sent,false);
});

test('old account mutation finalizer cannot unlock another account active write',()=>{const gate=createAccountMutationGate(),releaseA=gate.begin();assert.throws(()=>gate.begin());gate.reset();const releaseB=gate.begin();releaseA();assert.throws(()=>gate.begin());releaseB();gate.begin()();});

test('preview read failure after a successful load disables writes until recovery',()=>{let raw=JSON.stringify({member:true,data:data()}),fail=false;const repository=createPreviewAccountRepository({getItem:()=>{if(fail)throw Error('read_failure');return raw;},setItem:(_,v)=>{raw=v;}});const loaded=repository.read(),before=raw;fail=true;assert.throws(()=>repository.read(),/read_failure/);assert.throws(()=>repository.write(loaded.data,false));assert.equal(raw,before);fail=false;repository.read();repository.write(loaded.data,false);assert.equal(JSON.parse(raw).member,false);});
test('corrupt, unsupported and oversized preview data is never replaced with empty data',()=>{for(const raw of ['{bad',JSON.stringify({member:true,data:{}}),JSON.stringify({member:true,data:data(),unknown:true}),'x'.repeat(1_100_001)]){let writes=0;const repository=createPreviewAccountRepository({getItem:()=>raw,setItem:()=>{writes++;}});assert.throws(()=>repository.read());assert.throws(()=>repository.write(parseAccountData(data()),true));assert.equal(writes,0);}});
test('missing preview record is empty only after a successful read and does not cause an automatic write',()=>{let raw:string|null=null,writes=0;const repository=createPreviewAccountRepository({getItem:()=>raw,setItem:(_,v)=>{writes++;raw=v;}});assert.throws(()=>repository.write(parseAccountData(data()),true));assert.equal(repository.read().member,false);assert.equal(writes,0);repository.write(parseAccountData(data()),true);assert.equal(writes,1);raw=null;assert.equal(repository.read().data.vehicles.length,0);});
test('preview quota failure preserves the old stored data and the supplied input',()=>{const raw=JSON.stringify({member:true,data:data()}),repository=createPreviewAccountRepository({getItem:()=>raw,setItem:()=>{throw Error('quota');}}),loaded=repository.read(),before=JSON.stringify(loaded);assert.throws(()=>repository.write(loaded.data,false),/quota/);assert.equal(JSON.stringify(loaded),before);assert.equal(repository.read().member,true);});
