import {z} from 'zod';
import {mediaProfiles} from './garage-media';

export type GarageMediaKind='vehicle'|'document';
export const garageMediaId=z.string().uuid();
export const garageMediaMetadata=z.object({id:garageMediaId,kind:z.enum(['vehicle','document']),width:z.number().int().positive().max(2400),height:z.number().int().positive().max(2400),bytes:z.number().int().positive().max(4_000_000),thumbnailBytes:z.number().int().positive().max(160_000),originalBytes:z.number().int().positive().max(20*1024*1024),mime:z.enum(['image/jpeg','image/webp']),createdAt:z.number().int().nonnegative()}).strict().superRefine((m,ctx)=>{
 const p=mediaProfiles[m.kind];if(Math.max(m.width,m.height)>p.edge||m.bytes>p.maxBytes)ctx.addIssue({code:'custom',message:'media_profile'});
});
export type GarageMediaMetadata=z.infer<typeof garageMediaMetadata>;
export type PreparedGarageMedia={metadata:GarageMediaMetadata;uri:string;thumbnailUri:string;payload:unknown;dispose:()=>void;retain?:()=>()=>void};
// A form may unmount while its queued save is copying native cache files.
export function leaseGarageMedia(item:PreparedGarageMedia):PreparedGarageMedia{
 let leases=0,requested=false,disposed=false;
 const cleanup=()=>{if(requested&&!leases&&!disposed){disposed=true;try{item.dispose();}catch{/* Best-effort temporary cache disposal cannot turn a committed save into a reported failure. */}}};
 return {...item,dispose:()=>{requested=true;cleanup();},retain:()=>{
  if(disposed)throw Error('media_disposed');leases++;let released=false;
  return ()=>{if(!released){released=true;leases--;cleanup();}};
 }};
}
export type GarageMediaView={uri:string;width:number;height:number;release:()=>void};
export interface GarageMediaStore{
 put(media:PreparedGarageMedia):Promise<void>;
 remove(id:string):Promise<void>;
 list():Promise<Array<{id:string;bytes:number;createdAt:number}>>;
 read(id:string,thumbnail:boolean):Promise<GarageMediaView|undefined>;
}
export const GARAGE_MEDIA_MAX_BYTES=250*1024*1024;
type References={vehicles:Array<{photoId?:string}>;records:Array<{attachmentIds?:string[]}>};
export function garageMediaReferences(state:References){
 const refs=new Map<string,GarageMediaKind>();
 for(const [id,kind] of [...state.vehicles.flatMap(v=>v.photoId?[[v.photoId,'vehicle'] as const]:[]),...state.records.flatMap(r=>(r.attachmentIds??[]).map(id=>[id,'document'] as const))]){
  if(refs.has(id))throw Error('media_duplicate_reference');refs.set(garageMediaId.parse(id),kind);
 }
 return refs;
}
export async function commitGarageMedia<T>(before:References,after:References,prepared:PreparedGarageMedia[],store:GarageMediaStore,commit:()=>Promise<T>){
 const old=garageMediaReferences(before),next=garageMediaReferences(after),staged:string[]=[];
 if([...next].some(([id,kind])=>old.has(id)&&old.get(id)!==kind))throw Error('media_kind');
 const additions=prepared.map(p=>garageMediaMetadata.parse(p.metadata));
 if(new Set(additions.map(m=>m.id)).size!==additions.length||additions.some(m=>old.has(m.id)||next.get(m.id)!==m.kind)||[...next.keys()].some(id=>!old.has(id)&&!additions.some(m=>m.id===id)))throw Error('media_references');
 const existing=additions.length?await store.list():[];
 if(additions.some(m=>existing.some(e=>e.id===m.id)))throw Error('media_exists');
 if(existing.reduce((n,m)=>n+m.bytes,0)+additions.reduce((n,m)=>n+m.bytes+m.thumbnailBytes,0)>GARAGE_MEDIA_MAX_BYTES)throw Error('media_capacity');
 let value:T;
 try{
  for(const item of prepared){staged.push(item.metadata.id);await store.put(item);}
  value=await commit();
 }catch(error){for(const id of staged){try{await store.remove(id);}catch{/* Safe orphan; next cleanup can retry. */}}throw error;}
 let cleanupPending=false;
 for(const id of old.keys())if(!next.has(id)){try{await store.remove(id);}catch{cleanupPending=true;}}
 return {state:value,cleanupPending};
}
export async function cleanupGarageMedia(state:References,store:GarageMediaStore,now:number){
 const refs=garageMediaReferences(state);let removed=0,pending=0;
 for(const item of await store.list())if(!refs.has(item.id)&&now-item.createdAt>=24*60*60*1000){
  garageMediaId.parse(item.id);try{await store.remove(item.id);removed++;}catch{pending++;}
 }
 return {removed,pending};
}
