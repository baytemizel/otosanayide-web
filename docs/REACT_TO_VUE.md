# apps/web → Vue 3 çevrim kuralları

Kaynak: `apps/web/src` (React/Next). Hedef: bu repo (Nuxt 4, `app/`). Görünüm, metin, akış ve istemci doğrulamaları değişmez. Bu bir çevrimdir; yeniden tasarım, yeni özellik veya temizlik değildir.

## Dosya

- Kaynak bileşen başına bir `app/components/PascalCase.vue`. Dosyadaki her dışa aktarılan veya iç bileşen ayrı `.vue` olur (`reminder-options.tsx` → `ReminderOptions.vue`, `ReminderActions.vue`). Çok küçük iç bileşenler de ayrı dosyadır.
- Bileşen olmayan dışa aktarımlar (sabit, yardımcı, tip) `app/lib/<kaynak-adı>-helpers.ts` içine.
- `<script setup lang="ts">` ve `<template>`. Bileşenleri (`~/components/X.vue`), composable'ları (`~/composables/useApp` …) ve `vue` temel işlevlerini açıkça içe aktar. `useRoute`, `useRouter`, `NuxtLink`, `useHead` Nuxt'tan otomatik gelir.
- Yalnız sana verilen dosyaları yaz. `node_modules`, `package.json`, `app/lib` altındaki temel dosyalar, başka bileşenler değişmez. Paket kurma, derleme veya sunucu çalıştırma.

## Korunacaklar (kesin)

- Her metin, `i18nT("…")`/`t('…')` çağrıları, sondaki boşluklar dahil birebir. Sınıf adları, DOM yapısı, aria nitelikleri, `role`, form alan adları, sıra aynı.
- `accountGuard`, `accountJson`, oturum çiti kontrolleri, `let cancelled/stop` iptal bayrakları, okuma/yazma kapıları, Zod ayrıştırıcıları, `redirect:'error'`, `cache:'no-store'`, zaman aşımları, hata mesajları ve kontrol sırası aynı.
- Kullanıcı girdisini HTML olarak basma. `dangerouslySetInnerHTML` yoksa `v-html` yok.

## Eşleme

| React | Vue |
|---|---|
| `const {t:i18nT,locale,localeTag}=useLocale()` | Aynı satır (`~/composables/useLocale`). Şablonda `i18nT(...)`, script içinde `locale.value`, `localeTag.value` |
| `const {user,demo,notify}=useApp()` | `const app=useApp()` (`~/composables/useApp`). Her yerde `app.user`, `app.demo`, `app.data`, `app.ready`, `app.member`, `app.notify(...)`. Durumu üst düzeyde parçalama; fonksiyon içinde `const user=app.user` serbest |
| `useState(x)` | `ref(x)`; şablon dışı `.value`. Nesne/dizi için de `ref` |
| `useRef(x)` (DOM dışı) | düz `let` |
| `useRef<HTMLElement>` (DOM) | `useTemplateRef<HTMLElement>('ad')` + `ref="ad"` |
| `useEffect(fn,[a,b])` | `useClientEffect(()=>[a.value,b.value],fn)` (`~/composables/useClientEffect`). Temizlik fonksiyonunu aynen döndür. SSR'da çalışmaz, derin eşitlik yapmaz; React gibidir. Kaynaktaki bağımlılık listesini birebir koru. `[]` → `()=>[]` |
| `useMemo` | `computed` |
| `useCallback` | düz fonksiyon |
| `useId` | `useId` (`vue`) |
| `{children}` | `<slot/>` |
| Prop | `defineProps<{...}>()`, varsayılan için `withDefaults`. Callback prop'ları (`onSave`, `onChange` …) aynı adla `defineProps` içinde tut, üst bileşende `:onSave="fn"` ile geçir. `emit` kullanma; kaynak dönen Promise'i bekliyor |
| `key={x}` | `:key="x"` (durum sıfırlayan remount dahil) |
| `{a&&<X/>}`, `a?<X/>:<Y/>` | `v-if` / `v-else` (`<template>` ile) |
| Erken `return <X/>` | Şablonda `v-if`/`v-else-if` zinciri |
| `.map` | `v-for` + `:key` |
| `className`, `htmlFor`, `readOnly`, `autoComplete`, `maxLength`, `minLength`, `tabIndex`, `colSpan` | `class`, `for`, `readonly`, `autocomplete`, `maxlength`, `minlength`, `tabindex`, `colspan` |
| `style={{a:1}}` | `:style="{a:1}"` |
| `onClick`, `onSubmit` | `@click`, `@submit` |
| Metin alanında `onChange` | `@input` (React her tuşta çalıştırır) |
| Select/checkbox/radio/file `onChange` | `@change` |
| `value={s} onChange=…` (kontrollü) | Basitse `v-model`; yan etki varsa `:value` + `@input`/`@change` |
| `defaultValue={x}` (dinamik, FormData alanı) | `v-default-value="x"` (`import {vDefaultValue} from '~/lib/directives'`). **`:value` kullanma**: Vue her render'da yeniden yazar ve kullanıcının girdisini siler. Sabit metin ise düz `value="x"` |
| `defaultChecked={x}` | `v-default-checked="x"` (`vDefaultChecked`) |
| `<Link href>` | `<NuxtLink :to>` veya `to="…"`; `className`→`class` |
| `usePathname()`, `useSearchParams()` | `useRoute().path`, `useRoute().query` |
| `useRouter().push/replace/refresh` | `useRouter().push/replace`; `refresh` → `refreshNuxtData()` |
| `lucide-react` | `@lucide/vue`, `<ArrowRight :size="18"/>`. İkon yeni sürümde yoksa en yakın eşdeğeri seç ve raporla |
| Şablonda yan yana `{a}{b}` | `{{ a }}{{ b }}` aynı satırda, araya boşluk koyma |

