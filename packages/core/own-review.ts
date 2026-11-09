import {authorReviewPermissions} from './review-author-actions';
export function ownReview(uid:string,businessId:string,id:string,v:Record<string,unknown>|undefined){
 if(!v||v.userId!==uid||v.businessId!==businessId)return null;
 return {id,text:typeof v.text==='string'?v.text:'',rating:typeof v.rating==='number'?v.rating:null,version:typeof v.version==='number'?v.version:1,status:['pending','approved','rejected','hidden','withdrawn'].includes(String(v.status))?String(v.status):'unknown',reason:typeof v.reason==='string'?v.reason:'',resolved:typeof v.resolved==='string'?v.resolved:'unknown',wc:typeof v.wc==='string'?v.wc:'unknown',...Object.fromEntries(['quality','payment','cleanliness','wcCleanliness'].filter(k=>typeof v[k]==='number').map(k=>[k,v[k]])),...authorReviewPermissions(v)};
}
