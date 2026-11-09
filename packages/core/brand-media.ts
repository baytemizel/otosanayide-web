import {z} from 'zod';
export const brandImageLimits={edge:1920,maxBytes:2500000,maxPixels:24000000};
export const brandAssetSchema=z.object({id:z.string().uuid(),sha256:z.string().regex(/^[a-f0-9]{64}$/),width:z.number().int().positive().max(1920),height:z.number().int().positive().max(1920),bytes:z.number().int().positive().max(2500000)}).strict();
export type BrandAsset=z.infer<typeof brandAssetSchema>;
export function mayChangeBrandImage(row:{status:string;version:number},version:number){return row.version===version&&['draft','rejected','paused'].includes(row.status);}
export function brandImageViewed(asset:BrandAsset,version:number,view:Record<string,unknown>|undefined,now:number){return view?.id===asset.id&&view?.sha256===asset.sha256&&view?.version===version&&typeof view?.viewedAtMs==='number'&&view.viewedAtMs<=now&&view.viewedAtMs>now-3600000;}
