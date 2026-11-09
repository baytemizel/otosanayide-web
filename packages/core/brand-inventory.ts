import {z} from 'zod';import {brandQuoteInput} from './brand-pricing';
export const brandCapacity=z.object({enabled:z.boolean(),capacity:z.number().int().min(1).max(20),version:z.number().int().positive()}).strict();
export const brandReservationInput=brandQuoteInput.extend({requestId:z.string().uuid(),capacityVersion:z.number().int().positive()}).strict();
export const brandReservationLookup=z.object({campaignId:z.string().uuid()}).strict();
export function brandDates(start:string,days:number){return Array.from({length:days},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));}
export const brandCapacityUpdate=z.object({placement:z.enum(['home_banner','category_banner']),version:z.number().int().nonnegative(),enabled:z.boolean(),capacity:z.number().int().min(1).max(20),reason:z.string().trim().min(10).max(1000)}).strict();
