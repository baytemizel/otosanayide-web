import {z} from 'zod';
import {brandPublicContext,brandPublicItem} from './brand-publication';
import {boundedBytes} from './bounded-body';

const responseSchema=z.object({items:z.array(brandPublicItem).max(3)}).strict().refine(v=>new Set(v.items.map(i=>i.key)).size===v.items.length);
export async function loadBrandBanner(raw:unknown,getToken:()=>Promise<string>,transport:typeof fetch=fetch,signal?:AbortSignal,clock=Date.now){
 const context=brandPublicContext.parse(raw),token=await getToken();
 signal?.throwIfAborted();
 if(!token||token.length>8192)throw Error('App Check unavailable');
 const headers={'X-Firebase-AppCheck':token};
 const response=await transport('/api/brand-banners?'+new URLSearchParams(context),{headers,signal,cache:'no-store',redirect:'error'});
 if(!response.ok){await response.body?.cancel();return null;}
 const bytes=await boundedBytes(response,32000),data=responseSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
 for(const item of data.items){
  const image=item.image;
  if(item.placement!==context.placement||!image.url||!image.expiresAtMs||image.expiresAtMs<=clock()||image.expiresAtMs>clock()+120000)continue;
  try{
   const file=await transport(image.url,{headers,signal,cache:'no-store',redirect:'error'});
   if(!file.ok||file.headers.get('content-type')!=='image/webp'){await file.body?.cancel();continue;}
   const imageBytes=await boundedBytes(file,2500000);signal?.throwIfAborted();
   if(!imageBytes.length||image.expiresAtMs<=clock())continue;
   return {item,blob:new Blob([new Uint8Array(imageBytes)],{type:'image/webp'})};
  }catch(e){if(signal?.aborted)throw e;}
 }
 return null;
}
