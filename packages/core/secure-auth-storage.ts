export interface NativeCredentialStore {secureGet:(key:string)=>Promise<string|null>;secureSet:(key:string,value:string)=>Promise<void>;secureRemove:(key:string)=>Promise<void>}
// Firebase's RN persistence accepts this asynchronous key/value interface. Only the native port ever sees credential bytes.
export function secureAuthStorage(native:NativeCredentialStore){
 let queue=Promise.resolve();
 const key=(value:string)=>{if(typeof value!=='string'||value.length<1||value.length>512)throw Error('secure_key');return value;};
 function run<T>(action:()=>Promise<T>){const result=queue.then(action);queue=result.then(()=>{},()=>{});return result;}
 return{
  getItem:(name:string)=>run(async()=>{const value=await native.secureGet(key(name));if(value!==null&&(typeof value!=='string'||value.length>65536))throw Error('secure_value');return value;}),
  setItem:(name:string,value:string)=>run(async()=>{if(typeof value!=='string'||value.length>65536)throw Error('secure_value');await native.secureSet(key(name),value);}),
  removeItem:(name:string)=>run(()=>native.secureRemove(key(name)))
 };
}
export async function probeSecureAuthStorage(storage:ReturnType<typeof secureAuthStorage>,nonce:string){
 if(!/^[a-f0-9-]{20,64}$/i.test(nonce))throw Error('secure_probe');const key='otosanayide:probe:'+nonce;
 try{await storage.setItem(key,nonce);if(await storage.getItem(key)!==nonce)throw Error('secure_storage_unavailable');}finally{await storage.removeItem(key);}
}
