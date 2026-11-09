import {z} from 'zod';

export const documentId=z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
export const claimReviewSchema=z.discriminatedUnion('decision',[
  z.object({claimId:documentId,decision:z.literal('approve'),reason:z.string().trim().min(10).max(1000),evidenceChecked:z.literal(true),verificationReference:documentId}).strict(),
  z.object({claimId:documentId,decision:z.enum(['request_information','reject']),reason:z.string().trim().min(10).max(1000)}).strict(),
]);
export type ClaimReview=z.infer<typeof claimReviewSchema>;
export class ClaimReviewConflict extends Error {}
export function matchesVerifiedEvidence(proof:Record<string,unknown>|undefined,target:{claimId:string;businessId:string|undefined;userId:string}){
  return !!proof&&!!target.businessId&&proof.status==='verified'&&proof.claimId===target.claimId&&proof.businessId===target.businessId&&proof.userId===target.userId;
}

/** Pure policy; all authoritative values must come from the transaction snapshots. */
export function decideClaim(input:ClaimReview,claim:{status:string;userId:string;businessId?:string},reviewerId:string,business?:{ownership?:string;ownerUid?:string;sample?:boolean}) {
  if(claim.userId===reviewerId)throw new ClaimReviewConflict('Kendi başvurunu değerlendiremezsin.');
  if(!['submitted','needs_information'].includes(claim.status))throw new ClaimReviewConflict('Bu başvuru daha önce sonuçlandırılmış.');
  if(input.decision==='approve'){
    if(!claim.businessId||!business)throw new ClaimReviewConflict('Önce başvuruyu mevcut bir işletme kaydına bağla.');
    if(business.sample)throw new ClaimReviewConflict('Örnek işletmeye sahiplik verilemez.');
    if(!['unclaimed','pending'].includes(business.ownership??'')||business.ownerUid)throw new ClaimReviewConflict('İşletmenin sahiplik durumu yeniden incelenmeli.');
    return 'approved' as const;
  }
  return input.decision==='reject'?'rejected' as const:'needs_information' as const;
}
