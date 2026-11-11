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
  css: [
    '@fontsource/arimo/400.css',
    '@fontsource/arimo/700.css',
    '@fontsource/gelasio/700.css',
    '~/assets/css/globals.css',
    '~/assets/css/design.css',
  ],
  components: [{path: '~/components', pathPrefix: false}],
  // The business area moves to its own project (K184). These pages stay as source but get no route.
  ignore: ['**/pages/isletme.vue', '**/pages/isletme/**'],
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
      portalOrigin: '',
      siteOrigin: '',
      indexingEnabled: '',
      legalPagesEnabled: '',
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
    '/kaydedilenler': accountPage,
    '/taleplerim': accountPage,
    '/yorumlarim': accountPage,
    '/yonetim': accountPage,
  },
  // packages/core is copied verbatim and was written against these compiler settings.
  typescript: {strict: true, tsConfig: {compilerOptions: {noUncheckedIndexedAccess: false, verbatimModuleSyntax: false}}},
});
