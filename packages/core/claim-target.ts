import {z} from 'zod';
import {documentId} from './claim-review';
import {businessProfileSchema,BusinessProfileInput,profileProjection} from './business-management';
const common={claimId:documentId,reason:z.string().trim().min(10).max(1000),identityChecked:z.literal(true)};
export const claimTargetSchema=z.discriminatedUnion('mode',[
 z.object({...common,mode:z.literal('existing'),businessId:documentId}).strict(),
 z.object({...common,mode:z.literal('new'),duplicateChecked:z.literal(true),profile:businessProfileSchema}).strict(),
]);
export function mayMapClaim(claim:Record<string,unknown>|undefined,reviewerId:string){return !!claim&&typeof claim.userId==='string'&&claim.userId.length>0&&claim.userId!==reviewerId&&!claim.businessId&&['submitted','needs_information'].includes(String(claim.status))&&(claim.pendingEvidenceUploads??0)===0;}
export function eligibleClaimTarget(business:Record<string,unknown>|undefined){return !!business&&business.sample!==true&&!business.ownerUid&&['unclaimed','pending'].includes(String(business.ownership));}
export function unpublishedClaimBusiness(profile:BusinessProfileInput){return {...profileProjection(profile,{}),published:false,sample:false,ownership:'unclaimed',ownerReady:false,features:{quotes:false,appointments:false},coordinateStatus:'unverified',profileVersion:0,duplicateReviewStatus:'required',source:'admin_claim_review'};}
export function businessIdentityText(profile:BusinessProfileInput){return [profile.name,profile.city,profile.district,profile.address].map(s=>s.normalize('NFKC').toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim()).join('\n');}
