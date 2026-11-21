<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import ProfileActionCard from '~/components/v2/profile/ProfileActionCard.vue';
import ProfileGallery from '~/components/v2/profile/ProfileGallery.vue';
import ProfileHeader from '~/components/v2/profile/ProfileHeader.vue';
import ProfileLocation from '~/components/v2/profile/ProfileLocation.vue';
import ProfileMiniMap from '~/components/v2/profile/ProfileMiniMap.vue';
import ProfileReportModal from '~/components/v2/profile/ProfileReportModal.vue';
import ProfileReviewModal from '~/components/v2/profile/ProfileReviewModal.vue';
import ProfileReviews from '~/components/v2/profile/ProfileReviews.vue';
import ProfileServices from '~/components/v2/profile/ProfileServices.vue';
import ProfileTabs from '~/components/v2/profile/ProfileTabs.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {useProfileLive} from '~/composables/v2/useProfile';
import {findBusiness} from '~/data/mock/catalog';
import {mockProfile} from '~/data/mock/profile';
import {demoMode, publicEnv} from '~/lib/env';
import {readBusiness} from '~/lib/server-read';
import {businessJsonLd, serializeJsonLd} from '~/lib/structured-data';
import {toCardBusiness, type CardBusiness} from '~/lib/v2/business-card';
import {contactTargets, liveProfile, liveReportReasons, profileSeo, requestActions, type ProfileView, type ReportReason, type ReviewSummaryView} from '~/lib/v2/profile';

// Business profile (Figma W04 verified + photos, W05 unclaimed + no photo).
// Demo: mock data (app/data/mock). Live: GET /api/businesses/{id}?v=2 on the server (404 for a missing
// business, an error state when the API is unavailable), reviews, photos and the write actions in the browser.
// Query: ?yorum=1 opens the review modal (W07) at step 1, ?yorum=2 at the Figma step-2 state, ?yorum=duzenle
// (live, from Yorumlarım) the member's own review in edit mode; ?bildir=1 opens S08.
definePageMeta({key: (route) => String(route.params.id)});

const route = useRoute();
const router = useRouter();
const app = useApp();
const {locale} = useLocale();
const demo = demoMode();
const id = String(route.params.id);

// --- Data: mock in demo, the API record in live -------------------------------------------------
type Loaded = {business: CardBusiness; profile: ProfileView; summary: ReviewSummaryView};
let loaded: Loaded | null = null;
const read = demo ? null : await useAsyncData(`v2-business:${id}:${locale.value}`, () => readBusiness(id, locale.value));
const unavailable = computed(() => !!read && read.data.value?.status !== 'found');
const retrying = ref(false);

if (demo) {
  const business = findBusiness(id);
  if (!business) throw createError({statusCode: 404, statusMessage: 'Not Found', fatal: true});
  const profile = mockProfile(business);
  loaded = {business, profile, summary: profile.reviews.length ? {count: business.reviewCount, average: business.rating} : {count: 0, average: null}};
} else if (read?.data.value?.status === 'missing') {
  throw createError({statusCode: 404, statusMessage: 'Not Found', fatal: true});
}

const found = computed(() => (read?.data.value?.status === 'found' ? read.data.value : null));
const view = computed<Loaded | null>(() => {
  if (loaded) return loaded;
  const value = found.value;
  if (!value) return null;
  return {business: toCardBusiness(value.business, value.extras), profile: liveProfile(value.business, value.extras), summary: value.extras.reviewSummary ?? null};
});

async function retry() {
  if (!read) return;
  retrying.value = true;
  try {
    await read.refresh();
    if (read.data.value?.status === 'missing') showError({statusCode: 404, statusMessage: 'Not Found'});
    if (found.value) liveData.start(found.value.business.name);
  } finally {
    retrying.value = false;
  }
}

// Browser-side live data (no-ops in demo mode).
const liveData = useProfileLive(id, found.value?.extras.reviewSummary ?? null);
const live = !demo;
const business = computed(() => view.value?.business ?? null);
const profile = computed<ProfileView | null>(() => {
  const base = view.value?.profile;
  if (!base) return null;
  if (!live) return base;
  return {...base, reviews: liveData.reviews.value, photos: liveData.photos.value, photoCount: liveData.photos.value.length};
});
const summary = computed(() => (live ? liveData.summary.value : view.value?.summary ?? null));
const targets = computed(() => (live && found.value ? contactTargets(found.value.business) : null));
const actions = computed(() => (live && found.value ? requestActions(found.value.business) : null));
const guestHref = computed(() => (live && app.ready && !app.member ? liveData.signInHref.value : null));
const existingReview = computed(() => (live ? liveData.own.value : null));

onMounted(() => {
  if (found.value) liveData.start(found.value.business.name);
});

