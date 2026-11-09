import {searchOrigin} from './search-client';
export const releaseFlags=[
 'SCHEDULER_ENABLED','PUSH_DELIVERY_ENABLED','NEXT_PUBLIC_PUSH_ENABLED','EMAIL_DELIVERY_ENABLED','PAYMENTS_ENABLED','GOOGLE_PLACES_ENABLED','BUSINESS_PHOTOS_ENABLED','NEXT_PUBLIC_BUSINESS_PHOTOS_ENABLED','CLAIM_EVIDENCE_ENABLED','REVIEW_PHOTOS_ENABLED','AI_MODERATION_ENABLED','AD_RESERVATIONS_ENABLED','AD_SERVING_ENABLED','AD_METRICS_ENABLED',
 'BRAND_MEDIA_ENABLED','BRAND_MEDIA_CLEANUP_ENABLED','BRAND_RESERVATIONS_ENABLED','BRAND_ORDERS_ENABLED','BRAND_ACCEPTANCE_ENABLED',
 'BRAND_PREVIEW_ENABLED','BRAND_SERVING_ENABLED','NEXT_PUBLIC_BRAND_SERVING_ENABLED','BRAND_METRICS_ENABLED','BRAND_CANCELLATIONS_ENABLED','BRAND_REFUND_REVIEW_ENABLED','MOBILE_GARAGE_BACKUP_ENABLED','SHARED_GARAGE_ENABLED','DATA_REQUESTS_ENABLED',
] as const;
type Environment=Record<string,string|undefined>;
type Check={id:string;status:'pass'|'fail';message:string;fields:string[]};
// Pure, read-only inspection. Never return environment values or claim cloud acceptance.
export function inspectReleaseEnvironment(env:Environment,profile:'preview'|'production'){
 const checks:Check[]=[],present=(key:string)=>typeof env[key]==='string'&&env[key]!.trim().length>0,on=(key:string)=>env[key]==='true';
 const check=(id:string,ok:boolean,message:string,fields:string[]=[])=>checks.push({id,status:ok?'pass':'fail',message,fields});
 check('mode',env.NEXT_PUBLIC_APP_MODE===(profile==='preview'?'demo':'live'),'Uygulama modu seçilen denetim profiliyle aynı olmalı.',['NEXT_PUBLIC_APP_MODE']);
 for(const flag of releaseFlags){check('flag.'+flag,!present(flag)||['true','false'].includes(env[flag]!),'Özellik bayrağı yalnız true veya false olmalı.',[flag]);if(profile==='preview')check('preview.'+flag,!on(flag),'Yerel demo profilinde canlı özellik açılmamalı.',[flag]);}
 check('public-secret',!Object.keys(env).some(key=>key.startsWith('NEXT_PUBLIC_')&&/SECRET|TOKEN|PAYMENT_GATEWAY|WEBHOOK|EMAIL_RELAY|PRIVATE_KEY|SERVICE_ACCOUNT|OPENAI|MEILI_(?:SEARCH|WRITE)_KEY|SEARCH_PROVIDER_KEY|APPLICATION_CREDENTIALS/.test(key)&&present(key)),'Sunucu sırları NEXT_PUBLIC alanına taşınmamalı.');
 if(on('BUSINESS_PHOTOS_ENABLED'))check('business-photos.bucket',present('BUSINESS_PHOTOS_BUCKET')&&!['CLAIM_EVIDENCE_BUCKET','REVIEW_PHOTOS_BUCKET','BRAND_MEDIA_BUCKET','GARAGE_MEDIA_BUCKET'].some(k=>present(k)&&env[k]===env.BUSINESS_PHOTOS_BUCKET),'İşletme fotoğrafları için ayrı özel depo gerekli.',['BUSINESS_PHOTOS_BUCKET']);
 if(on('NEXT_PUBLIC_BUSINESS_PHOTOS_ENABLED'))check('business-photos.public',on('BUSINESS_PHOTOS_ENABLED'),'Public işletme fotoğrafları sunucu yükleme/depo yapılandırmasına bağlı.',['BUSINESS_PHOTOS_ENABLED']);
 if(on('GOOGLE_PLACES_ENABLED'))check('places.server-key',present('GOOGLE_PLACES_API_KEY'),'Adres araması için yalnız sunucuda tutulan Places anahtarı gerekli.',['GOOGLE_PLACES_API_KEY']);
 if(on('PUSH_DELIVERY_ENABLED')){check('push.apps',!!env.PUSH_PUBLIC_APP_IDS&&(env.PUSH_PUBLIC_APP_IDS??'').split(',').every(v=>/^1:\d+:(?:web|android|ios):[a-f0-9]+$/.test(v.trim())),'Push için incelenmiş Firebase App ID izin listesi gerekli.',['PUSH_PUBLIC_APP_IDS']);let valid=false;try{valid=searchOrigin(env.PUBLIC_APP_ORIGIN??'')===env.PUBLIC_APP_ORIGIN;}catch{}check('push.origin',valid,'Push bağlantısı ilk taraf HTTPS adresi olmalı.',['PUBLIC_APP_ORIGIN']);}
 if(on('NEXT_PUBLIC_PUSH_ENABLED'))check('push.web-config',on('PUSH_DELIVERY_ENABLED')&&/^\d{1,24}$/.test(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID??'')&&/^[A-Za-z0-9_-]{80,120}={0,2}$/.test(env.NEXT_PUBLIC_PUSH_VAPID_KEY??'')&&(env.PUSH_PUBLIC_APP_IDS??'').split(',').map(v=>v.trim()).includes(env.NEXT_PUBLIC_FIREBASE_APP_ID??''),'Web push sunucu bayrağı, sender, VAPID ve eşleşen App ID gerektirir.',['PUSH_DELIVERY_ENABLED','NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID','NEXT_PUBLIC_PUSH_VAPID_KEY','NEXT_PUBLIC_FIREBASE_APP_ID','PUSH_PUBLIC_APP_IDS']);
 if(on('EMAIL_DELIVERY_ENABLED')){
  let relay=false;try{relay=searchOrigin(env.EMAIL_RELAY_ORIGIN??'')===env.EMAIL_RELAY_ORIGIN;}catch{/* fail closed */}
  check('email.relay',relay&&(env.EMAIL_RELAY_TOKEN??'').length>=32&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EMAIL_SENDER??''),'E-posta için HTTPS relay, sunucu anahtarı ve doğrulanmış gönderici gerekli.',['EMAIL_RELAY_ORIGIN','EMAIL_RELAY_TOKEN','EMAIL_SENDER']);
 }
 if(on('PAYMENTS_ENABLED')){
  const origin=(s:string|undefined)=>{try{return searchOrigin(s??'')===s;}catch{return false;}};
  check('payments.identity',/^[a-z0-9_-]{1,40}$/.test(env.PAYMENT_PROVIDER_NAME??'')&&!!env.PAYMENT_MERCHANT_ID?.trim()&&(env.PAYMENT_MERCHANT_ID??'').length<=200,'Ödeme sağlayıcı ve merchant kimliği gerekli.',['PAYMENT_PROVIDER_NAME','PAYMENT_MERCHANT_ID']);
  check('payments.origins',['PAYMENT_GATEWAY_ORIGIN','PAYMENT_RETURN_ORIGIN'].every(k=>origin(env[k]))&&(env.PAYMENT_CHECKOUT_ORIGINS??'').split(',').every(s=>origin(s.trim())),'Ödeme gateway, dönüş ve izinli checkout adresleri açık HTTPS origin olmalı.',['PAYMENT_GATEWAY_ORIGIN','PAYMENT_RETURN_ORIGIN','PAYMENT_CHECKOUT_ORIGINS']);
  check('payments.secrets',['PAYMENT_GATEWAY_TOKEN','PAYMENT_WEBHOOK_SECRET'].every(k=>(env[k]??'').length>=32)&&env.PAYMENT_GATEWAY_TOKEN!==env.PAYMENT_WEBHOOK_SECRET,'Gateway token ve webhook anahtarı ayrı ve güçlü olmalı.',['PAYMENT_GATEWAY_TOKEN','PAYMENT_WEBHOOK_SECRET']);
 }
 const anyFeature=releaseFlags.some(on);
 if(profile==='production'||anyFeature){
 check('firebase.server',present('GOOGLE_CLOUD_PROJECT')&&/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(env.GOOGLE_CLOUD_PROJECT!),'Geçerli sunucu proje kimliği gerekli.',['GOOGLE_CLOUD_PROJECT']);
 }
 if(profile==='production'){
 const fields=['NEXT_PUBLIC_FIREBASE_API_KEY','NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN','NEXT_PUBLIC_FIREBASE_PROJECT_ID','NEXT_PUBLIC_FIREBASE_APP_ID','NEXT_PUBLIC_GOOGLE_MAPS_KEY'];
 for(const field of fields)check('required.'+field,present(field),'Canlı temel uygulama yapılandırması eksik olmamalı.',[field]);
 check('firebase.project-match',present('GOOGLE_CLOUD_PROJECT')&&env.GOOGLE_CLOUD_PROJECT===env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,'İstemci ve sunucu aynı Firebase projesini göstermeli.',['GOOGLE_CLOUD_PROJECT','NEXT_PUBLIC_FIREBASE_PROJECT_ID']);
 let safeHost=false;try{const u=new URL(env.MEILI_HOST??'');safeHost=u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname);}catch{}
 check('search.host',safeHost,'Canlı arama sunucusu HTTPS kullanmalı; kullanıcı bilgisi, sorgu ve hash içermemeli.',['MEILI_HOST']);
 check('search.index',/^[-\w]{1,100}$/.test(env.MEILI_INDEX??''),'Kodun kullandığı arama indeks adı gerekli.',['MEILI_INDEX']);
 check('search.key',present('MEILI_SEARCH_KEY'),'Arama için sunucu anahtarı gerekli.',['MEILI_SEARCH_KEY']);
 check('search.key-separation',!present('MEILI_WRITE_KEY')||env.MEILI_WRITE_KEY!==env.MEILI_SEARCH_KEY,'Arama ve indeks yazma anahtarları ayrı olmalı.',['MEILI_SEARCH_KEY','MEILI_WRITE_KEY']);
 }
 const media=[['CLAIM_EVIDENCE_ENABLED','CLAIM_EVIDENCE_BUCKET'],['REVIEW_PHOTOS_ENABLED','REVIEW_PHOTOS_BUCKET'],['BRAND_MEDIA_ENABLED','BRAND_MEDIA_BUCKET']] as const;
 for(const [flag,bucket]of media)if(on(flag))check('bucket.'+flag,/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(env[bucket]??''),'Açık özel medya özelliğinin bucket adı gerekli; gs:// veya nesne yolu yazılmamalı.',[bucket]);
 const configuredBuckets=media.map(([,bucket])=>bucket).filter(present);
 check('bucket.separation',new Set(configuredBuckets.map(key=>env[key])).size===configuredBuckets.length,'Sahiplik, yorum fotoğrafı ve marka görselleri ayrı depolarda olmalı.',configuredBuckets);
 const requires=(flag:string,fields:string[])=>{if(on(flag))for(const field of fields)check('dependency.'+flag+'.'+field,on(field),'Özelliğin gerekli alt bileşeni kapalı.',[flag,field]);};
 requires('BRAND_SERVING_ENABLED',['BRAND_MEDIA_ENABLED']);requires('NEXT_PUBLIC_BRAND_SERVING_ENABLED',['BRAND_SERVING_ENABLED']);
 requires('SHARED_GARAGE_ENABLED',['MOBILE_GARAGE_BACKUP_ENABLED']);
 requires('BRAND_METRICS_ENABLED',['BRAND_SERVING_ENABLED']);requires('AD_METRICS_ENABLED',['AD_SERVING_ENABLED']);requires('BRAND_MEDIA_CLEANUP_ENABLED',['BRAND_MEDIA_ENABLED']);
 const secrets=[['AD_METRICS_ENABLED','AD_METRICS_SECRET'],['BRAND_SERVING_ENABLED','BRAND_SERVING_SECRET'],['BRAND_METRICS_ENABLED','BRAND_METRICS_SECRET']] as const;
 for(const [flag,key]of secrets)if(on(flag))check('secret.'+key,/^[a-fA-F0-9]{64}$/.test(env[key]??''),'Açık özellik için ayrı 32-byte hex sunucu anahtarı gerekli.',[key]);
 // Runtime also compares the brand metric key to configured, even currently disabled keys.
 if(on('BRAND_METRICS_ENABLED'))for(const key of ['AD_METRICS_SECRET','BRAND_SERVING_SECRET'])check('secret-separation.'+key,!present(key)||(env[key]??'').toLowerCase()!==(env.BRAND_METRICS_SECRET??'').toLowerCase(),'Marka ölçüm anahtarı diğer anahtarlardan ayrı olmalı.',['BRAND_METRICS_SECRET',key]);
 if(on('BRAND_SERVING_ENABLED'))check('appcheck.allowlist',present('BRAND_PUBLIC_APP_IDS')&&(env.BRAND_PUBLIC_APP_IDS??'').split(',').map(s=>s.trim()).every(s=>/^1:\d+:(?:web|android|ios):[a-f0-9]+$/i.test(s)),'App Check için geçerli Firebase App ID izin listesi gerekli.',['BRAND_PUBLIC_APP_IDS']);
 if(on('NEXT_PUBLIC_BRAND_SERVING_ENABLED'))check('appcheck.site-key',present('NEXT_PUBLIC_BRAND_RECAPTCHA_SITE_KEY'),'Web App Check site anahtarı gerekli.',['NEXT_PUBLIC_BRAND_RECAPTCHA_SITE_KEY']);
 if(on('AI_MODERATION_ENABLED'))check('moderation.key',present('OPENAI_API_KEY'),'AI moderasyonu açılmışsa sunucu API anahtarı gerekli.',['OPENAI_API_KEY']);
 return {profile,configurationPassed:checks.every(c=>c.status==='pass'),releaseReady:false as const,checks,liveAcceptance:'not-verified' as const,requiredAcceptance:['Firebase Auth/claims ve gerçek veritabanı kuralları','Özel bucket IAM/TTL ve dosya yaşam döngüsü','Arama indeksi ve aktarılmış kayıtların yayın incelemesi','Maps/Places faturalama, kota ve anahtar kısıtları','Push/e-posta ve zamanlanmış işlerin gerçek teslimi','Ödeme/iade sağlayıcısı ve finansal kabul','iOS/Android/Huawei cihaz ve mağaza kabulü','HTTPS/edge, yedekleme, yük ve operasyon kabulü']};
}
