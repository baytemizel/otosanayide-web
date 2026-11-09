import {fileURLToPath} from 'node:url';

const security = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};
// Links carrying ?token= must not leak through Referer.
const tokenPage = {ssr: false, headers: {...security, 'Referrer-Policy': 'no-referrer'}};
// Account and panel screens depend on the browser-only session.
const accountPage = {ssr: false, headers: security};

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: {enabled: false},
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/globals.css'],
  components: [{path: '~/components', pathPrefix: false}],
  alias: {'@otosanayide/core': fileURLToPath(new URL('./packages/core', import.meta.url))},
  runtimeConfig: {
    public: {
      appMode: '',
      apiOrigin: '',
      googleMapsKey: '',
      businessPhotosEnabled: '',
      brandServingEnabled: '',
      brandRecaptchaSiteKey: '',
      pushEnabled: '',
      pushVapidKey: '',
      firebaseApiKey: '',
      firebaseProjectId: '',
      firebaseAppId: '',
      firebaseMessagingSenderId: '',
      firebaseStorageBucket: '',
    },
  },
  routeRules: {
    '/**': {headers: security},
    '/giris': accountPage,
    '/giris/eposta-dogrula': tokenPage,
    '/giris/sifre-sifirla': tokenPage,
    '/araclarim': accountPage,
    '/basvurularim': accountPage,
    '/bildirimler': accountPage,
    '/hesabim': accountPage,
    '/isletme': accountPage,
    '/kaydedilenler': accountPage,
    '/taleplerim': accountPage,
    '/yonetim': accountPage,
  },
  // packages/core is copied verbatim and was written against these compiler settings.
  typescript: {strict: true, tsConfig: {compilerOptions: {noUncheckedIndexedAccess: false, verbatimModuleSyntax: false}}},
});
