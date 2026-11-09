import {test} from 'node:test';import assert from 'node:assert/strict';
import {businessDraftKey,readBusinessDraft,saveBusinessField,saveBusinessLocation} from './business-draft';
const point={address:'Test adresi',latitude:41,longitude:29};
function memory(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};}
test('legacy location migrates without discarding profile fields',()=>{const s=memory();s.setItem(businessDraftKey,JSON.stringify({name:'Test servis',address:'Eski adres'}));s.setItem('otosanayide-business-location',JSON.stringify(point));assert.deepEqual(readBusinessDraft(s),{name:'Test servis',address:point.address,location:point});});
test('location and address persist together; later profile edit preserves point',()=>{const s=memory();saveBusinessLocation(s,point);saveBusinessField(s,'phone','123');assert.deepEqual(readBusinessDraft(s),{address:point.address,location:point,phone:'123'});assert.throws(()=>saveBusinessField(s,'address','Çelişen adres'));});
test('failed write leaves previous location intact',()=>{const s=memory();saveBusinessLocation(s,point);assert.throws(()=>saveBusinessLocation({...s,setItem:()=>{throw Error('Quota');}},{...point,latitude:42}));assert.deepEqual(readBusinessDraft(s).location,point);});
