# Web istemcisinin API kullanımı

Tarih: 11 Kasım 2026 (3. tur güncellemesi dahil). Kaynak: istemci kodu (`app/**`, `packages/core/*.ts`; `app/pages/isletme*` hariç) ve API deposunun `docs/openapi.yaml`, `docs/ROUTE_PARITY.md`, `docs/CLIENT_ACCESS.md`, `docs/AUTH_API.md` belgeleri. Tablo bir betikle çağrı yerlerinden çıkarıldı. Betiğin yanlış okuduğu çok satırlı çağrılar elle düzeltildi. Gövde alanları yazma uçlarında API şemalarıyla (`app/Domain/Content/Schemas.php`, `AdminSchemas`, `AuthController`) tek tek karşılaştırıldı.

Bu bir yerel inceleme sonucudur; canlı API ile doğrulama değildir.

## Hata işleme kısaltmaları

| Kod | Anlamı |
|---|---|
| A | `app/lib/ads-client.ts`: 503 kapalı yanıtı, HTML veya boş hata gövdesi, 401/403 ve bozuk biçim okunur hataya çevrilir. Açık yanıt `packages/core` şemasıyla ya da çekirdekteki görünüm üreticisiyle denetlenir. |
| S | `app/lib/search-response.ts`: core arama ve işletme ayrıştırıcısı kullanılır. Ek alanlar ayrı okunur, bozuk tek kayıt atlanır. |
| O | `app/lib/session.ts`: `SessionRequestError(status)`. Ekran mesajı API metninden değil durum kodundan seçilir (`account-security.ts`). 401 yanıtında `/api/auth/*` yolları yenileme tetiklemez. |
| J | `packages/core/account-client.ts` `accountJson`: zaman aşımı, sınırlı gövde, 409/503 için sabit mesaj, ardından core ayrıştırıcısı. |
| C | `packages/core` içindeki istemci kendi şemasıyla okur. |
| Z | Yanıt web veya core Zod şemasıyla okunur. 3. turda eklenen istemciler (`member-api.ts`, `admin-api.ts`, `own-reviews.ts`, `business-report.ts`) `api-read.ts` üzerinden ads okuyucusunun kurallarını kullanır: 503, HTML veya boş hata gövdesi, 4xx metni ve bozuk biçim ayrı ele alınır. |
| E | `{error}` metni `app/lib/response-json.ts` ile okunur: hata yanıtında her zaman okunur bir mesaj vardır, JSON olmayan başarı yanıtı hata sayılır. Başarı gövdesi biçim denetimi bileşenin kendi alan erişimiyle sınırlıdır. |

## Uç × dosya × durum (142 satır)

