import {z} from 'zod';
export const MODERATION_POLICY_VERSION='tr-en-1';
const equivalents:Record<string,string>={'ı':'i','а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y','і':'i','ј':'j','ѕ':'s','α':'a','ο':'o','ι':'i','@':'a','4':'a','0':'o','1':'i','!':'i','3':'e','5':'s','$':'s','7':'t'};
/** A comparison copy only: the original review is never rewritten. */
export function normalizeModerationText(text:string){return text.slice(0,6000).normalize('NFKC').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/\p{M}|\p{Cf}/gu,'').replace(/[ıаеорсхуіјѕαοι@401!35$7]/gu,c=>equivalents[c]??c).replace(/([a-z])\1{2,}/g,'$1$1');}
const terms=[
 ['tr-profanity','amk','aq','siktir','siktirin','siktirgit','sikerim','sikeyim','sikik','yarrak','yarak','orospu','orospuçocuğu','oc','piç','göt','götveren','ibne','pezevenk'],
 ['tr-insult','salak','aptal','gerizekalı','şerefsiz'],
 ['en-profanity','fuck','fucking','fucker','motherfucker','shit','bullshit','bitch','asshole','bastard','cunt','dickhead'],
 ['en-insult','idiot','moron']
] as const;
export type LocalModeration={policyVersion:string;flagged:boolean;signals:string[];obfuscation:boolean};
export function inspectLanguage(text:string,extraTerms:string[]=[]):LocalModeration{
 const variants=[normalizeModerationText(text),normalizeModerationText(text.replace(/[@!$]/g,' '))],signals=new Set<string>();
 const groups:ReadonlyArray<readonly string[]>=[...terms,['custom',...extraTerms.slice(0,100)]];
 for(const [group,...words] of groups)for(const word of words){
  const key=normalizeModerationText(word).replace(/[^a-z]/g,'').replace(/(.)\1+/g,'$1');
  if(key.length<2||key.length>30)continue;
  // All punctuation (including mixed/repeated symbol pairs) is allowed between
  // letters, up to 8 characters. The alternate variant treats ! as a separator
  // as well as its leetspeak i interpretation. Preserve word boundaries.
  const pattern=key.split('').map(c=>`${c}{1,2}`).join('[^a-z0-9]{0,8}');
  if(variants.some(normalized=>new RegExp(`(?:^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`,'u').test(normalized))){signals.add(group);break;}
 }
 const obfuscation=/\p{Cf}|[а-ео-рсхуіјѕαοι]/u.test(text)||/(?:[a-zçğıöşü][^\p{L}\p{N}]{1,8}){3,}[a-zçğıöşü]/iu.test(text);
 return {policyVersion:MODERATION_POLICY_VERSION,flagged:signals.size>0,signals:[...signals],obfuscation};
}
export const aiModerationSchema=z.object({model:z.string().min(1).max(120),results:z.array(z.object({flagged:z.boolean(),categories:z.record(z.string(),z.boolean())})).min(1).max(2)});
export type AiModeration={status:'checked'|'unavailable'|'not_requested'|'running';flagged?:boolean;categories?:string[];model?:string};
export async function checkAiModeration(text:string,options:{enabled:boolean;apiKey?:string;fetcher?:typeof fetch}):Promise<AiModeration>{
 if(!options.enabled||!options.apiKey)return {status:'unavailable'};
 try{
  const input=[text,normalizeModerationText(text)];
  const response=await (options.fetcher??fetch)('https://api.openai.com/v1/moderations',{method:'POST',headers:{Authorization:`Bearer ${options.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'omni-moderation-latest',input}),signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!response.ok)return {status:'unavailable'};
  const {boundedBytes}=await import('./bounded-body');
  const value=aiModerationSchema.parse(JSON.parse(new TextDecoder().decode(await boundedBytes(response,128000))));
  if(value.results.length!==input.length)return {status:'unavailable'};
  return {status:'checked',model:value.model,flagged:value.results.some(r=>r.flagged),categories:[...new Set(value.results.flatMap(r=>Object.entries(r.categories).filter(([,v])=>v).map(([k])=>k)))]};
 }catch{return {status:'unavailable'};}
}
export function mayApplyAiResult(current:{status:unknown;version:unknown;text:unknown;aiRunId:unknown},expected:{version:number;text:string;runId:string}){return current.status==='pending'&&current.version===expected.version&&current.text===expected.text&&current.aiRunId===expected.runId;}

