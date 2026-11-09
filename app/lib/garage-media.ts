import {rasterDimensions} from '@otosanayide/core/raster-header';
import {fittedSize,mediaProfiles} from '@otosanayide/core/garage-media';
export type LocalMedia={id:string;full:Blob;thumbnail:Blob;originalBytes:number;width:number;height:number};
async function database(){return new Promise<IDBDatabase>((resolve,reject)=>{
 let settled=false;const request=indexedDB.open('otosanayide-private-media',2),timer=setTimeout(()=>fail(),8000);
 function fail(){if(settled)return;settled=true;clearTimeout(timer);reject(Error('Fotoğraf deposu açılamadı.'));}
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('photos'))request.result.createObjectStore('photos',{keyPath:'id'});if(!request.result.objectStoreNames.contains('thumbnails'))request.result.createObjectStore('thumbnails');};
 request.onsuccess=()=>{if(settled){request.result.close();return;}settled=true;clearTimeout(timer);request.result.onversionchange=()=>request.result.close();resolve(request.result);};request.onerror=fail;request.onblocked=fail;
});}
async function mediaTransaction<T>(stores:string[],mode:IDBTransactionMode,run:(tx:IDBTransaction,done:(value:T)=>void)=>void):Promise<T>{
 const db=await database();try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction(stores,mode);let value:T;let failed:Error|undefined;
  tx.oncomplete=()=>failed?reject(failed):resolve(value);tx.onabort=()=>reject(failed??Error(mode==='readonly'?'Fotoğraf okunamadı.':'Fotoğraf kaydı iptal edildi.'));tx.onerror=()=>{failed??=Error(mode==='readonly'?'Fotoğraf okunamadı.':'Fotoğraf saklanamadı. Tarayıcı alanını kontrol et.');};
  try{run(tx,v=>{value=v;});}catch{failed=Error(mode==='readonly'?'Fotoğraf okunamadı.':'Fotoğraf saklanamadı. Tarayıcı alanını kontrol et.');try{tx.abort();}catch{reject(failed);}}
 });}finally{db.close();}
}
export function mediaRead(id:string):Promise<LocalMedia|undefined>{return mediaTransaction(['photos'],'readonly',(tx,done)=>{const r=tx.objectStore('photos').get(id);r.onsuccess=()=>done(r.result);});}
export function mediaWrite(value:LocalMedia){return mediaTransaction<void>(['photos','thumbnails'],'readwrite',tx=>{tx.objectStore('photos').put(value);tx.objectStore('thumbnails').put(value.thumbnail,value.id);});}
export function mediaDelete(id:string){return mediaTransaction<void>(['photos','thumbnails'],'readwrite',tx=>{tx.objectStore('photos').delete(id);tx.objectStore('thumbnails').delete(id);});}
function encode(canvas:HTMLCanvasElement,quality:number){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Fotoğraf dönüştürülemedi.')),'image/webp',quality));}
export async function optimizePhoto(file:File,kind:keyof typeof mediaProfiles):Promise<LocalMedia>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024||!file.size)throw Error('En fazla 20 MB JPEG, PNG veya WebP seç. HEIC fotoğrafını önce JPEG olarak dışa aktar.');
 const dimensions=rasterDimensions(new Uint8Array(await file.slice(0,1_048_576).arrayBuffer()));fittedSize(dimensions.width,dimensions.height,2400);
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'}).catch(()=>{throw Error('Fotoğraf okunamadı. Başka bir JPEG veya PNG dene.');});
 try{const profile=mediaProfiles[kind];const size=fittedSize(bitmap.width,bitmap.height,profile.edge);const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Görsel işleme desteklenmiyor.');ctx.fillStyle='#fff';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(bitmap,0,0,size.width,size.height);const full=await encode(canvas,profile.quality);if(full.size>profile.maxBytes)throw Error('Okunabilir kaliteyle dosya sınırına inilemedi. Belgeyi daha yakından, sayfa sayfa çek.');const thumb=fittedSize(size.width,size.height,320);const mini=document.createElement('canvas');mini.width=thumb.width;mini.height=thumb.height;mini.getContext('2d')!.drawImage(canvas,0,0,thumb.width,thumb.height);return {id:crypto.randomUUID(),full,thumbnail:await encode(mini,.8),originalBytes:file.size,...size};}finally{bitmap.close();}
}

export function mediaThumbnail(id:string):Promise<Blob|undefined>{return mediaTransaction(['thumbnails'],'readonly',(tx,done)=>{const r=tx.objectStore('thumbnails').get(id);r.onsuccess=()=>done(r.result);});}
