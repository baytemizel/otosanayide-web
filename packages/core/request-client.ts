import {z} from 'zod';
import {accountJson,AccountRequestError} from './account-client';
import {searchOrigin} from './search-client';
import {requestCreate,requestAction} from './request-operations';
import {reviewIdSchema as id} from './review-policy';
export const requestStatus=z.enum(['requested','offered','confirmed','declined','cancelled','completed']);
export const requestItem=z.object({id,businessId:id,businessName:z.string().min(1).max(240),kind:z.enum(['quotes','appointments']),service:z.string().min(2).max(120),vehicle:z.string().min(2).max(120),message:z.string().min(10).max(2000),preferredDate:z.iso.date().optional(),status:requestStatus,version:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),offer:z.object({text:z.string().min(10).max(2000),price:z.number().positive().max(10000000).optional(),startsAt:z.iso.datetime({offset:true}).optional(),expiresAtMs:z.number().int().positive().max(8640000000000000)}).strict().optional(),resolution:z.string().min(10).max(1000).optional()}).strict().superRefine((r,ctx)=>{
 if(['offered','confirmed','completed'].includes(r.status)&&!r.offer)ctx.addIssue({code:'custom',message:'request_offer'});
 if(r.offer&&(r.kind==='quotes'?(r.offer.price===undefined||r.offer.startsAt!==undefined):(r.offer.startsAt===undefined||r.offer.price!==undefined)))ctx.addIssue({code:'custom',message:'request_offer_kind'});
 if(['cancelled','declined'].includes(r.status)&&!r.resolution)ctx.addIssue({code:'custom',message:'request_resolution'});
});
export type RequestItem=z.infer<typeof requestItem>;
export function parseRequestPage(raw:unknown){const page=z.object({items:z.array(requestItem).max(20),next:id.nullable()}).strict().parse(raw);if(new Set(page.items.map(r=>r.id)).size!==page.items.length||page.next!==null&&(page.items.length!==20||page.next!==page.items.at(-1)?.id))throw Error('request_page');return page;}
export const requestReceipt=z.object({id,status:requestStatus}).strict();
const actionReceipt=z.object({ok:z.literal(true)}).strict();
type Options={origin:string;token:()=>Promise<string>;guard:()=>void;locale:string;request?:typeof fetch};
export type RequestCall={type:'list';after?:string}|{type:'create';value:z.input<typeof requestCreate>}|{type:'action';value:z.input<typeof requestAction>};
export async function fetchRequests(options:Options,call:RequestCall){
 const url=new URL('/api/requests',searchOrigin(options.origin));let payload:unknown,method='GET';
 if(call.type==='list'){if(call.after)url.searchParams.set('after',id.parse(call.after));}
 else if(call.type==='create'){payload=requestCreate.parse(call.value);method='POST';}else{payload=requestAction.parse(call.value);if(!['accept','cancel'].includes((payload as z.infer<typeof requestAction>).action))throw Error('request_customer_action');method='PATCH';}
 let token='';try{return (await accountJson({guard:options.guard,token:async()=>{token=await options.token();return token;},request:signal=>(options.request??fetch)(url,{method,signal,redirect:'error',credentials:'omit',cache:'no-store',headers:{Authorization:'Bearer '+token,Accept:'application/json','Accept-Language':options.locale,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})}),decode:raw=>call.type==='list'?parseRequestPage(raw):call.type==='create'?requestReceipt.parse(raw):actionReceipt.parse(raw)})).value;}catch(error){if(error instanceof AccountRequestError&&error.status===409)throw Error('request_conflict');throw error;}
}
