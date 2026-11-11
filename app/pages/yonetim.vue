<script setup lang="ts">
import {computed, ref} from 'vue';
import {Award, Bell, BookCheck, Camera, ChartColumn, CreditCard, FileText, Flag, History, House, Info, LayoutGrid, LockKeyhole, MapPin, Megaphone, Merge, MessageSquare, Power, Scale, Search, ShieldCheck, Tags, ToggleRight, TriangleAlert, Upload} from '@lucide/vue';
import AdTariffs from '~/components/AdTariffs.vue';
import AdminExportQueue from '~/components/AdminExportQueue.vue';
import AdminFlags from '~/components/AdminFlags.vue';
import AdminOverview from '~/components/AdminOverview.vue';
import BusinessReportQueue from '~/components/BusinessReportQueue.vue';
import {contractReady} from '~/lib/contract';
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
import PanelShell from '~/components/PanelShell.vue';
import PaymentCases from '~/components/PaymentCases.vue';
import PrivacyAdmin from '~/components/PrivacyAdmin.vue';
import ReplyModeration from '~/components/ReplyModeration.vue';
import ReviewModeration from '~/components/ReviewModeration.vue';
import ReviewPhotoModeration from '~/components/ReviewPhotoModeration.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import type {PanelNavItem} from '~/lib/panel';

const {t: i18nT} = useLocale();
const app = useApp();
const tab = ref('Veri kalitesi');
const uid = computed(() => app.user?.uid ?? 'guest');

/** Tab values are the source's; labels and grouping follow the Figma sidebar. */
const nav: PanelNavItem[] = [
  {section: 'Operasyon'},
  {value: 'Özet', label: 'Özet', icon: LayoutGrid},
  {value: 'İşletmeler', label: 'İşletmeler', icon: House},
  {value: 'Veri kalitesi', label: 'İçe aktarma', icon: Upload},
  {value: 'Mükerrer birleştirme', label: 'Mükerrer birleştirme', icon: Merge},
  {value: 'Konum incelemesi', label: 'Konum inceleme', icon: MapPin},
  {value: 'Katalog yayını', label: 'Katalog yayını', icon: BookCheck},
  {value: 'Kategoriler', label: 'Kategoriler', icon: Tags},
  {section: 'Güven'},
  {value: 'Başvurular', label: 'Başvurular', icon: FileText},
  {value: 'Sahiplik ihtilafları', label: 'Sahiplik ihtilafları', icon: Scale, passive: true},
  {value: 'Yorumlar ve fotoğraflar', label: 'İçerik kuyruğu', icon: MessageSquare},
  {value: 'Yanlış bilgi bildirimleri', label: 'Yanlış bilgi bildirimleri', icon: Flag},
  {value: 'İtirazlar', label: 'İtirazlar', icon: Flag, passive: true},
  {value: 'İşletme fotoğrafları', label: 'İşletme fotoğrafları', icon: Camera},
  {value: 'Veri talepleri', label: 'Veri talepleri', icon: ShieldCheck},
  {section: 'Ticari'},
  {value: 'Reklamlar', label: 'Kampanya onayı', icon: Megaphone},
  {value: 'Reklam Tarifeleri', label: 'Envanter ve tarife', icon: ChartColumn},
  {value: 'Marka Sponsorlukları', label: 'Marka Sponsorlukları', icon: Award},
  {value: 'Ödemeler', label: 'Ödeme ve iade', icon: CreditCard},
  {section: 'Sistem'},
  {value: 'Hizmet aktivasyonu', label: 'Hizmet aktivasyonu', icon: Power},
  {value: 'Özellik bayrakları', label: 'Özellik bayrakları', icon: ToggleRight},
  {value: 'Bildirimler', label: 'Bildirimler', icon: Bell},
  {value: 'Güvenlik olayları', label: 'Güvenlik olayları', icon: TriangleAlert, passive: true},
  {value: 'İşlem kayıtları', label: 'İşlem kayıtları', icon: History},
];
const titles: Record<string, string> = {Özet: 'Operasyon özeti', 'Mükerrer birleştirme': 'Katalog'};
const title = computed(() => titles[tab.value] ?? nav.find((item): item is Extract<PanelNavItem, {value: string}> => 'value' in item && item.value === tab.value)?.label ?? tab.value);
const accountName = computed(() => (app.demo ? i18nT('Önizleme hesabı') : (app.user?.email?.split('@')[0] ?? '')));
const initials = computed(() => accountName.value.slice(0, 2).toLocaleUpperCase('tr-TR'));
const select = (value: string) => {
  tab.value = value;
};

