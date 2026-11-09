import {z} from 'zod';
import {reminderSchema} from './index';
import {accountGarage} from './shared-garage';
import {boundedBytes} from './bounded-body';
const id=z.string().regex(/^[A-Za-z0-9_-]{1,120}$/);
const dataSchema=z.object({vehicles:z.array(z.unknown()).max(50),maintenance:z.array(z.unknown()).max(2000),reminders:z.array(reminderSchema.safeExtend({id}).strip()).max(200),favorites:z.array(id).max(10000),garageShared:z.boolean().optional(),garageRevision:z.number().int().positive().max(1_000_000_001).nullable().optional()}).strict();
export function parseAccountData(raw:unknown){const value=dataSchema.parse(raw),garage=accountGarage(value.vehicles,value.maintenance);if(value.garageShared&&!value.garageRevision)throw Error('account_revision');return {...value,vehicles:garage.vehicles,maintenance:garage.records};}
export type AccountData=ReturnType<typeof parseAccountData>;
export class AccountRequestError extends Error{constructor(public status:number,message:string){super(message);}}
export function createAccountMutationGate(){let sequence=0,owner:number|null=null;return {reset:()=>{owner=null;},begin:()=>{if(owner!==null)throw Error('Bir işlem sürüyor. Tamamlanınca tekrar dene.');const id=++sequence;owner=id;return ()=>{if(owner===id)owner=null;};}};}
const previewSchema=z.object({member:z.boolean(),data:z.unknown()}).strict();
export function createPreviewAccountRepository(storage:{getItem(key:string):string|null;setItem(key:string,value:string):void}){
 let loaded=false;const key='otosanayide-preview-v1';
 return {read:()=>{loaded=false;const raw=storage.getItem(key);if(raw!==null&&new TextEncoder().encode(raw).length>1_100_000)throw Error('account_size');const saved=raw===null?{member:false,data:{vehicles:[],maintenance:[],reminders:[],favorites:[]}}:previewSchema.parse(JSON.parse(raw));const result={member:saved.member,data:parseAccountData(saved.data)};loaded=true;return result;},
 write:(data:AccountData,member:boolean)=>{if(!loaded)throw Error('Yerel kayıt okunamadı. Mevcut veriler değiştirilmedi.');const next={data:parseAccountData(data),member:z.boolean().parse(member)},raw=JSON.stringify(next);if(new TextEncoder().encode(raw).length>1_100_000)throw Error('account_size');storage.setItem(key,raw);return next;}};
}
export function createAccountReadGate(){let generation=0;return {begin:()=>++generation,invalidate:()=>{generation++;},accept:(ticket:number,current:AccountData,next:AccountData)=>ticket===generation&&!(current.garageShared&&(!next.garageShared||(next.garageRevision??0)<(current.garageRevision??0)))};}
export async function accountJson<T>(options:{guard:()=>void;token:()=>Promise<string>;request:(signal:AbortSignal)=>Promise<Response>;decode:(value:unknown)=>T;timeoutMs?:number}){
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('İşlem zaman aşımına uğradı. Tekrar dene.'));},options.timeoutMs??15_000);});
 try{return await Promise.race([deadline,(async()=>{
 options.guard();await options.token();options.guard();if(controller.signal.aborted)throw Error('account_timeout');const response=await options.request(controller.signal);options.guard();
 if(!response.ok)throw new AccountRequestError(response.status,response.status===409?'Hesap kayıtları değişti. Kayıtları yenileyip tekrar dene.':response.status===503?'Ortak garaj geçişi henüz etkin değil.':'İşlem tamamlanamadı. Bilgilerini ve bağlantını kontrol edip tekrar dene.');
 const bytes=await boundedBytes(response,1_100_000);options.guard();const result=options.decode(JSON.parse(new TextDecoder().decode(bytes)));options.guard();return {value:result,revision:response.headers.get('X-Garage-Revision'),check:options.guard};
 })()]);}finally{clearTimeout(timer);controller.abort();}
}
