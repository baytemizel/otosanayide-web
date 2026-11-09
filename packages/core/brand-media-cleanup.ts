/** Fail closed: only known upload records can enter cleanup; current assets and holds win. */
import {z} from 'zod';
const uuid=z.string().uuid();const day=86400000;
export const brandRetention={unfinishedMs:day,detachedMs:30*day};
export type CleanupDecision='keep'|'observe'|'purge';
export function brandCleanupDecision(id:string,row:Record<string,unknown>,campaign:Record<string,unknown>|undefined,now:number):CleanupDecision{
 if(!uuid.safeParse(id).success||!uuid.safeParse(row.campaignId).success||row.retentionHold!==undefined&&row.retentionHold!==false)return 'keep';
 if(!Number.isSafeInteger(now)||typeof row.createdAtMs!=='number'||!Number.isSafeInteger(row.createdAtMs)||row.createdAtMs<0||row.createdAtMs>now)return 'keep';
 if(campaign?.asset!==undefined){const asset=campaign.asset;if(!asset||typeof asset!=='object'||!uuid.safeParse((asset as Record<string,unknown>).id).success)return 'keep';if((asset as Record<string,unknown>).id===id)return 'keep';}
 if(!['uploading','failed','attached','purging'].includes(String(row.status)))return 'keep';
 if(row.status==='purging')return 'purge';
 if(row.status==='uploading'||row.status==='failed')return now-row.createdAtMs>=brandRetention.unfinishedMs?'purge':'keep';
 if(row.orphanObservedAtMs===undefined)return 'observe';
 if(typeof row.orphanObservedAtMs!=='number'||!Number.isSafeInteger(row.orphanObservedAtMs)||row.orphanObservedAtMs<row.createdAtMs||row.orphanObservedAtMs>now)return 'keep';
 return now-row.orphanObservedAtMs>=brandRetention.detachedMs?'purge':'keep';
}
/** claim must atomically re-read parent + upload and set purging before returning true. */
export async function purgeBrandMedia(port:{claim:()=>Promise<boolean>;remove:()=>Promise<void>;complete:()=>Promise<void>}){if(!await port.claim())return false;await port.remove();await port.complete();return true;}
