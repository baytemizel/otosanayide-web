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
| `npm test` | API, oturum ve store birim testleri |
| `npm run test:core` | `packages/core` testlerinin bu repoya düşen bölümü |

## Yapı

- `app/lib/api.ts`: tek API adresi, CORS kimlik kuralı, `Accept-Language`, 401 sonrası tek yenileme.
- `app/lib/session.ts`: oturum servisi. Erişim jetonu yalnız bellekte durur. Yenileme sekme içinde tek uçuşlu, sekmeler arasında Web Locks ile tekildir; sonuç BroadcastChannel ile paylaşılır.
- `app/stores/app.ts`: hesap verisi ve oturum çiti (Pinia).
- `app/lib/server-read.ts`: SSR'da işletme okuma.
- `docs/REACT_TO_VUE.md`: React kaynağından çevrim kuralları.

Hesap ve panel sayfaları istemcide render edilir (`nuxt.config.ts` → `routeRules`). `/`, `/servis/[id]`, `/talep`, `/hakkinda` sunucuda da render edilir.

## Kapalı kalanlar

Push (`app/lib/push-browser.ts`, `app/workers/push-worker.ts`, `public/push-worker.js`) ve App Check (`app/lib/brand-app-check.ts`) için yeni hedef kararlaştırılmadı. Bayrakları kapalıdır ve bu yüzden `firebase` paketi yalnız bu ikisi için durur; Firebase Auth kullanılmaz.
