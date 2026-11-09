import {z} from 'zod';import {reminderSchema} from './index';import {decodeGarage,GARAGE_KEY,type GarageSnapshot,type GarageStorage} from './local-garage';
export const LOCAL_REMINDERS_KEY='otosanayide-local-reminders-v1';
const id=z.string().regex(/^[A-Za-z0-9_-]{1,160}$/);
export const localReminder=reminderSchema.safeExtend({id,vehicleId:id,source:z.enum(['manual','inspection']),channels:z.array(z.literal('push')).max(1).default([])});
export type LocalReminder=z.infer<typeof localReminder>;
const state=z.object({schema:z.literal(1),revision:z.number().int().nonnegative().max(1_000_000_000),items:z.array(localReminder).max(200)}).strict().refine(v=>new Set(v.items.map(r=>r.id)).size===v.items.length);
export type LocalReminders=z.infer<typeof state>;
export function decodeLocalReminders(raw:string|null):LocalReminders{if(raw===null)return{schema:1,revision:0,items:[]};if(raw.length>300000)throw Error('reminder_size');return state.parse(JSON.parse(raw));}
export function visibleLocalReminders(garage:GarageSnapshot,items:LocalReminder[]){
 const current=items.filter(r=>{const v=garage.vehicles.find(v=>v.id===r.vehicleId);return v&&!v.archived&&(r.source!=='inspection'||r.dueDate===v.inspectionDueDate);});
 for(const v of garage.vehicles)if(!v.archived&&v.inspectionDueDate){const key='inspection_'+v.id+'_'+v.inspectionDueDate;if(!current.some(r=>r.id===key))current.push(localReminder.parse({id:key,vehicleId:v.id,source:'inspection',title:'Araç muayenesi',dueDate:v.inspectionDueDate,advanceDays:7,channels:[]}));}
 return current.sort((a,b)=>Number(!!a.completed)-Number(!!b.completed)||(a.dueDate??'9999').localeCompare(b.dueDate??'9999')||a.id.localeCompare(b.id));
}
export const localNotification=z.object({id:z.string().regex(/^[A-Za-z0-9_-]{1,220}$/),fireAtMs:z.number().int().positive().safe(),title:z.string().max(100),body:z.string().max(250)}).strict();
export type LocalNotification=z.infer<typeof localNotification>;
export function localNotificationPlan(garage:GarageSnapshot,items:LocalReminder[],locale:'tr'|'en',now=Date.now()){
 const result:LocalNotification[]=[],body=locale==='en'?'Check your vehicle maintenance or inspection reminder.':'Araç bakım veya muayene hatırlatmanı kontrol et.';
 for(const r of visibleLocalReminders(garage,items)){if(r.completed||!r.channels.includes('push'))continue;const v=garage.vehicles.find(v=>v.id===r.vehicleId)!;
  if(r.dueDate){const due=Date.parse(r.dueDate+'T09:00:00+03:00'),advance=due-(r.advanceDays??0)*86400000;for(const [phase,at]of [['advance',advance],['due',due]] as const){if(phase==='advance'&&advance===due||at<=now)continue;result.push(localNotification.parse({id:r.id+'_'+phase+'_'+r.dueDate+'_'+(r.advanceDays??0),fireAtMs:at,title:'Otosanayide',body}));}}
  if(r.dueKm!==undefined&&v.mileage>=r.dueKm)result.push(localNotification.parse({id:r.id+'_km_'+r.dueKm,fireAtMs:now+5000,title:'Otosanayide',body}));
 }
 if(result.length>60)throw Error('notification_capacity');return result.sort((a,b)=>a.fireAtMs-b.fireAtMs||a.id.localeCompare(b.id));
}
export function createLocalReminderRepository(storage:GarageStorage){let loaded=false,queue:Promise<unknown>=Promise.resolve();const listeners=new Set<(v:LocalReminders)=>void>();
 function emit(v:LocalReminders){for(const fn of listeners)try{fn(JSON.parse(JSON.stringify(v)));}catch{/* A UI observer cannot roll back a committed reminder. */}}
 function run<T>(fn:()=>Promise<T>){const result=queue.then(()=>storage.exclusive?storage.exclusive(fn):fn());queue=result.catch(()=>{});return result;}
 function change(fn:(s:LocalReminders,g:GarageSnapshot)=>LocalReminder[]){return run(async()=>{if(!loaded)throw Error('reminders_not_loaded');const current=decodeLocalReminders(await storage.getItem(LOCAL_REMINDERS_KEY)),garage=decodeGarage(await storage.getItem(GARAGE_KEY)),next=state.parse({...current,revision:current.revision+1,items:fn(current,garage)});await storage.setItem(LOCAL_REMINDERS_KEY,JSON.stringify(next));emit(next);return next;});}
 return{subscribe:(fn:(v:LocalReminders)=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},load:()=>run(async()=>{loaded=false;const s=decodeLocalReminders(await storage.getItem(LOCAL_REMINDERS_KEY));loaded=true;return s;}),save:(raw:unknown)=>change((s,g)=>{const r=localReminder.parse(raw),v=g.vehicles.find(v=>v.id===r.vehicleId),old=s.items.find(i=>i.id===r.id);if(!v||v.archived||old&&old.vehicleId!==r.vehicleId||r.source==='inspection'&&(r.dueDate!==v.inspectionDueDate||r.id!=='inspection_'+v.id+'_'+v.inspectionDueDate))throw Error('reminder_vehicle_changed');return old?s.items.map(i=>i.id===r.id?r:i):[...s.items,r];}),remove:(key:string)=>change(s=>{id.parse(key);return s.items.filter(r=>r.id!==key);})};
}
