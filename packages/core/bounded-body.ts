/** Stop reading as soon as the byte limit is exceeded, including chunked requests. */
export async function boundedBytes(request:Pick<Request,'headers'|'body'>&{text?:()=>Promise<string>},limit:number):Promise<Uint8Array>{
 const length=request.headers.get('content-length');if(length&&Number(length)>limit)throw new RangeError('İstek çok büyük.');
 // Native fetch may expose text() without a ReadableStream. The post-read byte
 // check cannot provide a pre-allocation memory bound on that platform.
 if(!request.body){const bytes=request.text?new TextEncoder().encode(await request.text()):new Uint8Array();if(bytes.length>limit)throw new RangeError('İstek çok büyük.');return bytes;}const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new RangeError('İstek çok büyük.');}chunks.push(value);}}finally{reader.releaseLock();}
 const output=new Uint8Array(size);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;}return output;
}

