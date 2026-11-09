import {z} from 'zod';
const coordinate=(min:number,max:number)=>z.preprocess(v=>typeof v==='string'&&v.trim()?Number(v):v,z.number().finite().min(min).max(max));
export const locationSchema=z.object({latitude:coordinate(-90,90),longitude:coordinate(-180,180),address:z.string().trim().min(5).max(500)}).strict();
export type ServiceLocation=z.infer<typeof locationSchema>;
export function mapsLocationUrl(p:Pick<ServiceLocation,'latitude'|'longitude'>){return `https://www.google.com/maps/search/?${new URLSearchParams({api:'1',query:`${p.latitude},${p.longitude}`})}`;}

export function mapsDirectionsUrl(p:Pick<ServiceLocation,'latitude'|'longitude'>){return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:`${p.latitude},${p.longitude}`,travelmode:'driving'});}
