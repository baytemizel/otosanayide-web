// Bounded preflight before browser pixel decoding. Not a complete image validator.
export function rasterDimensions(bytes:Uint8Array){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=bytes.length;
 const ascii=(start:number,length:number)=>String.fromCharCode(...bytes.slice(start,start+length));
 if(n>=24&&ascii(1,3)==='PNG'&&bytes[0]===137&&ascii(12,4)==='IHDR')return {width:v.getUint32(16),height:v.getUint32(20)};
 if(n>=30&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){
  const format=ascii(12,4);
  if(format==='VP8X')return {width:1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),height:1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)};
  if(format==='VP8L'&&bytes[20]===47)return {width:1+bytes[21]+((bytes[22]&63)<<8),height:1+(bytes[22]>>6)+(bytes[23]<<2)+((bytes[24]&15)<<10)};
  if(format==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42)return {width:v.getUint16(26,true)&16383,height:v.getUint16(28,true)&16383};
 }
 if(n>=4&&bytes[0]===255&&bytes[1]===216){
  let offset=2;
  while(offset+4<=n){
   if(bytes[offset++]!==255)break;while(offset<n&&bytes[offset]===255)offset++;
   const marker=bytes[offset++];if(marker===0||marker===217||marker===218)break;
   if(marker===1||(marker>=208&&marker<=215))continue;
   if(offset+2>n)break;const length=v.getUint16(offset);if(length<2||offset+length>n)break;
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=8)return {width:v.getUint16(offset+5),height:v.getUint16(offset+3)};
   offset+=length;
  }
 }
 throw Error('Fotoğraf okunamadı. Başka bir JPEG veya PNG dene.');
}
