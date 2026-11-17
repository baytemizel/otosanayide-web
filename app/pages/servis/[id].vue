<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
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
import {findBusiness} from '~/data/mock/catalog';
import {mockProfile} from '~/data/mock/profile';

// Business profile (Figma W04 verified + photos, W05 unclaimed + no photo). Mock data only.
// Query: ?yorum=1 opens the review modal (W07) at step 1, ?yorum=2 at the Figma step-2 state; ?bildir=1 opens S08.
definePageMeta({key: (route) => String(route.params.id)});

const route = useRoute();
const router = useRouter();
const business = findBusiness(String(route.params.id));
if (!business) throw createError({statusCode: 404, statusMessage: 'Not Found', fatal: true});
const profile = mockProfile(business);

useSeoMeta({title: `${business.name} · ${business.district} / ${business.city} · ${business.category}`});

// Section tabs: click scrolls, scrolling updates the active tab.
const active = ref('genel');
let lock = 0;
function selectTab(id: string) {
  active.value = id;
  lock = Date.now() + 800;
  document.getElementById(id)?.scrollIntoView({behavior: 'smooth', block: 'start'});
}
function onScroll() {
  if (Date.now() < lock) return;
  let current = 'genel';
  for (const id of ['genel', 'hizmetler', 'yorumlar', 'konum']) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top < 160) current = id;
  }
  active.value = current;
}
onMounted(() => window.addEventListener('scroll', onScroll, {passive: true}));
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));

// Modals, also reachable from the URL.
const reviewOpen = ref(false);
const reviewDemo = ref(false);
const reportOpen = ref(false);
const photosOpen = ref(false);
const photoIndex = ref(0);
const mapOpen = ref(false);

watch(() => route.query, (query) => {
  if (query.yorum) { reviewDemo.value = query.yorum === '2'; reviewOpen.value = true; }
  if (query.bildir) reportOpen.value = true;
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
  dropQuery('yorum');
}
function closeReport() {
  reportOpen.value = false;
  dropQuery('bildir');
}
function openPhotos(index: number) {
  photoIndex.value = index;
  photosOpen.value = true;
}
const currentPhoto = computed(() => profile.photos[photoIndex.value] ?? profile.photos[0]);
</script>

<template>
  <div class="profile-page">
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
        <ProfileHeader :business="business" :profile="profile" @review="reviewOpen = true"/>
        <ProfileTabs :active="active" @select="selectTab"/>
        <ProfileServices :profile="profile"/>
        <ProfileReviews :business="business" :profile="profile" @review="reviewOpen = true"/>
        <ProfileLocation :business="business" :profile="profile" @map="mapOpen = true" @report="reportOpen = true"/>
      </div>
      <div class="side">
        <ProfileActionCard :business="business" :profile="profile" class="sticky" @directions="mapOpen = true"/>
      </div>
    </div>

    <ProfileReviewModal :open="reviewOpen" :business="business" :profile="profile" :demo="reviewDemo" @close="closeReview"/>
    <ProfileReportModal :open="reportOpen" :business-name="business.name" @close="closeReport"/>

    <V2Modal :open="photosOpen" title="Fotoğraflar" :subtitle="`${business.name} · ${profile.photoCount} fotoğraf`" :width="960" @close="photosOpen = false">
      <figure v-if="currentPhoto" class="viewer">
        <img :src="currentPhoto.src" :alt="currentPhoto.alt" width="896" height="504">
        <figcaption class="t-body-sm t-muted">{{ currentPhoto.alt }}</figcaption>
      </figure>
      <ul class="thumbs">
        <li v-for="(photo, i) in profile.photos" :key="photo.src">
          <button type="button" class="thumb" :class="{on: i === photoIndex}" :aria-pressed="i === photoIndex" :aria-label="`${i + 1}. fotoğraf`" @click="photoIndex = i">
            <img :src="photo.src" alt="" width="160" height="100">
          </button>
        </li>
      </ul>
    </V2Modal>

    <V2Modal :open="mapOpen" title="Konum" :subtitle="`${business.address} / ${business.city}`" :width="760" @close="mapOpen = false">
      <ProfileMiniMap :label="`${business.name} konumu, örnek harita`" class="big-map"/>
      <p class="t-body-sm t-muted">Harita görünümü temsilidir; yol tarifi için adresi kullanın.</p>
    </V2Modal>
  </div>
</template>

<style scoped>
.profile-page{padding-bottom:104px}
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
