import type {Business} from './index';
import {mapsLocationUrl} from './location';
export function businessNavigation(b:Business){
 if(!b.published||b.sample||b.coordinateStatus!=='verified'||typeof b.latitude!=='number'||typeof b.longitude!=='number'||!Number.isFinite(b.latitude)||!Number.isFinite(b.longitude)||b.latitude<35.7||b.latitude>42.3||b.longitude<25.5||b.longitude>45)return null;
 const destination=`${b.latitude},${b.longitude}`;
 return {map:mapsLocationUrl({latitude:b.latitude,longitude:b.longitude}),directions:'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination,travelmode:'driving'})};
}
export function businessWebsite(b:Business){
 if(!b.published||b.sample||!b.website)return null;
 try{const u=new URL(b.website);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||/^(?:localhost$|.*\.localhost$|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[)/i.test(u.hostname))return null;return u.href;}catch{return null;}
}
export function businessDetailFacts(b:Business){return {address:b.sample?null:b.address||null,hours:b.hours?.trim()||null,card:b.cardPayment===undefined?'unknown':b.cardPayment?'yes':'no',wc:b.wc===undefined?'unknown':b.wc?'yes':'no',ownershipVerified:b.ownership==='verified',navigation:businessNavigation(b),website:businessWebsite(b)};}
