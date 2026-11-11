<script setup lang="ts">
import {computed, ref} from 'vue';
import {BadgeCheck, Calendar, Check, ChevronLeft, ChevronRight, FileText, Flag, Heart, MapPin, MessageSquare, Navigation, Star} from '@lucide/vue';
import {categories, featureAvailable, type Business} from '@otosanayide/core';
import {locationSchema} from '@otosanayide/core/location';
import BusinessPublicGallery from '~/components/BusinessPublicGallery.vue';
import BusinessVisual from '~/components/BusinessVisual.vue';
import ContactMenu from '~/components/ContactMenu.vue';
import OpenStatus from '~/components/OpenStatus.vue';
import PortalLink from '~/components/PortalLink.vue';
import ReportBusinessDialog from '~/components/ReportBusinessDialog.vue';
import Reviews from '~/components/Reviews.vue';
import ServiceLocationCard from '~/components/ServiceLocationCard.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {contractReady} from '~/lib/contract';
import {weekdayName, weekRows} from '~/lib/opening-hours';
import type {BusinessExtras} from '~/lib/search-response';

const props = withDefaults(defineProps<{business: Business; extras?: BusinessExtras}>(), {extras: () => ({})});

const {t: i18nT, localeTag} = useLocale();
const reporting = ref(false);
const week = computed(() => (props.extras.openingHours ? weekRows(props.extras.openingHours) : null));
const app = useApp();
// Profile v2 brings the published summary with the page; the review list may refine it later.
const summary = ref<{count: number; average: number | null} | null>(props.extras.reviewSummary ? {...props.extras.reviewSummary} : null);
const activeTab = ref('content');
const tabs: {id: string; label: string; short?: string; wideOnly?: boolean}[] = [
  {id: 'content', label: 'Genel bakış', short: 'Genel'},
  {id: 'hizmetler', label: 'Hizmetler'},
  {id: 'deneyimler', label: 'Yorumlar'},
  {id: 'fotograflar', label: 'Fotoğraflar', wideOnly: true},
  {id: 'servis-konumu', label: 'Konum ve saatler', short: 'Konum'},
];

const saved = computed(() => app.data.favorites.includes(props.business.id));
const hasPhoto = computed(() => !!(props.business.image || props.business.coverPhotoId));
const categoryName = computed(() => categories.find(c => c.id === props.business.categories[0])?.name);
/** Same targets as ServiceLocationCard: a route only for a verified point, otherwise an address search. */
const directions = computed(() => {
  const b = props.business;
  if (b.sample) return null;
  const point = locationSchema.safeParse({latitude: b.latitude, longitude: b.longitude, address: b.address});
  if (b.coordinateStatus === 'verified' && point.success) return `https://www.google.com/maps/dir/?${new URLSearchParams({api: '1', destination: `${point.data.latitude},${point.data.longitude}`})}`;
  return `https://www.google.com/maps/search/?${new URLSearchParams({api: '1', query: [b.name, b.address, b.district, b.city].join(' ')})}`;
});
function answer(value?: boolean) {
  if (value === true) return {value: 'Evet', tone: 'ds-green'};
  if (value === false) return {value: 'Hayır', tone: 'ds-red'};
  return {value: 'Bilinmiyor', tone: 'ds-muted'};
}
/** Rows without a data field stay passive and show no value. */
const amenities = computed<{label: string; value?: string; tone?: string}[]>(() => [
  {label: 'Kart ile ödeme', ...answer(props.business.cardPayment)},
  {label: 'Taksit'},
  {label: 'Bekleme alanı'},
  {label: 'WC', ...answer(props.business.wc)},
  {label: 'Erişilebilir giriş'},
]);

function setSummary(value: {count: number; average: number | null}) {
  summary.value = value;
}

function toggle() {
  app.toggleFavorite(props.business.id).catch((e: Error) => app.notify(e.message));
}
</script>

