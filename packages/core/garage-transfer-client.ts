import {z} from 'zod';
import {boundedBytes} from './bounded-body';
import {garageApiUrl,garageBackupSchema,garageBackupWrite} from './garage-transfer';
const responseSchema=z.object({backup:garageBackupSchema.nullable()}).strict();
export async function fetchGarageBackup(options:{origin:string;token:()=>Promise<string>;guard:()=>void;locale:string;input?:unknown;request?:typeof fetch;timeoutMs?:number}){
 const {guard}=options;guard();const url=garageApiUrl(options.origin);
 const payload=options.input===undefined?undefined:garageBackupWrite.parse(options.input);
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('backup_timeout'));},options.timeoutMs??15_000);});
 try{return await Promise.race([deadline,(async()=>{
  const token=await options.token();guard();if(controller.signal.aborted)throw Error('backup_timeout');
  const response=await (options.request??fetch)(url,{method:payload?'PUT':'GET',redirect:'error',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,'Accept-Language':options.locale,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
  guard();if(!response.ok)throw Error(response.status===409?'transfer_conflict':response.status===401?'session_expired':response.status===403?'email_unverified':response.status===503?'backup_disabled':'backup_request');
  const raw=await boundedBytes(response,510_000);guard();
  const parsed=responseSchema.parse(JSON.parse(new TextDecoder().decode(raw)));
  if(payload&&!parsed.backup)throw Error('backup_response');
  return parsed.backup;
 })()]);}finally{clearTimeout(timer);}
}
