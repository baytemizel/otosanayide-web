# Otosanayide Web

Nuxt 4, Vue 3 ve Pinia ile yazılmış web arayüzü. Tüm veri işleri `https://api.otosanayide.com/api/*` REST API'si üzerinden yapılır; bu repoda sunucu tarafı API veya Firebase Auth yoktur.

Kaynak: otosanayide-bundle `apps/web` ve `packages/core`, commit `0498dc4dcaaac71ac1fe523466268cb0583d33c5`. `packages/core` bu commit'ten kopyalanmıştır (paylaşım yöntemi kullanıcı kabulü bekliyor). `sharp` veya Node API'si gerektiren beş görsel işleme dosyası ve bu repoda çalışamayan testler alınmadı.

## Çalıştırma

```bash
nvm use 22
npm install
cp .env.example .env
npm run dev
```

`.env.example` demo modundadır: demo hiçbir ağ isteği yapmaz, kayıtlar tarayıcıda kalır. `NUXT_PUBLIC_APP_MODE=live` için `NUXT_PUBLIC_API_ORIGIN` zorunludur; tanımsızsa uygulama açılmaz.

`localhost` üretim API'si için izinli origin değildir ve `SameSite=Strict` yenileme çerezi localhost'tan gitmez. Yerelde canlı giriş denenemez; yerel geliştirme için demo modu kullanılır.

## Komutlar

| Komut | İş |
|---|---|
| `npm run typecheck` | `vue-tsc` tip denetimi |
| `npm run build` | Üretim derlemesi (`.output`) |
| `npm test` | API, oturum, store, arama yanıtı, SEO/CSP, portal/çerez ve reklam okuyucu birim testleri |
| `npm run test:core` | `packages/core` testlerinin bu repoya düşen bölümü |

## Yapı

- `app/lib/api.ts`: tek API adresi, CORS kimlik kuralı, `Accept-Language`, 401 sonrası tek yenileme.
- `app/lib/session.ts`: oturum servisi. Erişim jetonu yalnız bellekte durur. Yenileme sekme içinde tek uçuşlu, sekmeler arasında Web Locks ile tekildir; sonuç BroadcastChannel ile paylaşılır.
- `app/stores/app.ts`: hesap verisi ve oturum çiti (Pinia).
- `app/lib/server-read.ts`: SSR'da işletme okuma.
- `app/lib/search-response.ts`: arama/profil yanıtı. API'nin ileride ekleyeceği alanları (`openingHours`, `reviewSummary`, `nextCursor`, `total`, `facets`) ayrı okur, kalanı değişmeyen `packages/core` ayrıştırıcısına verir; bozuk tek kayıt sayfayı düşürmez.
- `app/lib/contract.ts`: API'den talep edilen uçların hazır bayrakları (`otosanayide-api/docs/endpoint-requests/web-*.md`). Talep `done` olup uç yayına çıkınca ilgili bayrak `true` yapılır; o zamana kadar ekran öğesi pasif kalır.
- `app/lib/ads-client.ts`: reklam/marka/ödeme uçlarının ortak okuyucusu; 503 kapalı yanıtı ve HTML hata sayfası okunur bir hataya, açık yanıt `packages/core` biçimine karşı denetlenir.
- `app/lib/portal.ts`, `components/PortalLink.vue`: işletme bağlantıları (`<portal>/giris`, `<portal>/basvuru?business=<id>`).
- `docs/API_USAGE.md`: istemcinin çağırdığı her uç × dosya × durum ve sözleşme denetimi sonucu.
- `app/lib/response-json.ts`: `{error}` okuyan bileşenler için ortak gövde okuyucu (HTML/boş hata gövdesi okunur mesaja çevrilir).
- `docs/REACT_TO_VUE.md`: React kaynağından çevrim kuralları.
- `docs/FIGMA_UI.md`: Figma hedef arayüzü (K169) ve API karşılığı olmayan öğeleri pasif gösterme kuralları.

Hesap ve panel sayfaları istemcide render edilir (`nuxt.config.ts` → `routeRules`). `/`, `/servis/[id]`, `/talep`, `/hakkinda` sunucuda da render edilir.

