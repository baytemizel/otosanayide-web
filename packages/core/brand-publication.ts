import {z} from 'zod';
import {brandDeliveryInput} from './brand-delivery';
import {brandCreative} from './brand-campaigns';

export const brandPublicContext=z.object({placement:brandDeliveryInput.shape.placement,city:brandDeliveryInput.shape.city,category:brandDeliveryInput.shape.category}).strict().refine(v=>v.placement!=='category_banner'||!!v.category);
export const brandCandidateLimit=6;
export const brandPublicLimit=3;
export function rotateBrandCandidates(ids:string[],now:number){
 const unique=[...new Set(ids)].sort();if(!unique.length)return [];
 const offset=Math.floor(now/60000)%unique.length;
 return [...unique.slice(offset),...unique.slice(0,offset)].slice(0,brandCandidateLimit);
}
export const brandPublicItem=z.object({
 key:z.string().regex(/^[a-f0-9]{64}$/),
 brand:brandCreative.shape.brand,headline:brandCreative.shape.headline,
 description:brandCreative.shape.description,destinationUrl:brandCreative.shape.url,
 placement:z.enum(['home_banner','category_banner']),sponsored:z.literal(true),
 metrics:z.object({token:z.string().min(40).max(2048).regex(/^[A-Za-z0-9_-]+$/),expiresAtMs:z.number().int().positive()}).strict().optional(),
 image:z.object({width:z.number().int().min(1).max(1920),height:z.number().int().min(1).max(1920),url:z.string().max(2200).regex(/^\/api\/brand-banners\/image\?token=[A-Za-z0-9_-]+$/).optional(),expiresAtMs:z.number().int().positive().optional()}).strict().refine(v=>(v.url===undefined)===(v.expiresAtMs===undefined))
}).strict();
export type BrandPublicItem=z.infer<typeof brandPublicItem>;
