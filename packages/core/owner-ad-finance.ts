import {z} from 'zod';
import {reservationInput,campaignDates} from './ad-inventory';
import {campaignInput,campaignStatuses} from './campaigns';
import {metricSummary} from './ad-metrics';
import {accountJson} from './account-client';
import {searchOrigin} from './search-client';
const n=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),positive=n.refine(v=>v>0);
export const adFinanceQuery=reservationInput.pick({campaignId:true,businessId:true,campaignVersion:true});
export type AdFinanceQuery=z.infer<typeof adFinanceQuery>;
const price={currency:z.literal('TRY'),subtotalMinor:positive,taxMinor:n,totalMinor:positive,tariffVersion:positive,campaignVersion:positive};
export const ownerAdReservation=z.object({id:z.string().uuid(),status:z.enum(['held','expired','released','paid']),expiresAtMs:positive,...price}).strict().refine(v=>v.totalMinor===v.subtotalMinor+v.taxMinor);
export const ownerAdQuote=z.object({...price,expiresAtMs:positive,dates:z.array(campaignInput.shape.startDate).min(7).max(30)}).strict().superRefine((v,c)=>{if(v.totalMinor!==v.subtotalMinor+v.taxMinor||![7,30].includes(v.dates.length)||JSON.stringify(v.dates)!==JSON.stringify(campaignDates({startDate:v.dates[0],days:v.dates.length as 7|30})))c.addIssue({code:'custom',message:'ad_quote'});});
export const ownerAdPayment=z.object({status:z.enum(['pending','failed','paid','needs_review']),currency:z.literal('TRY'),totalMinor:positive,checkedAtMs:n.nullable()}).strict();
export const ownerAdFinance=adFinanceQuery.extend({status:z.enum(campaignStatuses),checkedAtMs:positive,reservationsEnabled:z.boolean(),checkoutEnabled:z.boolean(),quote:ownerAdQuote.nullable(),reservation:ownerAdReservation.nullable(),payment:ownerAdPayment.nullable()}).strict().superRefine((v,c)=>{if(v.checkoutEnabled&&(!v.reservationsEnabled||v.status!=='approved'))c.addIssue({code:'custom',message:'ad_checkout_flag'});if(v.quote&&(v.status!=='approved'||v.quote.campaignVersion!==v.campaignVersion)||v.reservation&&v.reservation.campaignVersion>v.campaignVersion||v.payment&&(!v.reservation||v.payment.totalMinor!==v.reservation.totalMinor))c.addIssue({code:'custom',message:'ad_finance_binding'});});
export type OwnerAdFinance=z.infer<typeof ownerAdFinance>;
export type OwnerAdQuote=z.infer<typeof ownerAdQuote>;
export const ownerAdReserveReceipt=adFinanceQuery.extend({reservation:ownerAdReservation}).strict();
const row=z.object({date:campaignInput.shape.startDate,views:n,clicks:n}).strict();
export const ownerAdMetrics=adFinanceQuery.extend({enabled:z.boolean(),rows:z.array(row).length(30),views:n,clicks:n,ctr:z.number().finite().nonnegative().nullable()}).strict().superRefine((v,c)=>{const sum=metricSummary(v.rows),dates=Array.from({length:30},(_,i)=>new Date(Date.parse(v.rows[0].date+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));if(JSON.stringify(dates)!==JSON.stringify(v.rows.map(r=>r.date))||v.views!==sum.views||v.clicks!==sum.clicks||v.ctr!==sum.ctr)c.addIssue({code:'custom',message:'ad_metrics_binding'});});
export type OwnerAdMetrics=z.infer<typeof ownerAdMetrics>;
export type OwnerAdCall={type:'finance'|'metrics';query:AdFinanceQuery}|{type:'reserve';value:z.infer<typeof reservationInput>};
export function adFinanceHttp(method:string,q:URLSearchParams,type:string|null){if(method==='GET'){for(const k of q.keys())if(!['businessId','campaignId','campaignVersion'].includes(k)||q.getAll(k).length!==1)throw Error('ad_query');const v=q.get('campaignVersion');if(!v||!/^\d+$/.test(v))throw Error('ad_query');return adFinanceQuery.parse({...Object.fromEntries(q),campaignVersion:Number(v)});}if([...q.keys()].length)throw Error('ad_query');if(!/^application\/json(?:\s*;|$)/i.test(type??''))throw Error('ad_content_type');return null;}
export async function fetchOwnerAd(o:{origin:string;locale:string;guard:()=>void;token:()=>Promise<string>;request?:typeof fetch},call:OwnerAdCall){
 const query=adFinanceQuery.parse(call.type==='reserve'?{campaignId:call.value.campaignId,businessId:call.value.businessId,campaignVersion:call.value.campaignVersion}:call.query),payload=call.type==='reserve'?reservationInput.parse(call.value):null;
 const url=new URL('/api/campaigns/'+(call.type==='metrics'?'owner-metrics':'finance'),searchOrigin(o.origin));if(!payload)for(const[k,v]of Object.entries(query))url.searchParams.set(k,String(v));
 let token='';return(await accountJson({guard:o.guard,token:async()=>{token=await o.token();return token;},request:signal=>(o.request??fetch)(url,{method:payload?'POST':'GET',signal,credentials:'omit',cache:'no-store',redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/json','Accept-Language':o.locale,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})}),decode:raw=>{
  const v=call.type==='finance'?ownerAdFinance.parse(raw):call.type==='metrics'?ownerAdMetrics.parse(raw):ownerAdReserveReceipt.parse(raw);
  if(v.campaignId!==query.campaignId||v.businessId!==query.businessId||v.campaignVersion!==query.campaignVersion)throw Error('ad_response_binding');
  if(payload&&('reservation'in v)&&(!v.reservation||v.reservation.id!==payload.requestId||v.reservation.tariffVersion!==payload.tariffVersion||v.reservation.campaignVersion!==payload.campaignVersion))throw Error('ad_reservation_binding');return v;
 }})).value;
}
