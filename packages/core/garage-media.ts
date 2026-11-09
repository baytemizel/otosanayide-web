export const mediaProfiles={review:{edge:1600,quality:.88,maxBytes:2500000},vehicle:{edge:1280,quality:.86,maxBytes:1500000},document:{edge:2400,quality:.92,maxBytes:4000000}} as const;
export function fittedSize(width:number,height:number,edge:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width*height>60000000)throw Error('Fotoğraf boyutları desteklenmiyor.');
 const ratio=Math.min(1,edge/Math.max(width,height));return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
export function inspectionState(due:string,today:string){const days=Math.round((Date.parse(due+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);return {days,state:days<0?'expired':days===0?'today':days<=30?'soon':'scheduled'} as const;}
