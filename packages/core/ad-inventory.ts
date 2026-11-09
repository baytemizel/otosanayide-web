import {z} from 'zod';
import {campaignInput,type CampaignRecord} from './campaigns';
export const adMarketSchema=campaignInput.pick({placement:true,city:true,category:true});
const money=z.number().int().min(1).max(100_000_000);
export const adTariffSchema=z.object({...adMarketSchema.shape,enabled:z.boolean(),capacity:z.number().int().min(1).max(20),sevenDaysMinor:money,thirtyDaysMinor:money,taxBasisPoints:z.number().int().min(0).max(10000)}).strict();
export type AdTariff=z.infer<typeof adTariffSchema>&{version:number};
export const tariffUpdateSchema=z.object({version:z.number().int().nonnegative(),value:adTariffSchema,reason:z.string().trim().min(10).max(1000)}).strict();
export const reservationInput=z.object({campaignId:z.string().uuid(),businessId:z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),campaignVersion:z.number().int().positive(),tariffVersion:z.number().int().positive(),requestId:z.string().uuid()}).strict();
export type ReservationInput=z.infer<typeof reservationInput>;
export function campaignDates(c:Pick<CampaignRecord,'startDate'|'days'>){const start=Date.parse(c.startDate+'T00:00:00+03:00');return Array.from({length:c.days},(_,i)=>new Date(start+3*3600000+i*86400000).toISOString().slice(0,10));}
export function adPrice(c:CampaignRecord,t:AdTariff,now:number){
 adTariffSchema.parse(Object.fromEntries(Object.keys(adTariffSchema.shape).map(k=>[k,t[k as keyof AdTariff]])));
 if(!t.enabled||c.placement!==t.placement||c.city!==t.city||c.category!==t.category||!Number.isSafeInteger(t.version)||t.version<1)throw Error('tariff');
 const start=Date.parse(c.startDate+'T00:00:00+03:00');if(start<=now||start>now+180*86400000)throw Error('schedule');
 const subtotalMinor=c.days===7?t.sevenDaysMinor:t.thirtyDaysMinor;
 const taxMinor=Math.round(subtotalMinor*t.taxBasisPoints/10000);
 return {currency:'TRY' as const,subtotalMinor,taxMinor,totalMinor:subtotalMinor+taxMinor,tariffVersion:t.version,campaignVersion:c.version,dates:campaignDates(c),expiresAtMs:Math.min(now+15*60000,start)};
}
export type SlotHold={reservationId:string;expiresAtMs:number};
export function availableHolds(raw:unknown,now:number):SlotHold[]{
 if(raw===undefined)return [];if(!Array.isArray(raw)||raw.length>20)throw Error('inventory');
 return raw.map(v=>z.object({reservationId:z.string().uuid(),expiresAtMs:z.number().int().positive()}).strict().parse(v)).filter(v=>v.expiresAtMs>now);
}
export function allocateDay(raw:unknown,capacity:number,reservationId:string,expiresAtMs:number,now:number){
 const holds=availableHolds(raw,now);if(holds.some(v=>v.reservationId===reservationId))return holds;
 if(holds.length>=capacity)throw Error('capacity');return [...holds,{reservationId,expiresAtMs}];
}
