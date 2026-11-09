import {locationSchema, type ServiceLocation} from './location';
export const businessDraftKey='otosanayide-business-draft';
export type BusinessDraft=Record<string,unknown>;
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'>;
export function readBusinessDraft(storage:Storage):BusinessDraft {
 const raw=JSON.parse(storage.getItem(businessDraftKey)??'{}');
 const draft:BusinessDraft=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 // Old location drafts take precedence over the old, independently edited address.
 if(!Object.hasOwn(draft,'location')){
  const old=locationSchema.safeParse(JSON.parse(storage.getItem('otosanayide-business-location')??'null'));
  if(old.success)return {...draft,address:old.data.address,location:old.data};
 }
 return draft;
}
export function saveBusinessField(storage:Storage,field:string,value:string){
 if(field==='address'||field==='location')throw new Error('Adresi konum düzenleyicisinden kaydet.');
 const next={...readBusinessDraft(storage),[field]:value};
 storage.setItem(businessDraftKey,JSON.stringify(next));return next;
}
export function saveBusinessLocation(storage:Storage,location:ServiceLocation){
 const point=locationSchema.parse(location);
 const next={...readBusinessDraft(storage),address:point.address,location:point};
 storage.setItem(businessDraftKey,JSON.stringify(next));return next;
}
