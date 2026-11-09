import {accountJson} from './account-client';import {searchOrigin} from './search-client';import {parseFavoritePage,favoriteStatus,favoriteWrite,favoriteId} from './favorites';
type Options={origin:string;token:()=>Promise<string>;guard:()=>void;locale:string;request?:typeof fetch};
export async function fetchFavorites(options:Options,action:{cursor?:string;businessId?:string;write?:unknown}={}){
 if([action.cursor,action.businessId,action.write].filter(v=>v!==undefined).length>1)throw Error('favorites_action');
 const url=new URL('/api/me/favorites',searchOrigin(options.origin));if(action.cursor)url.searchParams.set('cursor',favoriteId.parse(action.cursor));if(action.businessId)url.searchParams.set('businessId',favoriteId.parse(action.businessId));const write=action.write===undefined?undefined:favoriteWrite.parse(action.write);let token='';
 return (await accountJson({guard:options.guard,token:async()=>{token=await options.token();return token;},request:signal=>(options.request??fetch)(url,{method:write?'POST':'GET',signal,redirect:'error',credentials:'omit',cache:'no-store',headers:{Authorization:'Bearer '+token,'Accept-Language':options.locale,Accept:'application/json',...(write?{'Content-Type':'application/json'}:{})},...(write?{body:JSON.stringify(write)}:{})}),decode:raw=>write||action.businessId?favoriteStatus.parse(raw):parseFavoritePage(raw)})).value;
}