| Method | Uç | OpenAPI | Parite | Web erişimi | Dosyalar (hata işleme) |
|---|---|---|---|---|---|
| POST | `/api/ad-events` | var | tamam | evet | `app/components/MeasuredAd.vue` (E) |
| GET | `/api/admin/ad-tariffs` | var | tamam | evet | `app/components/AdTariffs.vue` (A) |
| PATCH | `/api/admin/ad-tariffs` | var | tamam | evet | `app/components/AdTariffs.vue` (A) |
| GET | `/api/admin/brand-acceptance` | var | tamam | evet | `app/components/BrandAcceptance.vue` (A) |
| POST | `/api/admin/brand-acceptance` | var | tamam | evet | `app/components/BrandAcceptance.vue` (A) |
| GET | `/api/admin/brand-campaigns` | var | tamam | evet | `app/components/BrandCampaigns.vue` (A) |
| PATCH | `/api/admin/brand-campaigns` | var | tamam | evet | `app/components/BrandCampaigns.vue` (A) |
| GET | `/api/admin/brand-cancellation-history` | var | tamam | evet | `app/components/BrandCancellationHistory.vue` (Z) |
| GET | `/api/admin/brand-cancellation-queue` | var | tamam | evet | `app/components/BrandCancellationQueue.vue` (Z) |
| GET | `/api/admin/brand-cancellations` | var | tamam | evet | `app/components/BrandCancellation.vue` (Z), `app/components/BrandCancellationQueue.vue` (Z) |
| PATCH | `/api/admin/brand-capacities` | var | tamam | evet | `app/components/BrandReservations.vue` (A) |
| POST | `/api/admin/brand-media` | var | tamam | evet | `app/components/BrandImageEditor.vue` (A) |
| GET | `/api/admin/brand-metrics` | var | tamam | evet | `app/components/BrandMetricReport.vue` (A) |
| GET | `/api/admin/brand-orders` | var | tamam | evet | `app/components/BrandOrderPanel.vue` (A) |
| POST | `/api/admin/brand-orders` | var | tamam | evet | `app/components/BrandOrderPanel.vue` (A) |
| GET | `/api/admin/brand-payment-review` | var | tamam | evet | `app/components/BrandPaymentReview.vue` (Z) |
| PATCH | `/api/admin/brand-payment-review` | var | tamam | evet | `app/components/BrandReviewDecision.vue` (Z) |
| GET | `/api/admin/brand-preview` | var | tamam | evet | `app/components/BrandPreview.vue` (A) |
| GET | `/api/admin/brand-preview/image` | var | tamam | evet | `app/components/BrandPreview.vue` (A) |
| POST | `/api/admin/brand-quote` | var | tamam | evet | `app/components/BrandPricing.vue` (A), `app/components/BrandReservations.vue` (A) |
| GET | `/api/admin/brand-refund-review` | var | tamam | evet | `app/components/BrandRefundReview.vue` (Z) |
| PATCH | `/api/admin/brand-refund-review` | var | tamam | evet | `app/components/BrandRefundReview.vue` (Z) |
| DELETE | `/api/admin/brand-reservations` | var | tamam | evet | `app/components/BrandReservations.vue` (A) |
| GET | `/api/admin/brand-reservations` | var | tamam | evet | `app/components/BrandReservations.vue` (A) |
| POST | `/api/admin/brand-reservations` | var | tamam | evet | `app/components/BrandReservations.vue` (A) |
| GET | `/api/admin/brand-tariffs` | var | tamam | evet | `app/components/BrandPricing.vue` (A), `app/components/BrandReservations.vue` (A) |
| PATCH | `/api/admin/brand-tariffs` | var | tamam | evet | `app/components/BrandPricing.vue` (A) |
| GET | `/api/admin/business-changes` | var | tamam | evet | `app/components/BusinessChangeReview.vue` (E) |
| PATCH | `/api/admin/business-changes` | var | tamam | evet | `app/components/BusinessChangeReview.vue` (E) |
| GET | `/api/admin/business-photos` | var | tamam | evet | `app/components/BusinessPhotosModerationPage.vue` (J) |
| PATCH | `/api/admin/business-photos` | var | tamam | evet | `app/components/BusinessPhotosDecision.vue` (J) |
| GET | `/api/admin/business-reports` | var | yeni (parite dışı) | evet | `app/lib/admin-api.ts` (Z) |
| PATCH | `/api/admin/business-reports` | var | yeni (parite dışı) | evet | `app/lib/admin-api.ts` (Z) |
| GET | `/api/admin/catalogue` | var | tamam | evet | `app/components/CatalogueReview.vue` (E) |
| PATCH | `/api/admin/catalogue` | var | tamam | evet | `app/components/CatalogueReview.vue` (E) |
| GET | `/api/admin/catalogue/draft` | var | tamam | evet | `app/components/CatalogueDraftEditor.vue` (E) |
| PATCH | `/api/admin/catalogue/draft` | var | tamam | evet | `app/components/CatalogueDraftEditor.vue` (E) |
| GET | `/api/admin/catalogue/history` | var | tamam | evet | `app/components/CatalogueHistory.vue` (E) |
| POST | `/api/admin/claim-evidence` | var | tamam | evet | `app/components/ClaimEvidence.vue` (E) |
| GET | `/api/admin/claim-targets` | var | tamam | evet | `app/components/ClaimTargetEditor.vue` (E) |
| POST | `/api/admin/claim-targets` | var | tamam | evet | `app/components/ClaimTargetEditor.vue` (E) |
| GET | `/api/admin/claims` | var | tamam | evet | `app/components/ClaimReviewPanel.vue` (E) |
| PATCH | `/api/admin/claims` | var | tamam | evet | `app/components/ClaimReviewPanelReviewItem.vue` (E) |
| GET | `/api/admin/flags` | var | yeni (parite dışı) | evet | `app/lib/admin-api.ts` (Z) |
| GET | `/api/admin/notifications` | var | tamam | evet | `app/components/NotificationQueue.vue` (E) |
| PATCH | `/api/admin/notifications` | var | tamam | evet | `app/components/NotificationQueue.vue` (E) |
| GET | `/api/admin/overview` | var | yeni (parite dışı) | evet | `app/lib/admin-api.ts` (Z) |
| GET | `/api/admin/payment-cases` | var | tamam | evet | `app/components/PaymentCases.vue` (A) |
| PATCH | `/api/admin/payment-cases` | var | tamam | evet | `app/components/PaymentCases.vue` (A) |
| GET | `/api/admin/privacy` | var | tamam | evet | `app/components/PrivacyAdmin.vue` (J), `app/lib/admin-api.ts` (Z) |
| POST | `/api/admin/privacy` | var | tamam | evet | `app/components/PrivacyAdmin.vue` (J), `app/lib/admin-api.ts` (Z) |
| GET | `/api/admin/replies` | var | tamam | evet | `app/components/ReplyModeration.vue` (E) |
| PATCH | `/api/admin/replies` | var | tamam | evet | `app/components/ReplyModeration.vue` (E) |
| GET | `/api/admin/review-cases` | var | tamam | evet | `app/components/CaseModeration.vue` (E) |
| PATCH | `/api/admin/review-cases` | var | tamam | evet | `app/components/CaseModeration.vue` (E) |
| GET | `/api/admin/review-photos` | var | tamam | evet | `app/components/ReviewPhotoModeration.vue` (E) |
| PATCH | `/api/admin/review-photos` | var | tamam | evet | `app/components/ReviewPhotoModeration.vue` (E) |
| GET | `/api/admin/reviews` | var | tamam | evet | `app/components/ReviewModeration.vue` (E) |
| PATCH | `/api/admin/reviews` | var | tamam | evet | `app/components/ReviewModeration.vue` (E) |
| POST | `/api/admin/reviews/analyze` | var | tamam | evet | `app/components/ReplyModeration.vue` (E), `app/components/ReviewModeration.vue` (E) |
| POST | `/api/auth/email/change` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/email/resend` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/email/verify` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/login` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/logout` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| GET | `/api/auth/mfa` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/mfa/totp/confirm` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/mfa/totp/disable` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/mfa/totp/enroll` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/mfa/verify` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/password/change` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/password/forgot` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/password/reset` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/refresh` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| POST | `/api/auth/register` | var | yeni (parite dışı) | evet | `app/lib/session.ts` (O) |
| GET | `/api/brand-banners` | var | tamam | evet | `packages/core/brand-banner-client.ts` (C) |
| GET | `/api/brand-banners/image` | var | tamam | evet | `packages/core/brand-banner-client.ts` (C) |
| POST | `/api/brand-events` | var | tamam | evet | `app/composables/useBrandMeasurement.ts` (E) |
| GET | `/api/businesses/activation` | var | tamam | evet | `app/components/FeatureActivation.vue` (E), `packages/core/activation-client.ts` (J) |
| PATCH | `/api/businesses/activation` | var | tamam | evet | `app/components/FeatureActivation.vue` (E), `packages/core/activation-client.ts` (J) |
| GET | `/api/businesses/manage` | var | tamam | evet | `app/components/BusinessReplies.vue` (E), `app/components/Campaigns.vue` (A), `app/components/FeatureActivation.vue` (E), `app/components/ManagedBusinessProfile.vue` (E), `app/components/RequestBoard.vue` (E), `packages/core/business-profile-client.ts` (J) |
| PATCH | `/api/businesses/manage` | var | tamam | evet | `app/components/ManagedBusinessProfile.vue` (E), `packages/core/business-profile-client.ts` (J) |
| GET | `/api/businesses/photos` | var | tamam | evet | `packages/core/business-photos.ts` (J) |
| GET | `/api/businesses/photos/media` | var | tamam | evet | `app/components/BusinessPhotosPublicGallery.vue` (E), `app/components/BusinessVisualRemoteCover.vue` (E), `packages/core/public-review-photo-client.ts` (C) |
| GET | `/api/businesses/photos/public` | var | tamam | evet | `packages/core/business-photos.ts` (J) |
| POST | `/api/businesses/places` | var | tamam | evet | `packages/core/business-places.ts` (J) |
| GET | `/api/businesses/replies` | var | tamam | evet | `app/components/BusinessReplies.vue` (E) |
| PATCH | `/api/businesses/replies` | var | tamam | evet | `app/components/BusinessReplies.vue` (E), `packages/core/business-console-client.ts` (J) |
| POST | `/api/businesses/replies` | var | tamam | evet | `app/components/BusinessReplies.vue` (E), `packages/core/business-console-client.ts` (J) |
| GET | `/api/businesses/{id}` | var | yeni (parite dışı) | evet | `app/lib/server-read.ts` (S) |
| GET | `/api/businesses/{id}/availability` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| POST | `/api/businesses/{id}/reports` | var | yeni (parite dışı) | evet | `app/lib/business-report.ts` (Z) |
| GET | `/api/campaigns/metrics` | var | tamam | evet | `app/components/LiveCampaignMetrics.vue` (E) |
| GET | `/api/campaigns/reservation` | var | tamam | evet | `app/components/LiveCampaignBooking.vue` (E) |
| POST | `/api/campaigns/reservation` | var | tamam | evet | `app/components/LiveCampaignBooking.vue` (E) |
| GET | `/api/claims` | var | tamam | evet | `app/components/ClaimTracker.vue` (E) |
| PATCH | `/api/claims` | var | tamam | evet | `app/components/ClaimTracker.vue` (E) |
| GET | `/api/claims/evidence` | var | tamam | evet | `app/components/ClaimEvidence.vue` (E) |
| PATCH | `/api/claims/evidence` | var | tamam | evet | `app/components/ClaimEvidence.vue` (E) |
| DELETE | `/api/coverage/waitlist` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| GET | `/api/coverage/waitlist` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| POST | `/api/coverage/waitlist` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| GET | `/api/me` | var | tamam | evet | `app/stores/app.ts` (J) |
| PATCH | `/api/me` | var | tamam | evet | `app/stores/app.ts` (J) |
| POST | `/api/me` | var | tamam | evet | `app/stores/app.ts` (J) |
| GET | `/api/me/favorites` | var | tamam | evet | `packages/core/favorites-client.ts` (J) |
| GET | `/api/me/garage/lifecycle` | var | tamam | evet | `app/components/RecyclePanel.vue` (J) |
| POST | `/api/me/garage/lifecycle` | var | tamam | evet | `app/components/RecyclePanel.vue` (J) |
| GET | `/api/me/garage/migrate` | var | tamam | evet | `app/components/SharedGaragePanel.vue` (J) |
| POST | `/api/me/garage/migrate` | var | tamam | evet | `app/components/SharedGaragePanel.vue` (J) |
| DELETE | `/api/me/lists` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| GET | `/api/me/lists` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| PATCH | `/api/me/lists` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| POST | `/api/me/lists` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| GET | `/api/me/preferences` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| PATCH | `/api/me/preferences` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| GET | `/api/me/privacy` | var | tamam | evet | `app/components/PrivacyRequestsPanelBody.vue` (J) |
| POST | `/api/me/privacy` | var | tamam | evet | `app/components/PrivacyRequestsPanelBody.vue` (J) |
| GET | `/api/me/privacy/exports` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| PATCH | `/api/me/privacy/exports` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| POST | `/api/me/privacy/exports` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| POST | `/api/me/push` | var | tamam | evet | `packages/core/push-notifications.ts` (J) |
| GET | `/api/notifications` | var | tamam | evet | `app/components/NotificationInbox.vue` (E) |
| PATCH | `/api/notifications` | var | tamam | evet | `app/components/NotificationInbox.vue` (E) |
| POST | `/api/notifications/read-all` | var | yeni (parite dışı) | evet | `app/lib/notifications-read.ts` (Z) |
| POST | `/api/payments/checkout` | var | tamam | evet | `packages/core/hosted-checkout.ts` (J) |
| GET | `/api/requests` | var | tamam | evet | `app/components/RequestBoard.vue` (E), `packages/core/owner-requests-client.ts` (J), `packages/core/request-client.ts` (J) |
| PATCH | `/api/requests` | var | tamam | evet | `app/components/RequestBoard.vue` (E), `packages/core/owner-requests-client.ts` (J) |
| POST | `/api/requests` | var | tamam | evet | `app/components/RequestForm.vue` (Z) |
| GET | `/api/requests/messages` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| POST | `/api/requests/messages` | var | yeni (parite dışı) | evet | `app/lib/member-api.ts` (Z) |
| GET | `/api/review-cases` | var | tamam | evet | `app/components/MyCases.vue` (E) |
| POST | `/api/review-cases` | var | tamam | evet | `app/components/CaseButton.vue` (E), `packages/core/review-case-client.ts` (J) |
| GET | `/api/review-photos` | var | tamam | evet | `app/components/OwnReviewPhotos.vue` (E), `packages/core/own-review-photo-client.ts` (J) |
| PATCH | `/api/review-photos` | var | tamam | evet | `app/components/OwnReviewPhotos.vue` (E) |
| POST | `/api/review-photos` | var | tamam | evet | `app/components/OwnReviewPhotos.vue` (E) |
| GET | `/api/review-photos/media` | var | tamam | evet | `app/components/OwnReviewPhotos.vue` (E), `app/components/ReviewPhotoGallery.vue` (E), `app/components/ReviewPhotoModeration.vue` (E), `packages/core/public-review-photo-client.ts` (C) |
| GET | `/api/reviews` | var | tamam | evet | `app/components/Reviews.vue` (Z), `packages/core/public-reviews-client.ts` (C) |
| POST | `/api/reviews` | var | tamam | evet | `app/components/Reviews.vue` (Z), `packages/core/review-author-client.ts` (J) |
| GET | `/api/reviews/mine` | var | tamam | evet | `app/components/OwnReviewStatus.vue` (Z) |
| PATCH | `/api/reviews/mine` | var | tamam | evet | `app/components/OwnReviewStatus.vue` (Z), `packages/core/review-author-client.ts` (J) |
| GET | `/api/reviews/mine/all` | var | yeni (parite dışı) | evet | `app/lib/own-reviews.ts` (Z) |
| GET | `/api/search` | var | tamam | evet | `app/components/Discovery.vue` (S), `app/lib/api-demo.ts` (E), `packages/core/search-client.ts` (C) |

