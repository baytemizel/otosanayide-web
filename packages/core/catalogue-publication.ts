import {businessContactEmail} from './contact';import {z} from 'zod';import {businessProfileSchema} from './business-management';import {documentId} from './claim-review';
const proof=z.object({checked:z.literal(true),reference:z.string().trim().min(10).max(800)}).strict();
const base={businessId:documentId,version:z.number().int().nonnegative(),profileVersion:z.number().int().nonnegative(),reason:z.string().trim().min(10).max(1000)};
export const publicationAction=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('publish'),checks:z.object({rights:proof,identity:proof,location:proof,duplicates:proof}).strict()}).strict(),
 z.object({...base,action:z.literal('withdraw')}).strict()
]);
export type PublicationAction=z.infer<typeof publicationAction>;
export function publicationTransition(b:Record<string,unknown>,a:PublicationAction,actor:{uid:string;admin:boolean;affiliated:boolean}){
 if(!actor.admin||actor.affiliated||b.ownerUid===actor.uid)throw Error('forbidden');
 if((b.publicationVersion??0)!==a.version||(b.profileVersion??0)!==a.profileVersion)throw Error('stale');
 if(b.sample===true)throw Error('sample');
 if(a.action==='withdraw'){
  if(b.published!==true)throw Error('stale');
  return {published:false,publicationVersion:a.version+1,ownerReady:false,features:{quotes:false,appointments:false},activationVersion:Number(b.activationVersion??0)+1};
 }
 if(b.published===true)throw Error('stale');
 const profile=businessProfileSchema.parse({name:b.name,city:b.city,district:b.district,address:b.address,phone:b.phone??'',website:b.website??'',...(b.contactEmail!==undefined?{contactEmail:b.contactEmail}:{}),hours:b.hours??'',description:b.description??'',categories:b.categories,services:b.services,brands:b.brands,location:{latitude:b.latitude,longitude:b.longitude}});
 if(!profile.location||profile.location.latitude<35.7||profile.location.latitude>42.3||profile.location.longitude<25.5||profile.location.longitude>45)throw Error('location');
 return {published:true,coordinateStatus:'verified',publicationVersion:a.version+1,ownerReady:false,features:{quotes:false,appointments:false},activationVersion:Number(b.activationVersion??0)+1};
}
// Explicit public projection: no raw source, proof, owner identity or review notes.
export function publicCatalogueProjection(id:string,b:Record<string,unknown>){
 if(b.published!==true||b.sample===true)return null;
 const email=businessContactEmail(b.contactEmail);
 return {id,...(email?{contactEmail:email.address}:{}),name:b.name,city:b.city,district:b.district,address:b.address,categories:b.categories,services:b.services,brands:b.brands,phone:b.phone??null,website:b.website??null,latitude:b.coordinateStatus==='verified'?b.latitude:null,longitude:b.coordinateStatus==='verified'?b.longitude:null,coordinateStatus:b.coordinateStatus==='verified'?'verified':'unverified',ownership:b.ownership==='verified'?'verified':'unclaimed',published:true,ownerReady:b.ownerReady===true,features:{quotes:(b.features as Record<string,unknown>)?.quotes===true,appointments:(b.features as Record<string,unknown>)?.appointments===true}};
}
