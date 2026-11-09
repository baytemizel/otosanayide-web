import {z} from 'zod';import {requestSchema} from './index';import {reviewIdSchema} from './review-policy';
export const requestCreate=requestSchema.extend({businessId:reviewIdSchema,requestKey:z.uuid()}).strict();
export const requestAction=z.discriminatedUnion('action',[
 z.object({id:reviewIdSchema,version:z.number().int().positive(),action:z.literal('offer'),text:z.string().trim().min(10).max(2000),price:z.number().positive().max(10000000).optional(),startsAt:z.iso.datetime({offset:true}).optional()}).strict(),
 z.object({id:reviewIdSchema,version:z.number().int().positive(),action:z.enum(['accept','cancel','decline','complete']),text:z.string().trim().min(10).max(1000).optional()}).strict()
]);
export type RequestAction=z.infer<typeof requestAction>;
export function requestTransition(r:Record<string,any>,a:RequestAction,role:'customer'|'business',now:number){
 if((r.version??1)!==a.version)throw Error('Talep değişti. Listeyi yenile.');
 if(a.action==='offer'&&role==='business'&&['requested','offered'].includes(r.status)){
  if(r.kind==='quotes'&&(a.price===undefined||a.startsAt))throw Error('Teklif için fiyat gerekli; randevu saati eklenemez.');
  if(r.kind==='appointments'&&(!a.startsAt||a.price!==undefined))throw Error('Randevu için saat gerekli; fiyat ayrı teklifte belirtilir.');
  const start=a.startsAt?Date.parse(a.startsAt):undefined;
  if(start!==undefined&&(start<=now||start>now+90*86400000||start%3600000!==0))throw Error('Randevu gelecek 90 gün içinde tam saatte olmalı.');
  return {status:'offered',version:a.version+1,offer:{text:a.text,...(a.price===undefined?{}:{price:a.price}),...(start===undefined?{}:{startsAt:new Date(start).toISOString()}),expiresAtMs:Math.min(now+7*86400000,start??Infinity)}};
 }
 if(a.action==='accept'&&role==='customer'&&r.status==='offered'){
  if(!r.offer||r.offer.expiresAtMs<=now)throw Error('Önerinin süresi doldu; işletmeden yeni yanıt bekle.');
  return {status:'confirmed',version:a.version+1};
 }
 if(a.action==='cancel'&&['requested','offered','confirmed'].includes(r.status)||a.action==='decline'&&role==='business'&&['requested','offered'].includes(r.status)){
  if(!a.text)throw Error('İptal veya ret gerekçesi gerekli.');return {status:a.action==='cancel'?'cancelled':'declined',version:a.version+1,resolution:a.text};
 }
 if(a.action==='complete'&&role==='business'&&r.status==='confirmed'){
  if(r.kind==='appointments'&&Date.parse(r.offer?.startsAt)>now)throw Error('Randevu saati gelmeden tamamlanamaz.');return {status:'completed',version:a.version+1};
 }
 throw Error('Bu talep için işlem kullanılamıyor.');
}
export function requestView(id:string,r:Record<string,unknown>){return {id,...Object.fromEntries(['businessId','businessName','kind','service','vehicle','message','preferredDate','status','offer','resolution'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]])),version:r.version??1};}
export function requestMember(uid:string,m:Record<string,unknown>|undefined){return !!m&&m.userId===uid&&m.active===true&&['owner','staff'].includes(String(m.role));}
export function slotAvailable(existing:Record<string,unknown>|undefined,id:string){return !existing||existing.requestId===id;}
export function turkeyAppointmentTime(value:string){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::00(?:\.000)?)?$/.test(value))throw Error('Geçerli bir tarih ve saat gir.');return `${value.slice(0,16)}:00+03:00`;}
