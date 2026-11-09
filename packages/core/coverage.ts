import data from './coverage-data.json';

export const coveredCities:string[]=data.cities;
export const metropolitanCities:string[]=data.metropolitanCities;
export const coverageCount=coveredCities.length;
export const nearbyRadii=[25,50,100,200] as const;
export const maxNearbyRadius=200;
export type AreaMode='city'|'nearby';
export type AreaPoint={latitude:number;longitude:number};
const fold=(s:string)=>s.toLocaleLowerCase('tr').replaceAll('ı','i').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const areas=data.areas as Record<string,{center:AreaPoint|null;districts:{name:string;latitude:number|null;longitude:number|null}[]}>;
function point(value:{latitude:number|null;longitude:number|null}|null|undefined):AreaPoint|null{
 return value&&typeof value.latitude==='number'&&typeof value.longitude==='number'&&Number.isFinite(value.latitude)&&Number.isFinite(value.longitude)&&value.latitude>=35&&value.latitude<=43&&value.longitude>=25&&value.longitude<=45?{latitude:value.latitude,longitude:value.longitude}:null;
}
// Administrative references are approximate area anchors; they never approve a workshop pin.
export function areaReference(city:string,district=''):AreaPoint|null{
 const area=areas[city];if(!area)return null;
 if(district)return point(area.districts.find(d=>fold(d.name)===fold(district)));
 return point(area.center);
}
export function referenceDistricts(city:string){return areas[city]?.districts.map(d=>d.name)??[];}
export function nearbySearchFields(city:string,district:string,center?:AreaPoint){return center?{city:'',district:''}:{city,district};}
export function approximateDistance(distance:number,locale:'tr'|'en'='tr'){
 if(!Number.isFinite(distance)||distance<0)return null;
 return '≈ '+new Intl.NumberFormat(locale==='en'?'en-GB':'tr-TR',{maximumFractionDigits:1}).format(distance)+' km';
}