## Ortam değişkenleri

| Değişken | Varsayılan | İş |
|---|---|---|
| `NUXT_PUBLIC_APP_MODE` | `demo` | `live` gerçek API'yi kullanır |
| `NUXT_PUBLIC_API_ORIGIN` | — | Canlı modda zorunlu, yalın https origin |
| `NUXT_PUBLIC_PORTAL_ORIGIN` | boş | İşletme portalı. Boşsa işletme bağlantıları pasif |
| `NUXT_PUBLIC_SITE_ORIGIN` | boş | Canonical, Open Graph ve sitemap adresi |
| `NUXT_PUBLIC_INDEXING_ENABLED` | `false` | `true` olmadan `robots.txt` her şeyi kapatır, sayfalar `noindex`, sitemap 404 |
| `NUXT_PUBLIC_LEGAL_PAGES_ENABLED` | `false` | `/yasal/*` taslak iskeletleri. Hukuk onayı yok; açılsa da metin değil "taslak" uyarısı gösterilir |

Origin değerleri yalın olmalıdır (yol, kullanıcı bilgisi yok); https dışı yalnız `localhost`, `127.0.0.1`, `*.localhost`, `*.test` için kabul edilir, aksi halde boş sayılır.

## Güvenlik başlıkları ve SEO

Her yanıtta `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`; token bağlantılı sayfalarda `no-referrer`. Üretim derlemesinde HTML yanıtlarına `Content-Security-Policy` eklenir (`server/plugins/security-headers.ts`, `app/lib/csp.ts`): `connect-src` ve `img-src` yalnız kendi origin ve canlı API, harita anahtarı varsa Google Maps origin'leri; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. Nuxt çalışma zamanı yapılandırmasını nonce'suz satır içi script olarak yazdığı için `script-src` içinde `'unsafe-inline'` kalır; nonce için ayrı bir modül kararı gerekir. HSTS barındırma/edge katmanına bırakıldı.

`/`, `/hakkinda`, `/servis/[id]` sayfaları başlık, açıklama, canonical ve Open Graph üretir. İşletme profili yalnız API'nin verdiği alanlarla `AutoRepair` JSON-LD yazar; puan yazılmaz, örnek işletmelere ve kullanılamayan profillere `noindex` verilir. Sitemap yalnız statik herkese açık sayfaları içerir; işletme profilleri listelenmez (liste ucu yok, katalog topluca dağıtılmaz).

## Kapalı kalanlar

İşletme alanı ayrı bir projeye taşınacak (K184). `/isletme` ve `/isletme/giris` rotası üretilmez, `nuxt.config.ts` içindeki `ignore` listesi `app/pages/isletme*` dosyalarını dışarıda bırakır; bu dosyalar ve yalnız onların kullandığı bileşenler kaynak olarak durur. Üst menü, alt bilgi, ana sayfa, profil, hata ekranı ve `/bildirimler` içindeki işletme bağlantıları `NUXT_PUBLIC_PORTAL_ORIGIN` doluysa portala gider, boşsa pasiftir.

Web taleplerinin (web-01…web-17) durumu ve kesin sözleşmeleri `docs/API_USAGE.md` içindedir. Reddedilen kısımlar pasif kalır: rehber kartları; nakit, taksit, olanak ve saat filtreleri ile filtre sayıları; "Faydalı" oyu; konum inceleme; mükerrer birleştirme; "Bu bölgede ara". Yeni API alanları `app/lib/search-response.ts`, `member-api.ts` ve `admin-api.ts` ile okunur; `packages/core` katı şemalarına eklenmez. Bu uçların API kodu hazır, ama canlıya alınmadı; canlıya alınmadan web yayınlanırsa yeni uçlar 404 ya da 400 döner.

Push (`app/lib/push-browser.ts`, `app/workers/push-worker.ts`, `public/push-worker.js`) ve App Check (`app/lib/brand-app-check.ts`) için yeni hedef kararlaştırılmadı. Bayrakları kapalıdır ve bu yüzden `firebase` paketi yalnız bu ikisi için durur; Firebase Auth kullanılmaz.
