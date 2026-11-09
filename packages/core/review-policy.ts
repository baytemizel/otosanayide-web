import {photoIds} from './review-photos';
import {publicReply} from './review-replies';
import {z} from 'zod';

export const reviewIdSchema=z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
export const reviewDecisionSchema=z.object({id:reviewIdSchema,version:z.number().int().positive(),decision:z.enum(['approve','reject','hide']),reason:z.string().trim().min(10).max(1000),contentReviewed:z.boolean().optional()}).strict();
export function affiliatedReviewer(uid:string,business:Record<string,unknown>,membership?:Record<string,unknown>){
  return business.ownerUid===uid || !!(membership?.active===true&&membership.userId===uid&&['owner','staff'].includes(String(membership.role)));
}
export function reviewTransition(status:unknown,decision:'approve'|'reject'|'hide'){
  if(status==='pending'&&decision==='approve')return {status:'approved',delta:1};
  if(status==='pending'&&decision==='reject')return {status:'rejected',delta:0};
  if(status==='approved'&&decision==='hide')return {status:'hidden',delta:-1};
  throw new Error('Bu yorumun durumu değişti. Listeyi yenile.');
}
export function reviewTotals(count:unknown,sum:unknown,rating:number,delta:number){
  const c=count??0,s=sum??0;
  if(!Number.isInteger(c)||!Number.isInteger(s)||Number(c)<0||Number(s)<Number(c)||Number(s)>Number(c)*5||!Number.isInteger(rating)||rating<1||rating>5)throw new Error('Yorum sayaçları tutarsız.');
  const nextCount=Number(c)+delta,nextSum=Number(s)+rating*delta;
  if(nextCount<0||nextSum<nextCount||nextSum>nextCount*5)throw new Error('Yorum sayaçları tutarsız.');
  return {reviewCount:nextCount,reviewRatingSum:nextSum};
}
// Public projection never includes user identifiers, email or moderation notes.
export function publicReview(id:string,v:Record<string,unknown>){
  return {id,...(photoIds(v.photoIds??v.publicPhotoIds).length?{photoIds:photoIds(v.photoIds??v.publicPhotoIds)}:{}),...(publicReply(v.reply)?{reply:publicReply(v.reply)}:{}),rating:v.rating,text:v.text,resolved:v.resolved,wc:v.wc,
    ...Object.fromEntries(['quality','payment','cleanliness','wcCleanliness'].filter(k=>typeof v[k]==='number').map(k=>[k,v[k]]))};
}


