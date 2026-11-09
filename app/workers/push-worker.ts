/// <reference lib="webworker" />
import {initializeApp} from 'firebase/app';import {getMessaging,onBackgroundMessage} from 'firebase/messaging/sw';
// Bundled from the installed SDK, never a CDN import. URL contains public project config only.
const worker=self as unknown as ServiceWorkerGlobalScope,q=new URL(worker.location.href).searchParams;
const apiKey=q.get('apiKey'),projectId=q.get('projectId'),appId=q.get('appId'),messagingSenderId=q.get('messagingSenderId');
if(apiKey&&apiKey.length<256&&/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId??'')&&/^1:\d+:web:[a-f0-9]+$/.test(appId??'')&&/^\d{1,24}$/.test(messagingSenderId??'')){
 const messaging=getMessaging(initializeApp({apiKey,projectId:projectId!,appId:appId!,messagingSenderId:messagingSenderId!}));
 // SDK displays server notification payloads and handles same-origin fcmOptions.link. Do not display a second copy.
 onBackgroundMessage(messaging,()=>{});
}