<template>
  <div id="content" class="ds-container pf">
    <div id="fotograflar" class="pf-hero">
      <div class="pf-cover" :class="{bare:!hasPhoto}"><BusinessVisual :business="business" large/></div>
      <NuxtLink class="ds-iconbtn pf-fab pf-fab-l" to="/" :aria-label="i18nT('Keşfet')"><ChevronLeft :size="18"/></NuxtLink>
      <button class="ds-iconbtn pf-fab pf-fab-r" type="button" :aria-label="i18nT('Kaydet')" :aria-pressed="saved" @click="toggle"><Heart :size="18" :fill="saved?'currentColor':'none'"/></button>
      <BusinessPublicGallery :businessId="business.id" :sample="business.sample" :coverId="business.coverPhotoId"/>
    </div>

    <div class="pf-intro">
      <nav class="pf-crumbs" :aria-label="i18nT('Sayfa konumu')">
        <NuxtLink to="/">{{ i18nT('Keşfet') }}</NuxtLink>
        <ChevronRight :size="14" aria-hidden="true"/><span>{{ business.city }}</span>
        <ChevronRight :size="14" aria-hidden="true"/><span>{{ business.district }}</span>
        <template v-if="categoryName"><ChevronRight :size="14" aria-hidden="true"/><span>{{ i18nT(categoryName) }}</span></template>
      </nav>
      <div class="pf-head">
        <div class="pf-title">
          <div class="ds-row ds-g8 ds-wrap">
            <span v-if="business.ownership==='verified'" class="ds-badge ok"><BadgeCheck :size="13"/><span class="pf-wide">{{ i18nT('Yönetim yetkisi doğrulandı') }}</span><span class="pf-short">{{ i18nT('Doğrulanmış') }}</span></span>
            <span v-else-if="business.ownership==='unclaimed'" class="ds-badge neu">{{ i18nT('Sahiplenilmemiş profil') }}</span>
            <OpenStatus v-if="extras.openingHours" :openingHours="extras.openingHours"/>
            <span v-else-if="!business.hours" class="ds-badge neu">{{ i18nT('Çalışma saati bilinmiyor') }}</span>
          </div>
          <h1>{{ business.name }}</h1>
          <div class="pf-meta">
            <span class="ds-row ds-g6 ds-muted pf-address"><MapPin :size="16"/>{{ business.address }}, {{ business.district }} / {{ business.city }}</span>
            <span v-if="summary&&summary.count>0" class="ds-row ds-g8">
              <span class="ds-stars" aria-hidden="true"><Star v-for="n in 5" :key="n" :size="16" :fill="n<=Math.round(summary.average??0)?'currentColor':'none'"/></span>
              <strong>{{ summary.average?.toLocaleString(localeTag,{minimumFractionDigits:1,maximumFractionDigits:1}) }}</strong>
              <span class="ds-muted">{{ i18nT('{0} yorum',{'0':summary.count}) }}</span>
            </span>
            <span v-else-if="summary" class="ds-row ds-g8 ds-muted"><MessageSquare :size="16"/>{{ i18nT('Henüz yorum yok · İlk deneyimi sen paylaş') }}</span>
            <span v-else class="ds-row ds-g8 ds-muted"><MessageSquare :size="16"/>{{ i18nT('Müşteri deneyimleri aşağıda') }}</span>
          </div>
        </div>
        <div class="pf-actions">
          <ContactMenu :phone="business.phone" :name="business.name" :sample="business.sample"/>
          <a v-if="directions" class="ds-btn s lg" :href="directions" target="_blank" rel="noreferrer"><Navigation :size="18"/>{{ i18nT('Yol tarifi') }}</a>
          <button class="ds-btn s lg pf-save" type="button" :aria-pressed="saved" @click="toggle"><Heart :size="18" :fill="saved?'currentColor':'none'"/>{{ i18nT('Kaydet') }}</button>
          <NuxtLink v-if="featureAvailable(business,'quotes')" class="ds-btn n lg pf-wide-action" :to="`/talep?business=${business.id}&kind=quotes`"><FileText :size="18"/>{{ i18nT('Teklif iste') }}</NuxtLink>
          <NuxtLink v-if="featureAvailable(business,'appointments')" class="ds-btn s lg pf-wide-action" :to="`/talep?business=${business.id}&kind=appointments`"><Calendar :size="18"/>{{ i18nT('Randevu') }}</NuxtLink>
        </div>
      </div>
      <p v-if="business.sample" class="ds-note warn pf-sample">{{ i18nT('Bu bir örnek işletmedir. Görseller temsilidir; iletişim veya randevu oluşturulmaz.') }}</p>
    </div>

    <nav class="ds-tabs pf-tabs" :aria-label="i18nT('Profil bölümleri')">
      <a v-for="tab in tabs" :key="tab.id" :href="`#${tab.id}`" :class="[activeTab===tab.id?'on':'',tab.wideOnly?'pf-wide':'']" :aria-current="activeTab===tab.id?'location':undefined" @click="activeTab=tab.id"><span :class="tab.short?'pf-wide':''">{{ i18nT(tab.label) }}</span><span v-if="tab.short" class="pf-short">{{ i18nT(tab.short) }}</span></a>
    </nav>

    <div class="pf-grid">
      <div class="pf-main">
        <section id="hizmetler" class="ds-card pf-card pf-services">
          <h2 class="pf-h">{{ i18nT('Hizmetler') }}</h2>
          <div class="ds-row ds-g8 ds-wrap">
            <span v-for="s in business.services" :key="s" class="ds-chip line pf-service"><Check :size="14" class="ds-green"/>{{ i18nT(s) }}</span>
          </div>
          <h3 class="pf-sub">{{ i18nT('Beyan edilen marka uzmanlığı') }}</h3>
          <template v-if="business.brands.length">
            <div class="ds-row ds-g8 ds-wrap"><span v-for="b in business.brands" :key="b" class="ds-chip">{{ b }}</span></div>
            <p class="ds-xs ds-muted">{{ i18nT('Marka uzmanlığı işletme beyanıdır; yetkili servis anlamına gelmez.') }}</p>
          </template>
          <p v-else class="ds-xs ds-muted">{{ i18nT('Marka uzmanlığı henüz belirtilmedi.') }}</p>
        </section>
        <Reviews :key="business.id" :businessId="business.id" :businessName="business.name" :sample="business.sample" :onSummary="setSummary"/>
        <section class="pf-claim">
          <div class="ds-col ds-g4">
            <h2 class="pf-h">{{ i18nT('Bu işletme sizin mi?') }}</h2>
            <p class="ds-small ds-muted">{{ i18nT('Ücretsiz sahiplenin; bilgileri güncelleyin, yorumlara yanıt verin.') }}</p>
          </div>
          <PortalLink v-if="!business.sample" class="ds-btn p" target="claim" :business="business.id">{{ i18nT('Sahiplik başvurusu') }}</PortalLink>
          <span v-else class="ds-btn p ds-passive" aria-disabled="true" :title="i18nT('Örnek işletme')">{{ i18nT('Sahiplik başvurusu') }}</span>
        </section>
      </div>
      <aside class="pf-side">
        <ServiceLocationCard :business="business"/>
        <section class="ds-card ds-pad pf-side-card">
          <h2 class="pf-h">{{ i18nT('Çalışma saatleri') }}</h2>
          <table v-if="week" class="pf-week">
            <caption class="sr-only">{{ i18nT('Haftalık çalışma saatleri') }}</caption>
