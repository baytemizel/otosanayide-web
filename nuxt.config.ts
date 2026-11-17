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
    '@fontsource/bricolage-grotesque/700.css',
    '@fontsource/bricolage-grotesque/800.css',
    '@fontsource/dm-sans/400.css',
    '@fontsource/dm-sans/600.css',
    '@fontsource/jetbrains-mono/500.css',
    '@fontsource/jetbrains-mono/700.css',
    '~/assets/css/v2.css',
  ],
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
    '/kayit': accountPage,
    '/araclarim': accountPage,
    '/hatirlatmalar': accountPage,
    '/randevu': accountPage,
    '/bildirimler': accountPage,
    '/hesabim': accountPage,
    '/kaydedilenler': accountPage,
    '/taleplerim': accountPage,
    '/yorumlarim': accountPage,
    '/basvurularim': accountPage,
  },
  // packages/core is copied verbatim and was written against these compiler settings.
  typescript: {strict: true, tsConfig: {compilerOptions: {noUncheckedIndexedAccess: false, verbatimModuleSyntax: false}}},
});
