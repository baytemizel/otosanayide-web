import {getApps, initializeApp} from 'firebase/app';
import {publicEnv} from './env';

/** Only push and App Check remain on Firebase; both stay behind disabled flags. */
export function firebaseApp() {
  const env = publicEnv();
  if (!env.firebaseApiKey || !env.firebaseProjectId) throw new Error('Canlı üyelik henüz yapılandırılmadı.');
  return (
    getApps()[0] ??
    initializeApp({
      apiKey: env.firebaseApiKey,
      projectId: env.firebaseProjectId,
      appId: env.firebaseAppId,
      messagingSenderId: env.firebaseMessagingSenderId,
      storageBucket: env.firebaseStorageBucket,
    })
  );
}
