import {z} from 'zod';import {cities,categories} from './index';import {brandCreative,type BrandRecord} from './brand-campaigns';
export const brandMarket=z.object({placement:z.enum(['home_banner','category_banner']),city:z.string().refine(v=>v===''||cities.includes(v)),category:z.string().refine(v=>v===''||categories.some(c=>c.id===v))}).strict().refine(v=>v.placement!=='category_banner'||!!v.category);
export type BrandMarket=z.infer<typeof brandMarket>;
export const brandTariff=z.object({market:brandMarket,enabled:z.boolean(),dailyMinor:z.number().int().min(1).max(100_000_000),taxBasisPoints:z.number().int().min(0).max(10000)}).strict();
export const brandTariffUpdate=z.object({version:z.number().int().min(0).max(1_000_000_000),value:brandTariff,reason:z.string().trim().min(10).max(1000)}).strict();
export const brandQuoteInput=z.object({campaignId:z.string().uuid(),campaignVersion:z.number().int().positive(),tariffVersion:z.number().int().positive()}).strict();
export type BrandTariff=z.infer<typeof brandTariff>&{version:number};
export function brandMarketKey(input:BrandMarket){const m=brandMarket.parse(input);return JSON.stringify([m.placement,m.city,m.category]);}
export function brandTariffView(raw:Record<string,unknown>):BrandTariff{return {...brandTariff.parse({market:raw.market,enabled:raw.enabled,dailyMinor:raw.dailyMinor,taxBasisPoints:raw.taxBasisPoints}),version:z.number().int().positive().parse(raw.version)};}
export function brandPrice(campaign:BrandRecord,tariff:BrandTariff,input:z.infer<typeof brandQuoteInput>,now:number){
 brandQuoteInput.parse(input);const c=brandCreative.parse(campaign.creative),t=brandTariffView(tariff);
 if(!Number.isSafeInteger(now)||now<0||!Number.isSafeInteger(campaign.version)||campaign.version<1||campaign.version!==input.campaignVersion||t.version!==input.tariffVersion)throw Error('version');
 if(!['draft','pending','approved','rejected','paused'].includes(campaign.status)||!t.enabled||brandMarketKey({placement:c.placement,city:c.city,category:c.category})!==brandMarketKey(t.market))throw Error('market');
 const start=Date.parse(c.startDate+'T00:00:00+03:00');if(start<=now||start>now+180*86400000)throw Error('date');
 const days=(Date.parse(c.endDate+'T00:00:00Z')-Date.parse(c.startDate+'T00:00:00Z'))/86400000+1;
 const subtotalMinor=t.dailyMinor*days,taxMinor=Math.round(subtotalMinor*t.taxBasisPoints/10000),totalMinor=subtotalMinor+taxMinor;
 if(![subtotalMinor,taxMinor,totalMinor].every(Number.isSafeInteger))throw Error('amount');
 return {kind:'estimate' as const,campaignId:input.campaignId,campaignVersion:campaign.version,tariffVersion:t.version,market:t.market,startDate:c.startDate,endDate:c.endDate,days,currency:'TRY' as const,dailyMinor:t.dailyMinor,taxBasisPoints:t.taxBasisPoints,subtotalMinor,taxMinor,totalMinor,createdAtMs:now,expiresAtMs:Math.min(now+15*60000,start),reservation:false as const,payable:false as const};
}
