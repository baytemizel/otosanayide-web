import {z} from 'zod';
export const privacyUid=z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const privacyScope=z.enum(['garage','account']);
export const privacyState=z.enum(['submitted','reviewing','needs_confirmation','cancelled']);
export const privacyReason=z.enum(['scope_confirmation','linked_business','billing_records']);
const version=z.number().int().min(1).max(1_000_000_000),time=z.number().int().min(0).max(8_640_000_000_000_000),uuid=z.string().uuid();
const requestBase=z.object({id:uuid,ownerUid:privacyUid,scope:privacyScope,status:privacyState,version,createdAtMs:time,updatedAtMs:time,reason:privacyReason.nullable(),lastAction:z.object({operationId:uuid,action:z.enum(['submit','cancel','confirm','start_review','request_confirmation']),expectedVersion:z.number().int().min(0),actorUid:privacyUid}).strict()}).strict();
export const privacyRequest=requestBase.superRefine((v,c)=>{if(v.updatedAtMs<v.createdAtMs||(v.status==='needs_confirmation')!==(v.reason!==null))c.addIssue({code:'custom',message:'Invalid request state.'});});
export const privacySubmit=z.object({action:z.literal('submit'),operationId:uuid,scope:privacyScope,acknowledged:z.literal(true),confirmedScope:z.literal(true)}).strict();
const existing={requestId:uuid,expectedVersion:version,operationId:uuid};
export const privacyOwnerAction=z.union([privacySubmit,z.object({...existing,action:z.literal('cancel')}).strict(),z.object({...existing,action:z.literal('confirm'),acknowledged:z.literal(true),confirmedScope:z.literal(true)}).strict()]);
export const privacyAdminAction=z.union([z.object({...existing,ownerUid:privacyUid,action:z.literal('start_review')}).strict(),z.object({...existing,ownerUid:privacyUid,action:z.literal('request_confirmation'),reason:privacyReason}).strict()]);
export type PrivacyRequest=z.infer<typeof privacyRequest>;
export const privacyOwnView=requestBase.omit({ownerUid:true,lastAction:true}).superRefine((v,c)=>{if(v.updatedAtMs<v.createdAtMs||(v.status==='needs_confirmation')!==(v.reason!==null))c.addIssue({code:'custom',message:'Invalid request state.'});});
export const privacyOwnerResponse=z.object({request:privacyOwnView.nullable(),execution:z.literal('not_enabled')}).strict();
export const privacyCursor=z.object({createdAtMs:time,ownerUid:privacyUid,requestId:uuid}).strict();
export const privacyQueueResponse=z.object({items:z.array(privacyOwnView.safeExtend({ownerUid:privacyUid})).max(20),next:privacyCursor.nullable(),execution:z.literal('not_enabled')}).strict();
export type PrivacyOwnRequest=z.infer<typeof privacyOwnView>;
export const privacyLabels={submitted:'Talep alındı',reviewing:'İnceleniyor',needs_confirmation:'Kapsam onayı bekleniyor',cancelled:'Talep iptal edildi'} as const;
export const privacyScopeLabels={garage:'Hesaptaki garaj verileri',account:'Hesap ve ilişkili veriler'} as const;
export const privacyReasonLabels={scope_confirmation:'Silme kapsamını tekrar onaylaman gerekiyor.',linked_business:'İşletme sahipliği ve yetkileri ayrıca inceleniyor. Kapsamı tekrar onayla.',billing_records:'Reklam ve ödeme kayıtlarının saklama kapsamı ayrıca inceleniyor. Kapsamı tekrar onayla.'} as const;
export function ownPrivacyView(value:PrivacyRequest|null){if(value===null)return null;const {ownerUid:_,lastAction:__,...view}=privacyRequest.parse(value);return privacyOwnView.parse(view);}
export function privacyRecentLogin(authTime:unknown,nowMs:number){return typeof authTime==='number'&&Number.isInteger(authTime)&&authTime*1000<=nowMs+30_000&&authTime*1000>=nowMs-10*60_000;}
export function planPrivacySubmit(previous:PrivacyRequest|null,ownerUid:string,raw:unknown,nowMs:number){
 const input=privacySubmit.parse(raw);privacyUid.parse(ownerUid);time.parse(nowMs);
 if(previous){const before=privacyRequest.parse(previous);if(before.ownerUid!==ownerUid)throw Error('privacy_owner');if(before.id===input.operationId){if(before.scope!==input.scope||before.lastAction.action!=='submit'||before.version!==1)throw Error('privacy_conflict');return {request:before,changed:false};}if(before.status!=='cancelled')throw Error('privacy_active');if(nowMs<before.updatedAtMs)throw Error('privacy_clock');}
 return {request:privacyRequest.parse({id:input.operationId,ownerUid,scope:input.scope,status:'submitted',version:1,createdAtMs:nowMs,updatedAtMs:nowMs,reason:null,lastAction:{operationId:input.operationId,action:'submit',expectedVersion:0,actorUid:ownerUid}}),changed:true};
}
export function planPrivacyAction(before:PrivacyRequest,raw:unknown,actorUid:string,admin:boolean,nowMs:number){
 const previous=privacyRequest.parse(before),input=admin?privacyAdminAction.parse(raw):privacyOwnerAction.parse(raw);privacyUid.parse(actorUid);time.parse(nowMs);
 if(input.action==='submit')throw Error('privacy_conflict');
 if(previous.id!==input.requestId||(!admin&&previous.ownerUid!==actorUid)||('ownerUid'in input&&previous.ownerUid!==input.ownerUid))throw Error('privacy_owner');
 if(previous.lastAction.operationId===input.operationId){if(previous.lastAction.action===input.action&&previous.lastAction.actorUid===actorUid&&previous.lastAction.expectedVersion===input.expectedVersion&&previous.version===input.expectedVersion+1&&(!('reason'in input)||input.reason===previous.reason))return {request:previous,changed:false};throw Error('privacy_conflict');}
 if(previous.version!==input.expectedVersion||nowMs<previous.updatedAtMs)throw Error('privacy_conflict');
 const status=input.action==='cancel'&&previous.status!=='cancelled'?'cancelled':input.action==='confirm'&&previous.status==='needs_confirmation'?'submitted':input.action==='start_review'&&previous.status==='submitted'?'reviewing':input.action==='request_confirmation'&&previous.status==='reviewing'?'needs_confirmation':null;
 if(!status)throw Error('privacy_conflict');
 return {request:privacyRequest.parse({...previous,status,reason:input.action==='request_confirmation'?input.reason:null,version:previous.version+1,updatedAtMs:nowMs,lastAction:{operationId:input.operationId,action:input.action,expectedVersion:input.expectedVersion,actorUid}}),changed:true};
}
