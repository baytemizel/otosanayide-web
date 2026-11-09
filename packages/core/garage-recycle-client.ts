import {z} from 'zod';
import {boundedBytes} from './bounded-body';
import {garageApiUrl} from './garage-transfer';
import {garageRecycleAction,garageRecycleStatus} from './garage-recycle';
export async function fetchGarageRecycle(options:{origin:string;token:()=>Promise<string>;guard:()=>void;locale:string;input?:unknown;request?:typeof fetch;timeoutMs?:number}){
 const {guard}=options;guard();const url=garageApiUrl(options.origin)+'/lifecycle',payload=options.input===undefined?undefined:garageRecycleAction.parse(options.input);
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('backup_timeout'));},options.timeoutMs??15_000);});
 try{return await Promise.race([deadline,(async()=>{
  const token=await options.token();guard();if(controller.signal.aborted)throw Error('backup_timeout');
  const response=await (options.request??fetch)(url,{method:payload?'POST':'GET',redirect:'error',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,'Accept-Language':options.locale,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
  guard();if(!response.ok)throw Error(response.status===409?'recycle_conflict':response.status===401?'session_expired':response.status===403?'email_unverified':response.status===503?'backup_disabled':'backup_request');
  const bytes=await boundedBytes(response,2048);guard();const result=z.object({status:garageRecycleStatus}).strict().parse(JSON.parse(new TextDecoder().decode(bytes)));guard();return result.status;
 })()]);}finally{clearTimeout(timer);}
}
