import {searchOrigin} from './search-client';
import {garageApiUrl} from './garage-transfer';
type Environment=Record<string,string|undefined>;
export function inspectMobileEnvironment(env:Environment,profile:'preview'|'production'){
 const checks:Array<{id:string;passed:boolean;fields:string[]}>=[];
 const check=(id:string,passed:boolean,fields:string[]=[])=>checks.push({id,passed,fields});
 const push=env.EXPO_PUBLIC_PUSH_ENABLED;check('push.flag',push===undefined||push==='true'||push==='false',['EXPO_PUBLIC_PUSH_ENABLED']);if(profile==='preview')check('preview.push-closed',push!=='true',['EXPO_PUBLIC_PUSH_ENABLED']);if(push==='true'){check('push.server',env.PUSH_DELIVERY_ENABLED==='true',['PUSH_DELIVERY_ENABLED']);check('push.sender',/^\d{1,24}$/.test(env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID??''),['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID']);check('push.native-build',/^[0-9]+\.[0-9]+\.[0-9]+$/.test(env.OTOSANAYIDE_FIREBASE_MESSAGING_VERSION??'')&&/^[0-9]+\.[0-9]+\.[0-9]+$/.test(env.OTOSANAYIDE_FIREBASE_IOS_VERSION??''),['OTOSANAYIDE_FIREBASE_MESSAGING_VERSION','OTOSANAYIDE_FIREBASE_IOS_VERSION']);}
 const places=env.EXPO_PUBLIC_PLACES_ENABLED;check('places.flag',places===undefined||places==='true'||places==='false',['EXPO_PUBLIC_PLACES_ENABLED']);if(profile==='preview')check('preview.places-closed',places!=='true',['EXPO_PUBLIC_PLACES_ENABLED']);if(places==='true')check('places.server-config',env.GOOGLE_PLACES_ENABLED==='true'&&!!env.GOOGLE_PLACES_API_KEY?.trim(),['GOOGLE_PLACES_ENABLED','GOOGLE_PLACES_API_KEY']);
 const photos=env.EXPO_PUBLIC_BUSINESS_PHOTOS_ENABLED;check('business-photos.flag',photos===undefined||photos==='true'||photos==='false',['EXPO_PUBLIC_BUSINESS_PHOTOS_ENABLED']);if(profile==='preview')check('preview.business-photos-closed',photos!=='true',['EXPO_PUBLIC_BUSINESS_PHOTOS_ENABLED']);if(photos==='true'){let safe=false;try{searchOrigin(env.EXPO_PUBLIC_API_ORIGIN??'');safe=true;}catch{}check('business-photos.https-origin',safe,['EXPO_PUBLIC_API_ORIGIN']);}
 const reviewsFlag=env.EXPO_PUBLIC_REVIEWS_ENABLED;check('reviews.flag',reviewsFlag===undefined||reviewsFlag==='true'||reviewsFlag==='false',['EXPO_PUBLIC_REVIEWS_ENABLED']);if(profile==='preview')check('preview.reviews-closed',reviewsFlag!=='true',['EXPO_PUBLIC_REVIEWS_ENABLED']);if(reviewsFlag==='true'){let safe=false;try{searchOrigin(env.EXPO_PUBLIC_API_ORIGIN??'');safe=true;}catch{}check('reviews.https-origin',safe,['EXPO_PUBLIC_API_ORIGIN']);}
 const searchFlag=env.EXPO_PUBLIC_SEARCH_ENABLED;check('search.flag',searchFlag===undefined||searchFlag==='false'||searchFlag==='true',['EXPO_PUBLIC_SEARCH_ENABLED']);check(profile==='preview'?'preview.search-closed':'production.search-enabled',profile==='preview'?searchFlag!=='true':searchFlag==='true',['EXPO_PUBLIC_SEARCH_ENABLED']);if(searchFlag==='true'){let safe=false;try{searchOrigin(env.EXPO_PUBLIC_API_ORIGIN??'');safe=true;}catch{}check('search.https-origin',safe,['EXPO_PUBLIC_API_ORIGIN']);}
 const flag=env.EXPO_PUBLIC_ACCOUNT_ENABLED,enabled=flag==='true';
 check('account.flag',flag===undefined||flag==='false'||flag==='true',['EXPO_PUBLIC_ACCOUNT_ENABLED']);
 check('public.secrets',!Object.entries(env).some(([key,value])=>key.startsWith('EXPO_PUBLIC_')&&!!value&&/SECRET|TOKEN|PAYMENT_GATEWAY|WEBHOOK|EMAIL_RELAY|PRIVATE_KEY|SERVICE_ACCOUNT|OPENAI|MEILI_(?:SEARCH|WRITE)_KEY|APPLICATION_CREDENTIALS/.test(key)));
 if(profile==='preview')check('preview.account-closed',!enabled,['EXPO_PUBLIC_ACCOUNT_ENABLED']);
 if(profile==='production')check('production.account-enabled',enabled,['EXPO_PUBLIC_ACCOUNT_ENABLED']);
 if(enabled||profile==='production'){
  const project=env.EXPO_PUBLIC_FIREBASE_PROJECT_ID??'';
  check('firebase.project',/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project),['EXPO_PUBLIC_FIREBASE_PROJECT_ID']);
  check('firebase.key',!!env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim(),['EXPO_PUBLIC_FIREBASE_API_KEY']);
  check('firebase.app',/^1:\d+:(?:web|android|ios):[a-f0-9]+$/i.test(env.EXPO_PUBLIC_FIREBASE_APP_ID??''),['EXPO_PUBLIC_FIREBASE_APP_ID']);
  let safe=false;try{const origin=new URL(env.EXPO_PUBLIC_API_ORIGIN??'');garageApiUrl(env.EXPO_PUBLIC_API_ORIGIN??'');safe=!['localhost','127.0.0.1','[::1]'].includes(origin.hostname);}catch{}
  check('api.https-origin',safe,['EXPO_PUBLIC_API_ORIGIN']);
  check('firebase.server-match',!!project&&project===env.GOOGLE_CLOUD_PROJECT,['EXPO_PUBLIC_FIREBASE_PROJECT_ID','GOOGLE_CLOUD_PROJECT']);
  check('api.backup-enabled',env.MOBILE_GARAGE_BACKUP_ENABLED==='true',['MOBILE_GARAGE_BACKUP_ENABLED']);
 }
 return {profile,configurationPassed:checks.every(c=>c.passed),releaseReady:false as const,checks,liveAcceptance:'not-verified',requiredAcceptance:['Gerçek Firebase e-posta giriş/kayıt/doğrulama/sıfırlama','Gerçek token ile kendi hesaba erişim ve çapraz hesap reddi','Firestore transaction yarış/retry ve boyut kabulü','Native HTTPS/redirect davranışı, App Check ve edge koruması','iOS/Android/Huawei fiziksel cihaz kabulü','Keychain/Keystore native derleme, soğuk açılışta güvenli oturum yenileme ve çıkışta kayıt silinmesi','iOS ve Android/Huawei konum izni, yaklaşık konum ve reddedilince şehir seçimi','Küçük/büyük Google haritası, çevrimdışı fallback ve doğrudan rota','Yetkili işletme Places araması ve önerinin doğrulama sayılmaması','Özel medya bulut yedeği ve web araç listesiyle ortak veri geçişi']};
}
