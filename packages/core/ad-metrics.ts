import {z} from 'zod';
export const metricEvent=z.object({token:z.string().min(40).max(1800).regex(/^[A-Za-z0-9_-]+$/),kind:z.enum(['view','click'])}).strict();
export const metricReportQuery=z.object({campaignId:z.string().uuid()}).strict();
export function metricDates(now:number){const end=Date.parse(new Date(now+10800000).toISOString().slice(0,10)+'T00:00:00+03:00');return Array.from({length:30},(_,i)=>new Date(end+10800000-(29-i)*86400000).toISOString().slice(0,10));}
export function metricSummary(rows:{date:string;views:number;clicks:number}[]){const views=rows.reduce((n,r)=>n+r.views,0),clicks=rows.reduce((n,r)=>n+r.clicks,0);return {rows,views,clicks,ctr:views?Math.round(clicks/views*10000)/100:null};}
export type MetricReport=ReturnType<typeof metricSummary>&{enabled:boolean};