"Parite" sütununda `yeni (parite dışı)` değeri, uç `ROUTE_PARITY.md` kaynak listesinde değil ama `openapi.yaml` içinde olduğu anlamına gelir. Bunlar API-A'nın eklediği uçlardır: web-01/02/11, `businesses/{id}`, `auth/*`. "Web erişimi" sütunu `CLIENT_ACCESS.md` sütunudur.

## Bulgular ve yapılanlar

1. **Yol ve method:** İstemcinin çağırdığı her uç `openapi.yaml` içinde var. Tek istisna `GET /api/reviews/mine/all`; bu web-17 talebidir, `open` durumda ve `contractReady.ownReviewList=false` olduğu için çağrılmaz. `POST /api/auth/email/change` artık OpenAPI'de var, ama web-03 talebi hâlâ `open` olduğu için web bu ucu pasif tutuyor.
2. **Erişim:** `CLIENT_ACCESS.md` uyarınca web, kullandığı her uca erişebiliyor. Eşleşmeyen tek satır `auth/email/change`; bu satır matriste henüz yok.
3. **Gövde alanları:** Yorum düzenleme ve geri çekme, şikâyet ve itiraz, sahiplik mesajı, yönetim kararları (yorum, vaka, profil değişikliği, belge doğrulama, hedef eşleme, AI analizi), bildirim okundu işaretleme ve şifre değişimi API şemalarıyla birebir aynı. Uyumsuz alan bulunmadı.
4. **Auth kanalı** (AUTH_API.md güncel hâli): Tarayıcı her istekte `Origin` gönderdiği için web kanalıdır. Gövdede `refreshToken` beklenmez. Çerez yalnız `/api/auth/*` isteklerinde gider (`credentialsFor`). İstemcinin gönderdiği başlıklar (`Authorization`, `Content-Type`, `Accept`, `Accept-Language`, `X-Firebase-AppCheck`) WebCors `REQUEST_HEADERS` ile aynı. Web kodunda değiştirilecek bir fark yok. Şifre değişiminde yanlış şifre artık 401 değil 400 döner; bu yüzden yenileme döngüsü tetiklenmez.
5. **Düzeltilen sağlamlık açığı:** Bileşenlerin `await r.json(); if (!r.ok) throw Error(d.error)` kalıbı HTML veya boş hata gövdesinde "Unexpected token" gösteriyordu. Bu turda web rotalarına bağlı 21 bileşen `responseJson` ya da `ads-client` okuyucusuna geçirildi.
6. **Değiştirilmeyenler:**
   - Yalnız işletme alanının (portal) kullandığı bileşenler: `BusinessReplies`, `ClaimTracker`, `ManagedBusinessProfile`, `CampaignBooking`, `LiveCampaignBooking`. Bunlar portala taşınıyor (K184).
   - `packages/core/account-client.ts`: 503 için "Ortak garaj geçişi henüz etkin değil." metnini her `accountJson` çağrısında (ör. ödeme oturumu) gösteriyor. Bu core içindedir, dokunulmadı. `HostedCheckoutButton` yalnız genel hata gösterdiği için ekrana yansımıyor.