## API ve ortam

- `fetch('/api/…',init)` → `apiFetch('/api/…',init)` (`~/lib/api`). `init` aynen kalır. `credentials`, `Accept-Language` ve 401 yenilemesi `apiFetch` içindedir; elle ekleme. Yeni özel başlık ekleme.
- `packages/core` istemci seçeneklerinde `origin:location.origin` / `window.location.origin` → `origin:apiOrigin()`. Seçenek tipi `request?:typeof fetch` ise `request:apiFetch` de ekle (dil ve 401 için). `typeof window==='undefined'?'':…` koruması varsa kalsın.
- `<img src={`/api/…`}>` → `:src="apiUrl(`/api/…`)"`.
- API dışı `fetch` (blob, data, harita) değişmez.
- `../../../../packages/core/x` ve `@otosanayide/core` → `@otosanayide/core/x` ve `@otosanayide/core`.
- `@/lib/x` → `~/lib/x`.
- `process.env.NEXT_PUBLIC_*` → `publicEnv().*` (`~/lib/env`): `NEXT_PUBLIC_GOOGLE_MAPS_KEY`→`googleMapsKey`, `BUSINESS_PHOTOS_ENABLED`→`businessPhotosEnabled` (boolean), `PUSH_ENABLED`→`pushEnabled` (boolean), `BRAND_SERVING_ENABLED`→`brandServingEnabled` (boolean). `==='true'` karşılaştırmasını kaldır.
- `demoMode` değeri → `demoMode()` (`~/lib/env`).
- Sunucu içe aktarımı (`packages/server`, `firebase-admin`, `*-server`) istemciye girmez; bulursan raporla.
- `user.getIdToken()`, `user.uid`, `user.email`, `user.emailVerified` aynı çalışır.

## SSR

`/`, `/servis/[id]`, `/talep`, `/hakkinda` sunucuda da render edilir. Render sırasında `window`, `document`, `localStorage` okuma; kaynakta koruması olanı koru, tarayıcı işini `useClientEffect` veya olay işleyicisine bırak.

## Sonuç

Sonuç raporunda yalnız şunlar olsun (en çok 15 satır): yazılan dosya sayısı, kaynaktan sapmalar, değiştirilen ikonlar, bulunan API/sunucu bağımlılıkları. Dosya içeriği yazma.