const overviewKpis = ['Katalog kaydı', 'Bekleyen başvuru', 'İçerik kuyruğu', 'Konum inceleme', 'Ödeme incelemesi'];
const importKpis = ['Son içe aktarma', 'Yeni kayıt', 'Mükerrer adayı', 'Yayın'];
const locationRows = ['Kaynak', 'Sorun', 'Mesafe farkı', 'Adres metni', 'Saha teyidi'];
const flags = [
  {key: 'quotes.enabled', label: 'Teklif alma', scope: 'Şube bazlı'},
  {key: 'appointments.enabled', label: 'Randevu', scope: 'Şube bazlı'},
  {key: 'ads.payments', label: 'Reklam ödemesi', scope: 'Global'},
  {key: 'ai.review_assist', label: 'AI moderasyon yardımı', scope: 'Global'},
  {key: 'push.delivery', label: 'Push gönderimi', scope: 'Global'},
  {key: 'catalogue.publish', label: 'Katalog yayını', scope: 'İl bazlı'},
];
</script>

<template>
  <PanelShell heading="Yönetim" :context="i18nT('Platform operasyonu')" :title="i18nT(title)" :crumbs="i18nT('Yönetim')" :items="nav" :active="tab" :onSelect="select">
    <template #actions>
      <button type="button" class="ds-iconbtn ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')" :aria-label="i18nT('Bildirimler')"><Bell :size="18"/></button>
      <span v-if="initials" class="ds-avatar" aria-hidden="true">{{ initials }}</span>
    </template>

    <div class="ds-note"><LockKeyhole class="ds-i" :size="16"/>{{ app.demo ? i18nT("Yönetim önizlemesi. Veri kalitesi bölümünde gerçek kaynakların yalnızca toplu raporu bulunur; ham kayıtlar ve yönetim işlemleri açık değildir.") : i18nT("Yönetim verileri için ayrıcalıklı hesap ve sunucu doğrulaması gerekir.") }}</div>

    <BusinessPhotoModeration v-if="tab === 'İşletme fotoğrafları'" :key="uid"/>
    <template v-else-if="tab === 'Veri talepleri'">
      <PrivacyAdmin :key="uid"/>
      <AdminExportQueue v-if="contractReady.adminV2" :key="`exports-${uid}`"/>
    </template>
    <BusinessReportQueue v-else-if="tab === 'Yanlış bilgi bildirimleri'" :key="`reports-${uid}`"/>
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

    <!-- Y01: no aggregate API; labels only, never sample figures. -->
    <AdminOverview v-else-if="tab === 'Özet' && contractReady.adminV2" :key="`overview-${uid}`"/>
    <template v-else-if="tab === 'Özet'">
      <div class="ds-note info"><Info class="ds-i" :size="16"/>{{ i18nT("Canlı operasyon bağlantısı bekleniyor.") }}</div>
      <div class="kpis five">
        <div v-for="k in overviewKpis" :key="k" class="ds-kpi ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><div class="ds-small ds-muted">{{ i18nT(k) }}</div></div>
      </div>
      <div class="split">
        <section class="ds-card" style="overflow:hidden">
          <div class="ds-row ds-sb ds-pad"><h3 style="margin:0">{{ i18nT("İş kuyruğu") }}</h3><span class="ds-small ds-b ds-orange ds-passive" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Tümü") }}</span></div>
          <div class="ds-table-wrap">
            <table class="ds-table">
              <thead><tr><th>{{ i18nT("Tür") }}</th><th>{{ i18nT("Kayıt") }}</th><th>{{ i18nT("Durum") }}</th><th>{{ i18nT("Bekleme") }}</th></tr></thead>
              <tbody><tr><td colspan="4" class="ds-muted">{{ i18nT("Canlı operasyon bağlantısı bekleniyor.") }}</td></tr></tbody>
            </table>
          </div>
        </section>
        <section class="ds-card ds-pad24 ds-col ds-g12 ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
          <h3 style="margin:0">{{ i18nT("İl bazlı katalog") }}</h3>
          <div class="ds-xs ds-muted">{{ i18nT("Kayıt sayısı yayınlanmış işletme sayısı değildir.") }}</div>
        </section>
      </div>
    </template>

    <!-- Y04: no location review API; the map and pins stay empty until a record exists. -->
    <template v-else-if="tab === 'Konum incelemesi'">
      <div class="ds-note info"><Info class="ds-i" :size="16"/><div class="ds-col ds-g4 ds-f1"><strong>{{ i18nT("Canlı operasyon bağlantısı bekleniyor.") }}</strong><span>{{ i18nT("Burada sahte başvuru onaylanmaz, ödeme oluşturulmaz veya kullanıcı yetkisi verilmez.") }}</span></div></div>
      <div class="split">
        <div class="ds-mapbg map ds-passive" aria-disabled="true" :title="i18nT('Yakında')"/>
        <section class="ds-card ds-pad24 ds-col ds-g12">
          <h3 style="margin:0">{{ i18nT("Kayıt seçilmedi") }}</h3>
          <div v-for="row in locationRows" :key="row" class="kv ds-small ds-muted ds-passive" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT(row) }}</div>
          <div class="ds-row ds-wrap ds-g8">
            <button type="button" class="ds-btn n sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Önerileni onayla") }}</button>
            <button type="button" class="ds-btn s sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Adres aramasıyla yayınla") }}</button>
            <button type="button" class="ds-btn d sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Pini reddet") }}</button>
          </div>
          <div class="ds-xs ds-muted">{{ i18nT("Resmî beyan otomatik doğrulanmış pin sayılmaz. Doğrulanmamış kayıt “en yakın” sıralamasına katılmaz.") }}</div>
        </section>
      </div>
    </template>

    <!-- Y05: no merge API. The import report's real numbers live on the İçe aktarma tab. -->
    <template v-else-if="tab === 'Mükerrer birleştirme'">
      <div class="ds-note info"><Info class="ds-i" :size="16"/>{{ i18nT("Canlı operasyon bağlantısı bekleniyor.") }}</div>
      <div class="kpis four">
        <div v-for="k in importKpis" :key="k" class="ds-kpi ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><div class="ds-small ds-muted">{{ i18nT(k) }}</div></div>
      </div>
      <section class="ds-card" style="overflow:hidden">
        <div class="ds-row ds-sb ds-wrap ds-g12 ds-pad">
          <h3 style="margin:0">{{ i18nT("Mükerrer grubu") }}</h3>
          <div class="ds-row ds-wrap ds-g10">
            <button type="button" class="ds-btn s sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Farklı işletmeler") }}</button>
            <button type="button" class="ds-btn n sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><Merge :size="15"/>{{ i18nT("Seçilileri birleştir") }}</button>
          </div>
        </div>
        <div class="ds-table-wrap">
          <table class="ds-table">
            <thead><tr><th></th><th>{{ i18nT("Kayıt") }}</th><th>{{ i18nT("Adres") }}</th><th>{{ i18nT("Telefon") }}</th><th>{{ i18nT("Öneri") }}</th></tr></thead>
            <tbody><tr><td colspan="5" class="ds-muted">{{ i18nT("Canlı operasyon bağlantısı bekleniyor.") }}</td></tr></tbody>
          </table>
        </div>
      </section>
      <div class="ds-note ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><History class="ds-i" :size="16"/>{{ i18nT("Birleştirmede eski kimlikler yönlendirme olarak korunur; yorum ve geçmiş kaybolmaz. İşlem kayda alınır ve geri alınabilir.") }}</div>
    </template>

    <!-- Y06: no flag API; the current state is unknown, so no switch claims on or off. -->
    <AdminFlags v-else-if="tab === 'Özellik bayrakları' && contractReady.adminV2" :key="`flags-${uid}`"/>
    <template v-else-if="tab === 'Özellik bayrakları'">
      <div class="ds-note info"><Info class="ds-i" :size="16"/>{{ i18nT("Canlı operasyon bağlantısı bekleniyor.") }}</div>
      <div class="ds-note warn ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><TriangleAlert class="ds-i" :size="16"/>{{ i18nT("Bayrak arayüzde düğmeyi gizlemekle kalmaz; koşullar sunucuda uygulanır. Değişiklikler işlem kaydına yazılır.") }}</div>
      <section class="ds-card" style="overflow:hidden">
        <div class="ds-table-wrap">
          <table class="ds-table">
            <thead><tr><th>{{ i18nT("Bayrak") }}</th><th>{{ i18nT("Kapsam") }}</th><th>{{ i18nT("Durum") }}</th><th>{{ i18nT("Son değişiklik") }}</th></tr></thead>
            <tbody>
              <tr v-for="f in flags" :key="f.key">
                <td><div class="ds-b">{{ f.key }}</div><div class="ds-xs ds-muted">{{ i18nT(f.label) }}</div></td>
                <td>{{ i18nT(f.scope) }}</td>
                <td><span class="ds-switch ds-passive" style="display:block" role="img" aria-disabled="true" :aria-label="i18nT('Yakında')" :title="i18nT('Yakında')"/></td>
                <td/>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <section v-else class="ds-card ds-pad24 ds-col ds-g12">
      <h3 style="margin:0">{{ i18nT(tab) }}</h3>
      <div class="ds-col ds-g8 ds-ac empty ds-muted">
        <ShieldCheck :size="40"/>
        <h3 style="margin:0;color:#10243a">{{ i18nT("Canlı operasyon bağlantısı bekleniyor.") }}</h3>
        <div class="ds-small">{{ i18nT("Burada sahte başvuru onaylanmaz, ödeme oluşturulmaz veya kullanıcı yetkisi verilmez.") }}</div>
      </div>
    </section>

    <div class="two">
      <section class="ds-card ds-pad ds-col ds-g8"><Search :size="20"/><h3 style="margin:0">{{ i18nT("İnceleme sırası") }}</h3><div class="ds-small ds-muted">{{ i18nT("Sahiplik kanıtı, mükerrer kayıt, kapsam ve konum tutarlılığı.") }}</div></section>
      <section class="ds-card ds-pad ds-col ds-g8"><LockKeyhole :size="20"/><h3 style="margin:0">{{ i18nT("Yetki ayrımı") }}</h3><div class="ds-small ds-muted">{{ i18nT("Moderasyon, finans ve sahiplik yönetimi ayrı yetkilerle çalışacak.") }}</div></section>
    </div>
  </PanelShell>
</template>

<style scoped>
.kpis {display: grid; gap: 16px;}
.kpis.five {grid-template-columns: repeat(5, minmax(0, 1fr));}
.kpis.four {grid-template-columns: repeat(4, minmax(0, 1fr));}
.split {display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 20px; align-items: start;}
.two {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px;}
.map {height: 420px; border-radius: 14px;}
.kv {padding: 8px 0; border-bottom: 1px solid #edf0f3;}
.empty {padding: 24px 0; text-align: center;}
@media (max-width: 1100px) {
  .kpis.five, .kpis.four {grid-template-columns: repeat(2, minmax(0, 1fr));}
  .split {grid-template-columns: minmax(0, 1fr);}
}
@media (max-width: 760px) {
  .two {grid-template-columns: minmax(0, 1fr);}
  .map {height: 260px;}
}
@media (max-width: 480px) {
  .kpis.five, .kpis.four {grid-template-columns: minmax(0, 1fr);}
}
</style>