// --- Head: title, description, canonical, JSON-LD (as the pre-v2 profile did) ----------------------
if (demo && loaded) {
  const b = loaded.business;
  useSeoMeta({title: `${b.name} · ${b.district} / ${b.city} · ${b.category}`});
} else {
  const site = publicEnv().siteOrigin;
  const canonical = computed(() => (site && found.value ? `${site}/servis/${encodeURIComponent(id)}` : undefined));
  const seo = computed(() => (found.value ? profileSeo(found.value.business) : null));
  useSeoMeta({
    title: () => seo.value?.title ?? 'Profil şu anda kullanılamıyor',
    description: () => seo.value?.description,
    ogTitle: () => seo.value?.title,
    ogDescription: () => seo.value?.description,
    ogType: 'website',
    ogSiteName: 'Otosanayide',
    ogUrl: () => canonical.value,
    // An unavailable profile is not offered to search engines.
    robots: () => (found.value ? undefined : 'noindex, nofollow'),
  });
  useHead({
    link: () => (canonical.value ? [{rel: 'canonical', href: canonical.value}] : []),
    script: () => {
      const value = found.value;
      const ld = value ? businessJsonLd(value.business, {url: canonical.value, openingHours: value.extras.openingHours}) : null;
      return ld ? [{key: 'business-ld', type: 'application/ld+json', innerHTML: serializeJsonLd(ld)}] : [];
    },
  });
}

// --- Section tabs: click scrolls, scrolling updates the active tab ---------------------------------
const active = ref('genel');
let lock = 0;
function selectTab(tab: string) {
  active.value = tab;
  lock = Date.now() + 800;
  document.getElementById(tab)?.scrollIntoView({behavior: 'smooth', block: 'start'});
}
function onScroll() {
  if (Date.now() < lock) return;
  let current = 'genel';
  for (const tab of ['genel', 'hizmetler', 'yorumlar', 'konum']) {
    const el = document.getElementById(tab);
    if (el && el.getBoundingClientRect().top < 160) current = tab;
  }
  active.value = current;
}
onMounted(() => window.addEventListener('scroll', onScroll, {passive: true}));
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));

// --- Modals, also reachable from the URL ------------------------------------------------------------
const reviewOpen = ref(false);
const reviewDemo = ref(false);
const reviewEdit = ref(false);
const reportOpen = ref(false);
const photosOpen = ref(false);
const photoIndex = ref(0);
const mapOpen = ref(false);

watch(() => route.query, (query) => {
  if (query.yorum) { reviewDemo.value = query.yorum === '2'; reviewEdit.value = live && query.yorum === 'duzenle'; reviewOpen.value = true; }
  if (query.bildir) openReport();
}, {immediate: true});

function dropQuery(key: string) {
  if (!(key in route.query)) return;
  const query = {...route.query};
  delete query[key];
  router.replace({query});
}
function closeReview() {
  reviewOpen.value = false;
  reviewDemo.value = false;
  reviewEdit.value = false;
  dropQuery('yorum');
}
function openReport() {
  if (live) liveData.newReportOperation();
  reportOpen.value = true;
}
function closeReport() {
  reportOpen.value = false;
  dropQuery('bildir');
}
function openPhotos(index: number) {
  photoIndex.value = index;
  photosOpen.value = true;
}
const currentPhoto = computed(() => profile.value?.photos[photoIndex.value] ?? profile.value?.photos[0]);
const reportReview = live ? liveData.reportReview : undefined;
const submitReview = live ? liveData.submitReview : undefined;
const editReview = live ? liveData.editReview : undefined;
const submitReport = live ? (reason: string, note: string) => liveData.reportBusiness(reason as ReportReason, note) : undefined;
</script>

