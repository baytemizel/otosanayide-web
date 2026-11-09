import {z} from 'zod';
import {reviewIdSchema} from './review-policy';
import {photoId,photoLimits} from './review-photos';
import {rasterDimensions} from './raster-header';
import {accountJson} from './account-client';
import {searchOrigin} from './search-client';

const version=z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const ownPhoto=z.object({id:photoId,status:z.enum(['uploading','pending','approved','rejected','hidden']),version,width:z.number().int().min(0).max(1600),height:z.number().int().min(0).max(1600),bytes:z.number().int().min(0).max(photoLimits.maxBytes),reason:z.string().max(2000),expiresAtMs:z.number().int().positive().nullable()}).strict();
export const ownPhotoList=z.object({reviewId:reviewIdSchema,reviewVersion:version,enabled:z.boolean(),canUpload:z.boolean(),items:z.array(ownPhoto).max(20)}).strict().superRefine((v,c)=>{if(new Set(v.items.map(p=>p.id)).size!==v.items.length)c.addIssue({code:'custom',message:'photo_duplicates'});});
export type OwnPhotoList=z.infer<typeof ownPhotoList>;
export type PreparedReviewPhoto={uri:string;bytes:Uint8Array;mime:'image/jpeg'|'image/webp';width:number;height:number;originalBytes:number;dispose:()=>void};
export function validateReviewUpload(p:Pick<PreparedReviewPhoto,'bytes'|'mime'|'width'|'height'>){
 if(!p.bytes.length||p.bytes.length>photoLimits.maxBytes)throw Error('photo_size');
 const jpeg=p.bytes[0]===255&&p.bytes[1]===216,webp=String.fromCharCode(...p.bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...p.bytes.slice(8,12))==='WEBP';
 if(p.mime==='image/jpeg'?!jpeg:p.mime==='image/webp'?!webp:true)throw Error('photo_format');
 const s=rasterDimensions(p.bytes);if(!s.width||!s.height||s.width>1600||s.height>1600||s.width!==p.width||s.height!==p.height)throw Error('photo_dimensions');
}
export function ownPhotoHttpInput(method:string,q:URLSearchParams,type:string|null){
 const keys=method==='GET'?['reviewId','version']:method==='POST'?['reviewId','version','rights']:[];
 for(const k of q.keys())if(!keys.includes(k)||q.getAll(k).length!==1)throw Error('photo_query');
 if(method!=='PATCH'){reviewIdSchema.parse(q.get('reviewId'));if(q.has('version')&&!/^[1-9]\d{0,15}$/.test(q.get('version')!))throw Error('photo_query');if(q.has('version'))version.parse(Number(q.get('version')));}
 if(method==='POST'&&(q.get('rights')!=='yes'||!['image/jpeg','image/png','image/webp'].includes(type??'')))throw Error('photo_content_type');
 if(method==='PATCH'&&!/^application\/json(?:\s*;|$)/i.test(type??''))throw Error('photo_content_type');
}
type Call={type:'list'}|{type:'upload';photo:PreparedReviewPhoto;rights:true}|{type:'withdraw';id:string;version:number};
export async function fetchOwnReviewPhotos(o:{origin:string;reviewId:string;reviewVersion:number;guard:()=>void;token:()=>Promise<string>;locale:string;request?:typeof fetch},call:Call){
 const url=new URL('/api/review-photos',searchOrigin(o.origin));reviewIdSchema.parse(o.reviewId);version.parse(o.reviewVersion);
 let method='GET',body:BodyInit|undefined,mime='';
 if(call.type==='withdraw'){method='PATCH';mime='application/json';body=JSON.stringify({id:photoId.parse(call.id),version:version.parse(call.version)});}
 else{url.searchParams.set('reviewId',o.reviewId);url.searchParams.set('version',String(o.reviewVersion));if(call.type==='upload'){if(call.rights!==true)throw Error('photo_rights');validateReviewUpload(call.photo);url.searchParams.set('rights','yes');method='POST';mime=call.photo.mime;body=new Uint8Array(call.photo.bytes).buffer;}}
 let token='';return (await accountJson({guard:o.guard,token:async()=>{token=await o.token();return token;},timeoutMs:call.type==='upload'?65000:15000,request:signal=>(o.request??fetch)(url,{method,body,signal,credentials:'omit',redirect:'error',cache:'no-store',headers:{Authorization:'Bearer '+token,Accept:'application/json','Accept-Language':o.locale,...(mime?{'Content-Type':mime}:{})}}),decode:v=>{
 if(call.type==='list'){const r=ownPhotoList.parse(v);if(r.reviewId!==o.reviewId||r.reviewVersion!==o.reviewVersion)throw Error('photo_conflict');return r;}
 if(call.type==='upload')return z.object({id:photoId,status:z.literal('pending')}).strict().parse(v);
 return z.object({ok:z.literal(true)}).strict().parse(v);
 }})).value;
}