<tbody>
            <tr v-for="row in week" :key="row.day">
              <th scope="row">{{ weekdayName(row.day, localeTag) }}</th>
              <td>{{ row.intervals.length ? row.intervals.map(i => `${i.open}–${i.close}`).join(', ') : i18nT('Kapalı') }}</td>
            </tr>
            </tbody>
          </table>
          <p v-else-if="business.hours" class="ds-small pf-hours">{{ business.hours }}</p>
          <p v-else class="ds-small ds-muted">{{ i18nT('Çalışma saati henüz eklenmedi. Açık olduğu varsayılmaz.') }}</p>
        </section>
        <section v-if="business.cardPayment!=null||business.wc!=null" class="ds-card ds-pad pf-side-card">
          <h2 class="pf-h">{{ i18nT('Olanaklar ve ödeme') }}</h2>
          <template v-for="row in amenities" :key="row.label">
            <div v-if="row.value" class="pf-amenity"><span>{{ i18nT(row.label) }}</span><strong :class="row.tone">{{ i18nT(row.value) }}</strong></div>
            <div v-else class="pf-amenity ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><span>{{ i18nT(row.label) }}</span></div>
          </template>
        </section>
        <section class="ds-card ds-pad pf-side-card">
          <button v-if="contractReady.businessReports && !business.sample" type="button" class="pf-report ds-row ds-g8 ds-small ds-b" aria-haspopup="dialog" @click="reporting = true"><Flag :size="16"/>{{ i18nT('Yanlış bilgi bildir') }}</button>
          <span v-else class="ds-row ds-g8 ds-small ds-b ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><Flag :size="16"/>{{ i18nT('Yanlış bilgi bildir') }}</span>
          <p class="ds-xs ds-muted">{{ i18nT('Profil değişiklikleri eski/yeni değer ve zaman ile sürümlenir.') }}</p>
        </section>
      </aside>
    </div>
    <ReportBusinessDialog v-if="reporting" :businessId="business.id" :businessName="business.name" :onClose="() => (reporting = false)"/>
  </div>
</template>