<template>
  <div v-if="business && profile" class="profile-page">
    <nav class="crumbs v2-wrap t-body-sm" aria-label="Konum yolu">
      <ol>
        <li>{{ business.city }}</li>
        <li aria-hidden="true" class="sep">/</li>
        <li>{{ business.district }}</li>
        <li aria-hidden="true" class="sep">/</li>
        <li class="here" aria-current="page">{{ business.category }}</li>
      </ol>
    </nav>

    <ProfileGallery :photos="profile.photos" :photo-count="profile.photoCount" :category="business.category" @open-all="openPhotos"/>

    <div class="content v2-wrap">
      <div class="main">
        <ProfileHeader :business="business" :profile="profile" :summary="summary" @review="reviewOpen = true"/>
        <ProfileTabs :active="active" @select="selectTab"/>
        <ProfileServices :profile="profile"/>
        <ProfileReviews
          :business="business" :profile="profile" :summary="summary"
          :live="live" :state="liveData.state.value" :error="liveData.error.value"
          :has-more="liveData.hasMore.value" :loading-more="liveData.loadingMore.value"
          :report="reportReview" :sign-in-href="guestHref"
          @review="reviewOpen = true" @retry="liveData.retry()" @more="liveData.more()"/>
        <ProfileLocation :business="business" :profile="profile" :map-href="targets?.map ?? null" @map="mapOpen = true" @report="openReport"/>
      </div>
      <div class="side">
        <ProfileActionCard :business="business" :profile="profile" :targets="targets" :actions="actions" class="sticky" @directions="mapOpen = true"/>
      </div>
    </div>

    <ProfileReviewModal
      :open="reviewOpen" :business="business" :profile="profile" :demo="reviewDemo"
      :submit="submitReview" :edit="editReview" :sign-in-href="guestHref" :existing="existingReview" :start-edit="reviewEdit"
      @close="closeReview"/>
    <ProfileReportModal
      :open="reportOpen" :business-name="business.name"
      v-bind="live ? {reasons: liveReportReasons, submit: submitReport, signInHref: guestHref} : {}"
      @close="closeReport"/>

    <V2Modal :open="photosOpen" title="Fotoğraflar" :subtitle="`${business.name} · ${profile.photoCount} fotoğraf`" :width="960" @close="photosOpen = false">
      <figure v-if="currentPhoto" class="viewer">
        <img :src="currentPhoto.src" :alt="currentPhoto.alt" width="896" height="504">
        <figcaption class="t-body-sm t-muted">{{ currentPhoto.alt }}</figcaption>
      </figure>
      <ul class="thumbs">
        <li v-for="(photo, i) in profile.photos" :key="photo.src">
          <button type="button" class="thumb" :class="{on: i === photoIndex}" :aria-pressed="i === photoIndex" :aria-label="`${i + 1}. fotoğraf`" @click="photoIndex = i">
            <img :src="photo.thumb ?? photo.src" alt="" width="160" height="100">
          </button>
        </li>
      </ul>
      <p v-if="live" class="t-body-sm t-muted">İşletme sahibi tarafından eklendi ve yayın incelemesinden geçti. Hizmet kalitesi garantisi değildir.</p>
    </V2Modal>

    <V2Modal v-if="!live" :open="mapOpen" title="Konum" :subtitle="`${business.address} / ${business.city}`" :width="760" @close="mapOpen = false">
      <ProfileMiniMap :label="`${business.name} konumu, örnek harita`" class="big-map"/>
      <p class="t-body-sm t-muted">Harita görünümü temsilidir; yol tarifi için adresi kullanın.</p>
    </V2Modal>
  </div>

  <div v-else-if="unavailable" class="profile-page v2-wrap fallback" role="alert">
    <h1 class="t-h2">Profil şu anda kullanılamıyor</h1>
    <p class="t-body-md t-muted">İşletme bilgisi alınamadı. Bağlantı kurulduğunda profil burada görünecek.</p>
    <V2Button variant="outline" :disabled="retrying" @click="retry">{{ retrying ? 'Yükleniyor…' : 'Tekrar dene' }}</V2Button>
  </div>
</template>

<style scoped>
.profile-page{padding-bottom:104px}
.fallback{display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding-top:64px;min-height:60vh}
.crumbs{padding-top:28px}
.crumbs ol{display:flex;flex-wrap:wrap;gap:8px;color:var(--ink-500)}
.crumbs .sep{color:var(--ink-300)}
.crumbs .here{font-weight:600;color:var(--ink-900)}
.content{display:flex;align-items:flex-start;gap:40px;padding-top:36px}
.main{flex:1 1 0;min-width:0;max-width:820px;display:flex;flex-direction:column;gap:44px}
.side{width:380px;flex:none;align-self:stretch}
.sticky{position:sticky;top:110px}
.viewer{display:flex;flex-direction:column;gap:10px}
.viewer img{width:100%;height:auto;max-height:60vh;object-fit:cover;border-radius:20px}
.thumbs{display:flex;gap:10px;overflow-x:auto}
.thumb{display:block;width:120px;height:76px;border-radius:14px;overflow:hidden;border:2px solid transparent;flex:none}
.thumb.on{border-color:var(--ink-900)}
.thumb img{width:100%;height:100%;object-fit:cover}
.big-map{width:100%;height:380px}
@media (max-width:1100px){
  .content{flex-direction:column;align-items:stretch;gap:44px}
  .main{max-width:none}
  .side{width:100%}
  .sticky{position:static}
}
@media (max-width:760px){
  .profile-page{padding-bottom:64px}
  .crumbs{padding-top:20px}
  .content{padding-top:28px}
  .big-map{height:260px}
}
</style>
