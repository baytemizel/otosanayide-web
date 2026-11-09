import {z} from 'zod';import {documentId} from './claim-review';import {searchOrigin} from './search-client';import {accountJson} from './account-client';
export const businessPlaceQuery=z.object({businessId:documentId,query:z.string().trim().min(3).max(200),locale:z.enum(['tr','en'])}).strict();
export const businessPlace=z.object({id:z.string().min(1).max(300),name:z.string().max(300),address:z.string().min(5).max(500),latitude:z.number().finite().min(35.7).max(42.3),longitude:z.number().finite().min(25.5).max(45)}).strict();
export type BusinessPlace=z.infer<typeof businessPlace>;
export const businessPlaceResult=z.object({places:z.array(businessPlace).max(5),source:z.literal('google_places'),verification:z.literal('candidate')}).strict();
export async function searchBusinessPlaces(options:{origin:string;locale:'tr'|'en';token:()=>Promise<string>;guard:()=>void;request?:typeof fetch;timeoutMs?:number},businessId:string,query:string){
 const value=businessPlaceQuery.parse({businessId,query,locale:options.locale}),url=searchOrigin(options.origin)+'/api/businesses/places';let token='';
 return(await accountJson({guard:options.guard,timeoutMs:options.timeoutMs??10000,token:async()=>{token=await options.token();return token;},request:async signal=>{const response=await(options.request??fetch)(url,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal,headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+token,'Accept-Language':options.locale},body:JSON.stringify(value)});if(response.ok&&!response.headers.get('content-type')?.includes('application/json'))throw Error('places_unavailable');return response;},decode:raw=>businessPlaceResult.parse(raw)})).value;
}
