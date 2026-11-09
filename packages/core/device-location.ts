import {z} from 'zod';
const point=z.object({latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180),accuracy:z.number().finite().min(0).max(10000),timestamp:z.number().finite().nonnegative()}).strict();
export function decodeDeviceLocation(raw:unknown,now=Date.now()){const v=point.parse(raw);if(v.timestamp>now+5000||now-v.timestamp>120000)throw Error('location_stale');return v;}
export function serviceMapEmbed(latitude:number,longitude:number){const v=point.pick({latitude:true,longitude:true}).parse({latitude,longitude});return 'https://maps.google.com/maps?'+new URLSearchParams({q:`${v.latitude},${v.longitude}`,z:'16',output:'embed'});}
