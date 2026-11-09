// Only the dedicated business field is accepted. Account email is never a fallback.
export function businessContactEmail(raw:unknown){
 if(typeof raw!=='string'||/[\r\n\u0000-\u001f\u007f]/.test(raw))return null;
 const address=raw.trim().toLowerCase();
 if(address.length>254||!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(address))return null;
 return {address,href:'mailto:'+encodeURIComponent(address)};
}
export function contactPhone(raw?:string){
 if(!raw||!/^[+\d\s().-]+$/.test(raw))return null;
 let digits=raw.replace(/[\s().-]/g,'');
 if(digits.startsWith('00'))digits='+'+digits.slice(2);
 if(digits.startsWith('+')&&!digits.startsWith('+90'))return /^\+[1-9]\d{7,14}$/.test(digits)?{e164:digits,mobile:false}:null;
 digits=digits.replace(/^\+90/,'');
 if(digits.length===12&&digits.startsWith('90'))digits=digits.slice(2);
 if(digits.length===11&&digits.startsWith('0'))digits=digits.slice(1);
 if(/^90444\d{4}$/.test(digits))digits=digits.slice(2);
 if(/^444\d{4}$/.test(digits))return {e164:null,dial:digits,mobile:false,national:true as const};
 if(!/^[23458]\d{9}$/.test(digits))return null;
 return {e164:'+90'+digits,mobile:digits.startsWith('5')};
}
export function contactOptions(raw?:string){const phone=contactPhone(raw);if(!phone)return null;const destination=phone.e164??('dial' in phone?phone.dial:'');if(!destination)return null;const digits=destination.replace(/^\+/,'');return {...phone,displayNumber:destination,call:`tel:${destination}`,messengers:phone.mobile?[
 {id:'whatsapp',label:'WhatsApp',native:`whatsapp://send?phone=${digits}`,web:`https://wa.me/${digits}`},
 {id:'telegram',label:'Telegram',native:`tg://resolve?phone=${digits}`,web:`https://t.me/+${digits}`}
 ]:[]};}
export async function availableMessengers(raw:string,canOpen:(url:string)=>Promise<boolean>){const options=contactOptions(raw)?.messengers??[];const results=await Promise.all(options.map(async item=>{try{return await canOpen(item.native)?item:null;}catch{return null;}}));return results.filter((item):item is NonNullable<typeof item>=>item!==null);}
