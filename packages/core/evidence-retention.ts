export function evidenceCleanupDue(item:Record<string,unknown>,now:number){
 if(item.status==='purging')return true;
 if(['ready','withdrawn'].includes(String(item.status)))return typeof item.expiresAtMs==='number'&&item.expiresAtMs<=now;
 return ['uploading','failed'].includes(String(item.status))&&typeof item.createdAtMs==='number'&&item.createdAtMs+86400000<=now;
}
export function evidenceCounterRelease(status:unknown){return {evidence:status==='ready'||status==='uploading'?1:0,pending:status==='uploading'?1:0};}
