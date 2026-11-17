<script setup lang="ts">
import HomeBusiness from '~/components/v2/home/HomeBusiness.vue';
import HomeCategories from '~/components/v2/home/HomeCategories.vue';
import HomeDiscovery from '~/components/v2/home/HomeDiscovery.vue';
import HomeGarage from '~/components/v2/home/HomeGarage.vue';
import HomeGuides from '~/components/v2/home/HomeGuides.vue';
import HomeHero from '~/components/v2/home/HomeHero.vue';
import HomeQuote from '~/components/v2/home/HomeQuote.vue';
import HomeReviews from '~/components/v2/home/HomeReviews.vue';
import HomeSymptomFinder from '~/components/v2/home/HomeSymptomFinder.vue';

// Web v2 home (Figma 107:38 "W-V2 · Ana sayfa · Misafir"). Navbar and footer come from app.vue.
// All content is synthetic mock data from app/data/mock/home.ts and businesses.ts.
useSeoMeta({
  title: 'Aracına iyi bakacak ustayı bul',
  description: 'Mekanikten oto kuaföre 20 kategoride servisleri karşılaştır, gerçek yorumları oku; tek dokunuşla ara ya da yol tarifi al.',
});
</script>

<template>
  <div class="home-page">
    <HomeHero/>
    <HomeCategories/>
    <HomeSymptomFinder/>
    <HomeDiscovery/>
    <HomeQuote/>
    <HomeGarage/>
    <HomeReviews/>
    <HomeGuides/>
    <HomeBusiness/>
  </div>
</template>

<style scoped>
/* Glows reach past the page edges: clip sideways only, so the hero glow can still sit behind the navbar. */
.home-page{overflow-x:clip}
</style>
