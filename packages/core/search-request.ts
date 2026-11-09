import {categories,cities,normalize} from './index';
import {maxNearbyRadius} from './coverage';
const allowed=new Set(['q','city','district','category','service','brand','card','lat','lng','radius']);
export function parseSearchRequest(p:URLSearchParams){
 for(const key of p.keys())if(!allowed.has(key)||p.getAll(key).length!==1)throw Error('invalid');
 const text=(k:string,max:number)=>{const v=(p.get(k)??'').trim();if(v.length>max)throw Error('invalid');return v;};
 const q=text('q',150),city=text('city',80),district=text('district',100),category=text('category',80),service=text('service',120),brand=text('brand',80);
 if(city&&!cities.includes(city)||district&&!city||category&&!categories.some(c=>c.id===category)||service&&!categories.find(c=>c.id===category)?.services.some(s=>normalize(s)===normalize(service)))throw Error('invalid');
 if(p.has('card')&&!['true','false'].includes(p.get('card')!))throw Error('invalid');
 const numeric=(key:string,min:number,max:number)=>{const raw=p.get(key);if(raw===null)return undefined;if(!/^-?\d+(?:\.\d+)?$/.test(raw))throw Error('invalid');const v=Number(raw);if(!Number.isFinite(v)||v<min||v>max)throw Error('invalid');return v;};
 const latitude=numeric('lat',-90,90),longitude=numeric('lng',-180,180),radius=numeric('radius',1,maxNearbyRadius);
 if((latitude===undefined)!==(longitude===undefined)||(radius!==undefined&&latitude===undefined))throw Error('invalid');
 return {q,city,district,category,service,brand,card:p.get('card')==='true',center:latitude!==undefined&&longitude!==undefined?{latitude,longitude}:undefined,radius};
}
