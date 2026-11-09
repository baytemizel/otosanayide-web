<script setup lang="ts">
import {computed, ref} from 'vue';
import {LockKeyhole, Search, ShieldCheck} from '@lucide/vue';
import AdTariffs from '~/components/AdTariffs.vue';
import BrandCampaigns from '~/components/BrandCampaigns.vue';
import BrandCancellationQueue from '~/components/BrandCancellationQueue.vue';
import BrandPaymentReview from '~/components/BrandPaymentReview.vue';
import BusinessChangeReview from '~/components/BusinessChangeReview.vue';
import BusinessPhotoModeration from '~/components/BusinessPhotoModeration.vue';
import Campaigns from '~/components/Campaigns.vue';
import CaseModeration from '~/components/CaseModeration.vue';
import CatalogueReview from '~/components/CatalogueReview.vue';
import CategoryCatalogue from '~/components/CategoryCatalogue.vue';
import ClaimReviewPanel from '~/components/ClaimReviewPanel.vue';
import DataQuality from '~/components/DataQuality.vue';
import FeatureActivation from '~/components/FeatureActivation.vue';
import NotificationQueue from '~/components/NotificationQueue.vue';
import PaymentCases from '~/components/PaymentCases.vue';
import PrivacyAdmin from '~/components/PrivacyAdmin.vue';
import ReplyModeration from '~/components/ReplyModeration.vue';
import ReviewModeration from '~/components/ReviewModeration.vue';
import ReviewPhotoModeration from '~/components/ReviewPhotoModeration.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
const app = useApp();
const tab = ref('Veri kalitesi');
const uid = computed(() => app.user?.uid ?? 'guest');
const tabs = ['Veri kalitesi', 'Katalog yayını', 'Başvurular', 'İşletmeler', 'Hizmet aktivasyonu', 'Konum incelemesi', 'Veri talepleri', 'Bildirimler', 'Yorumlar ve fotoğraflar', 'İşletme fotoğrafları', 'Reklamlar', 'Reklam Tarifeleri', 'Marka Sponsorlukları', 'Ödemeler', 'Kategoriler', 'İşlem kayıtları'];
</script>

<template>
  <div class="dashboard" id="content">
    <aside class="sidebar">
      <h3>{{ i18nT("Yönetim") }}</h3>
      <button v-for="t in tabs" :key="t" :class="tab === t ? 'selected' : ''" @click="tab = t">{{ i18nT(t) }}</button>
    </aside>
    <div class="dashboard-content">
      <h1>{{ i18nT("Platform operasyonu.") }}</h1>
      <p class="lead">{{ i18nT("Her kararın bir kaydı, her kaydın bir sorumlusu.") }}</p>
      <div class="notice row"><LockKeyhole :size="22"/>{{ app.demo ? i18nT("Yönetim önizlemesi. Veri kalitesi bölümünde gerçek kaynakların yalnızca toplu raporu bulunur; ham kayıtlar ve yönetim işlemleri açık değildir.") : i18nT("Yönetim verileri için ayrıcalıklı hesap ve sunucu doğrulaması gerekir.") }}</div>
      <BusinessPhotoModeration v-if="tab === 'İşletme fotoğrafları'" :key="uid"/>
      <PrivacyAdmin v-else-if="tab === 'Veri talepleri'" :key="uid"/>
      <BrandCampaigns v-else-if="tab === 'Marka Sponsorlukları'" :key="uid"/>
      <template v-else-if="tab === 'Ödemeler'">
        <BrandCancellationQueue :key="`cancel-${uid}`"/>
        <BrandPaymentReview :key="`brand-${uid}`"/>
        <PaymentCases :key="uid"/>
      </template>
      <AdTariffs v-else-if="tab === 'Reklam Tarifeleri'" :key="uid"/>
      <Campaigns v-else-if="tab === 'Reklamlar'" admin :key="uid"/>
      <CatalogueReview v-else-if="tab === 'Katalog yayını'" :key="uid"/>
      <CategoryCatalogue v-else-if="tab === 'Kategoriler'"/>
      <FeatureActivation v-else-if="tab === 'Hizmet aktivasyonu'" admin :key="uid"/>
      <NotificationQueue v-else-if="tab === 'Bildirimler'" :key="uid"/>
      <DataQuality v-else-if="tab === 'Veri kalitesi' && app.demo"/>
      <ClaimReviewPanel v-else-if="tab === 'Başvurular'" :key="uid"/>
      <template v-else-if="tab === 'Yorumlar ve fotoğraflar'">
        <CaseModeration :key="`cases-${uid}`"/>
        <ReviewModeration :key="uid"/>
        <ReplyModeration :key="`reply-${uid}`"/>
        <ReviewPhotoModeration :key="`photos-${uid}`"/>
      </template>
      <BusinessChangeReview v-else-if="tab === 'İşletmeler'" :key="uid"/>
      <section v-else class="panel">
        <h2>{{ i18nT(tab) }}</h2>
        <div class="inline-empty">
          <ShieldCheck :size="40"/>
          <h3>{{ i18nT("Canlı operasyon bağlantısı bekleniyor.") }}</h3>
          <p>{{ i18nT("Burada sahte başvuru onaylanmaz, ödeme oluşturulmaz veya kullanıcı yetkisi verilmez.") }}</p>
        </div>
      </section>
      <div class="two-columns">
        <section class="panel"><Search/><h3>{{ i18nT("İnceleme sırası") }}</h3><p>{{ i18nT("Sahiplik kanıtı, mükerrer kayıt, kapsam ve konum tutarlılığı.") }}</p></section>
        <section class="panel"><LockKeyhole/><h3>{{ i18nT("Yetki ayrımı") }}</h3><p>{{ i18nT("Moderasyon, finans ve sahiplik yönetimi ayrı yetkilerle çalışacak.") }}</p></section>
      </div>
    </div>
  </div>
</template>
