import {z} from 'zod';import type {Business} from './index';import {decodeSearchResult} from './search-client';
export const favoriteId=z.string().regex(/^[A-Za-z0-9_-]{1,120}$/);
export const favoriteWrite=z.object({businessId:favoriteId,adding:z.boolean()}).strict();
export type FavoriteEntry={id:string;business:Business|null};export type FavoritePage={entries:FavoriteEntry[];next:string|null};
export function parseFavoritePage(raw:unknown):FavoritePage{const value=z.object({entries:z.array(z.object({id:favoriteId,business:z.unknown()}).strict()).max(20),next:favoriteId.nullable()}).strict().parse(raw);if(new Set(value.entries.map(e=>e.id)).size!==value.entries.length||value.next!==null&&(value.entries.length!==20||value.next!==value.entries.at(-1)?.id))throw Error('favorites_response');return {next:value.next,entries:value.entries.map(e=>{const business=e.business===null?null:decodeSearchResult({mode:'live',items:[e.business],districts:[]},'live').items[0];if(business&&business.id!==e.id)throw Error('favorites_response');return {id:e.id,business};})};}
export const favoriteStatus=z.object({saved:z.boolean()}).strict();
