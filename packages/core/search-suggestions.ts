import {brands,categories,normalize} from './index';
import {Locale,translate,localeTag} from './i18n';
const services=['Periyodik bakım','Motor bakımı','Arıza tespiti','Fren','Şanzıman','İç temizlik','Pasta cila','Seramik kaplama','Boyasız göçük','Rot balans','Lastik değişimi','Sunroof tamiri','Cam filmi','Kaporta koruma filmi'];
export function searchSuggestions(query:string,locale:Locale='tr'){
 const needle=normalize(query);if(needle.length<2)return [];
 return [...new Set([...categories.flatMap(c=>[c.name,...c.services]),...services,...brands])]
  .filter(label=>normalize(label).includes(needle)||normalize(translate(locale,label)).includes(needle))
  .map(label=>translate(locale,label))
  .sort((a,b)=>Number(normalize(b).startsWith(needle))-Number(normalize(a).startsWith(needle))||a.localeCompare(b,localeTag(locale))).slice(0,8);
}
