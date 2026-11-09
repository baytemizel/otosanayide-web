import {reviewIdSchema} from './review-policy';
import {Business,featureAvailable} from './index';
export function requestKinds(b:Business){return (['quotes','appointments'] as const).filter(kind=>!b.sample&&featureAvailable(b,kind));}
export function requestHttpInput(method:string,query:URLSearchParams,contentType:string|null){
 const allowed=method==='GET'?['businessId','after']:[];
 for(const key of query.keys())if(!allowed.includes(key)||query.getAll(key).length!==1)throw Error('request_query');
 if(method==='GET'){if(query.has('businessId'))reviewIdSchema.parse(query.get('businessId'));if(query.get('after'))reviewIdSchema.parse(query.get('after'));}
 if(method!=='GET'&&!/^application\/json(?:\s*;|$)/i.test(contentType??''))throw Error('request_content_type');
}