<style scoped>
.pf {max-width: 1440px; padding-top: 24px; padding-bottom: 56px;}
.pf-week {width: 100%; border-collapse: collapse; font-size: 13px;}
.pf-week th {padding: 4px 0; font-weight: 400; color: #586879; text-align: left; text-transform: capitalize;}
.pf-week td {padding: 4px 0; text-align: right; font-weight: 700; color: #10243a;}
.pf-report {padding: 0; border: 0; background: none; color: #10243a; cursor: pointer;}
.pf p, .pf h1, .pf h2, .pf h3 {margin: 0;}
.pf-hero {position: relative; display: flex; flex-wrap: wrap; gap: 8px;}
.pf-cover {flex: 2 1 0; min-width: 0; height: 400px; border-radius: 16px; overflow: hidden;}
.pf-hero:has(.pg-side) .pf-cover {border-radius: 16px 0 0 16px;}
.pf-cover.bare {height: 300px;}
.pf-cover :deep(.profile-photo), .pf-cover :deep(.business-visual.large) {width: 100%; height: 100%; border-radius: 0;}
.pf-fab {display: none; position: absolute; top: 12px; z-index: 2; border-radius: 20px;}
.pf-fab-l {left: 12px;}
.pf-fab-r {right: 12px;}
.pf-intro {display: flex; flex-direction: column; gap: 12px; padding: 28px 0 20px;}
.pf-crumbs {display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; color: #586879;}
.pf-crumbs svg {flex: none;}
.pf-head {display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 20px 24px;}
.pf-title {flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; gap: 10px;}
.pf-title h1 {font-size: 46px; line-height: 1.05; letter-spacing: -.92px; overflow-wrap: anywhere;}
.pf-meta {display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px; font-size: 13px;}
.pf-actions {display: flex; flex-wrap: wrap; align-items: center; gap: 10px;}
.pf-short {display: none;}
.pf-tabs {margin-top: 24px;}
.pf-tabs a {color: #536276; text-decoration: none;}
.pf-tabs a.on {color: #10243a;}
.pf-tabs a:focus-visible {outline: 2px solid #2459b4; outline-offset: 2px;}
.pf-grid {display: flex; align-items: flex-start; gap: 32px; padding-top: 24px;}
.pf-main {flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 24px;}
.pf-side {flex: none; width: 420px; display: flex; flex-direction: column; gap: 20px;}
.pf-card {display: flex; flex-direction: column; gap: 12px; padding: 24px;}
.pf-h {font: 700 19px/1.3 Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0;}
.pf-sub {font-size: 16px; line-height: 1.35; padding-top: 8px;}
.pf-card .ds-chip {max-width: 100%; height: auto; min-height: 30px; padding-top: 4px; padding-bottom: 4px; white-space: normal;}
.pf-card .pf-service {min-height: 36px;}
.pf-side-card {display: flex; flex-direction: column; gap: 10px;}
.pf-hours {white-space: pre-line; overflow-wrap: anywhere;}
.pf-amenity {display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 13px;}
.pf-claim {display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding: 24px; border: 1px solid #f8cdb3; border-radius: 14px; background: #fff3ec;}
.pf-claim > div {flex: 1 1 280px; min-width: 0;}
@media (max-width: 1100px) {
  .pf-side {width: 320px;}
  .pf-cover {height: 320px;}
  .pf-title h1 {font-size: 38px;}
}
@media (max-width: 760px) {
  .pf {padding-top: 0;}
  .pf-hero {margin-left: -16px; margin-right: -16px;}
  .pf-cover, .pf-cover.bare, .pf-hero:has(.pg-side) .pf-cover {flex-basis: 100%; height: 250px; border-radius: 0;}
  .pf-fab {display: flex;}
  .pf-wide {display: none;}
  .pf-short {display: inline;}
  .pf-crumbs, .pf-address, .pf-save {display: none;}
  .pf-intro {padding: 18px 0 0; gap: 10px;}
  .pf-title h1 {font-size: 28px; line-height: 1.12; letter-spacing: -.56px;}
  .pf-head {gap: 10px;}
  .pf-title {flex-basis: 100%;}
  .pf-actions {width: 100%; gap: 8px;}
  .pf-actions :deep(.ds-btn) {height: 44px; padding: 0 18px; font-size: 15px; border-radius: 10px;}
  .pf-wide-action {flex: 1 0 100%;}
  .pf-tabs {gap: 20px; margin-top: 12px;}
  .pf-grid {flex-direction: column; gap: 24px; padding-top: 16px;}
  .pf-main, .pf-side {width: 100%;}
  .pf-services {padding: 0; border: 0;}
  .pf-services > .pf-h {position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%);}
  .pf-card .pf-service {min-height: 30px;}
  .pf-service svg {display: none;}
}
@media (max-width: 480px) {
  .pf-claim .ds-btn {width: 100%;}
}
</style>