## 3. tur: kesinleşen sözleşmelere bağlananlar

API-A ikinci turu: web-01…web-17 taleplerinden 16'sı `done`, web-14 `rejected`. Bunların kısmen uygulananları web-06, web-15 ve web-16.

| Talep | Web'deki karşılığı | Kesin sözleşmeden fark |
|---|---|---|
| web-03 | `/hesabim` e-posta değişimi. Onaydan sonra `/giris/eposta-dogrula` sayfası oturumun kapandığını söyler. | Yanlış şifre 400, kod gerekiyorsa 403. |
| web-04 | S08 modalı açık. Yönetimde "Yanlış bilgi bildirimleri" sekmesi eklendi. | Anonim gönderim yok. Not reddedilirse API'nin 400 metni gösterilir. |
| web-05/07/08 | Arama v2: `v=2`, `sort`, `cursor`, `total`, `verifiedOwner`, `reviewSummary`, `openingHours`. Profil `?v=2` ile okunuyor. | `sort` değeri `reviews` yerine `most_reviewed`. `bbox` yok, "Bu bölgede ara" pasif kalıyor. Demo modda v2 anahtarları gönderilmiyor. |
| web-06 | Yalnız "Sadece doğrulanmış" filtresi bağlandı. | Nakit, taksit, olanak, hafta sonu ve açık şimdi filtreleri ile filtre sayıları **reddedildi**; ilgili satırlar pasif. |
| web-09 | `/hesabim` tercihleri bağlandı. Ürün duyurusu varsayılan kapalı; açılınca metin sürümü `product-news-2026-11` gönderiliyor. | Gönderim yazılmadı (`delivery: not_enabled`); ekran bunu söylüyor. |
| web-10 | `/hesabim` veri kopyası talebi ve iptali; yönetimde dışa aktarma kuyruğu. | Hazırlık elle yapılıyor, indirme yok. 428 (son 10 dakikada giriş şartı) ayrı mesajla gösteriliyor. |
| web-11 | Değişiklik yok (2. turda bağlanmıştı). | — |
| web-12 | Kapsam dışı iller seçicide ayrı grupta; "Açılınca haber ver" çalışıyor. | Bildirim gönderimi yok. |
| web-13 | Kaydedilenler'de adlı listeler; "Karşılaştırmayı kaydet". | — |
| web-15 | Talep yazışması, randevu gün/saat seçimi (`preferredSlot`), teklif kalemleri (`GET /api/requests?v=2`). | **"Faydalı" oyu reddedildi**, düğme pasif. Yazışma yolu `requests/messages?id=`. |
| web-16 | Yönetim özeti (kuyruk sayıları) ve salt okunur bayraklar. `business-changes?v=2` ile çalışma saati önerisi gösteriliyor. | **Konum inceleme ve mükerrer birleştirme reddedildi**; ilgili sekmeler pasif. |
| web-17 | `/yorumlarim` tam listeye bağlandı; kayıtlı işletmeleri tek tek sorma kaldırıldı. | — |
| web-14 | Rehber kartları pasif (**reddedildi**). | — |

Kesinleşen sözleşmelerdeki yeni alanların hiçbiri `packages/core` katı şemalarına sokulmadı. Hepsi web tarafındaki ayrı okuyucularla doğrulanıyor: `search-response.ts`, `member-api.ts`, `admin-api.ts`.
