import {firebaseApp} from './firebase';import {demoMode,publicEnv} from './env';
import type {AppCheck} from 'firebase/app-check';
let instance:Promise<AppCheck>|undefined;
export const brandAdsEnabled=()=>publicEnv().brandServingEnabled&&!demoMode();
export async function brandAppCheckToken(){
 if(!brandAdsEnabled()||!publicEnv().brandRecaptchaSiteKey)throw Error('App Check unavailable');
 const sdk=await import('firebase/app-check');
 instance??=Promise.resolve().then(()=>sdk.initializeAppCheck(firebaseApp(),{provider:new sdk.ReCaptchaEnterpriseProvider(publicEnv().brandRecaptchaSiteKey!),isTokenAutoRefreshEnabled:true})).catch(e=>{instance=undefined;throw e;});
 return (await sdk.getToken(await instance,false)).token;
}
