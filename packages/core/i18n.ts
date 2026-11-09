import english from './locales/en.json';
export type Locale='tr'|'en';
export const localeTag=(locale:Locale)=>locale==='en'?'en-GB':'tr-TR';
export function parseLocale(value:unknown):Locale{return value==='en'?'en':'tr';}
export function translate(locale:Locale,source:string,params:Record<string,string|number>={}){
 const key=source.trim(),translated=locale==='en'?(english as Record<string,string>)[key]??key:key;
 const padded=source.match(/^\s*/)?.[0]+translated+(source.match(/\s*$/)?.[0]??'');
 return padded.replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(params,key)?String(params[key]):match);
}
