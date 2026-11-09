import type {Business} from './index';import {searchBusinesses} from './index';import {campaignView,ownsCampaignBusiness} from './campaigns';import type {parseSearchRequest} from './search-request';type SearchFilter=ReturnType<typeof parseSearchRequest>;
export type SponsoredItem={business:Business;headline:string;description:string;expiresAtMs:number;metricToken?:string};
export function adPlacement(f:SearchFilter):'search'|'category'|'home'{return f.q||f.district||f.service||f.brand||f.card||f.center?'search':f.category?'category':'home';}
export function rotateCandidates<T>(items:T[],now:number,limit=6){if(!items.length)return [];const start=Math.floor(now/60000)%items.length;return Array.from({length:Math.min(limit,items.length)},(_,i)=>items[(start+i)%items.length]);}
export function sponsoredEligible(input:{campaignId:string;reservationId:string;orderId:string;marketId:string;campaign:Record<string,unknown>;reservation:Record<string,unknown>;order:Record<string,unknown>;receipt:Record<string,unknown>;business:Record<string,unknown>;membership:Record<string,unknown>;visible:Business},f:SearchFilter,now:number):SponsoredItem|null{
 const {campaignId,reservationId,orderId,marketId,reservation:r,order:o,receipt:p,business:b,membership:m,visible}=input,c=campaignView(campaignId,input.campaign);if(!c||c.status!=='scheduled')return null;
 const start=Date.parse(c.startDate+'T00:00:00+03:00'),end=start+c.days*86400000;
 if(now<start||now>=end||c.placement!==adPlacement(f)||c.city!==f.city||(f.category&&c.category!==f.category)||c.businessId!==visible.id||!visible.categories.includes(c.category)||visible.ownership!=='verified'||visible.coordinateStatus!=='verified'||c.approvedProfileVersion!==(b.profileVersion??0)||!ownsCampaignBusiness(String(o.userId),c.businessId,b,m))return null;
 if(o.status!=='paid'||r.status!=='paid'||p.outcome!=='paid'||p.reason!==''||o.reservationId!==reservationId||r.orderId!==orderId||p.orderId!==orderId||o.campaignId!==campaignId||r.campaignId!==campaignId||o.businessId!==c.businessId||r.businessId!==c.businessId||r.userId!==o.userId||r.marketId!==marketId||r.expiresAtMs!==end||o.campaignVersion!==c.version-1||r.campaignVersion!==o.campaignVersion||o.totalMinor!==p.amountMinor||o.currency!==p.currency||r.totalMinor!==o.totalMinor||r.currency!==o.currency||o.provider!==p.provider)return null;
 const matched=searchBusinesses([visible],f)[0];return matched?{business:matched,headline:c.headline,description:c.description,expiresAtMs:end}:null;
}


