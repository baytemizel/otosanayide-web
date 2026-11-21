<script setup lang="ts">
import {ArrowRight, ArrowUpRight, Bike, Brush, LifeBuoy, Sparkles, Wrench, Zap} from '@lucide/vue';
import HomeSectionHead from '~/components/v2/home/HomeSectionHead.vue';
import {homeCategories, homeFeaturedCategory, homeMoreCategories, type HomeCategoryIcon} from '~/data/mock/home';
import {useLocale} from '~/composables/useLocale';
import {useCoverage} from '~/composables/v2/useSearch';
import {demoMode} from '~/lib/env';

// Figma 109:30 "Kategoriler · bento". Cards lift and turn orange on hover (the Figma "Kaporta & Boya" card shows that state).
// Category names and texts are Turkish source text, translated at render; the link keeps the Turkish name.
const {t} = useLocale();
const icons: Record<HomeCategoryIcon, unknown> = {wrench: Wrench, sparkles: Sparkles, brush: Brush, tyre: LifeBuoy, zap: Zap, bike: Bike};
const categoryLink = (name: string) => ({path: '/ara', query: {kategori: name}});
const [first, second, ...rest] = homeCategories;
const topRow = [first, second].filter((c) => c !== undefined);
// Live: the category count from GET /api/coverage (bundled catalogue until it answers).
const demo = demoMode();
const coverage = useCoverage();
</script>

<template>
  <section class="home-categories v2-wrap" aria-labelledby="home-categories-title">
    <HomeSectionHead :eyebrow="t('KATEGORİLER')" :title="t('Aracın neye ihtiyaç duyuyor?')" heading-id="home-categories-title">
      <NuxtLink to="/ara" class="btn btn-outline">{{ t('Tüm {count} kategori', {count: demo ? 20 : coverage.categoryCount}) }}<ArrowRight aria-hidden="true"/></NuxtLink>
    </HomeSectionHead>

    <div class="grid">
      <div class="row top">
        <NuxtLink :to="categoryLink(homeFeaturedCategory.name)" class="card featured">
          <span class="featured-body">
            <span class="icon lime" aria-hidden="true"><Wrench :size="23"/></span>
            <span class="featured-text">
              <span class="t-h3 name">{{ t(homeFeaturedCategory.name) }}</span>
              <span class="t-body-sm desc">{{ t(homeFeaturedCategory.text) }}</span>
              <span class="hot t-mono-sm"><span class="hot-dot" aria-hidden="true"/>{{ t('EN ÇOK ARANAN') }}</span>
            </span>
          </span>
          <img class="featured-photo" :src="homeFeaturedCategory.photo" alt="" width="1200" height="800" loading="lazy">
        </NuxtLink>
        <NuxtLink v-for="cat in topRow" :key="cat.name" :to="categoryLink(cat.name)" class="card plain">
          <span class="card-top">
            <span class="icon" :class="cat.tone" aria-hidden="true"><component :is="icons[cat.icon]" :size="23" :class="{tyre: cat.icon === 'tyre'}"/></span>
            <span class="go" aria-hidden="true"><ArrowUpRight :size="16"/></span>
          </span>
          <span class="card-text">
            <span class="t-h4">{{ t(cat.name) }}</span>
            <span class="t-body-sm desc">{{ t(cat.text) }}</span>
          </span>
        </NuxtLink>
      </div>
      <div class="row bottom">
        <NuxtLink v-for="cat in rest" :key="cat.name" :to="categoryLink(cat.name)" class="card plain">
          <span class="card-top">
            <span class="icon" :class="cat.tone" aria-hidden="true"><component :is="icons[cat.icon]" :size="23" :class="{tyre: cat.icon === 'tyre'}"/></span>
            <span class="go" aria-hidden="true"><ArrowUpRight :size="16"/></span>
          </span>
          <span class="card-text">
            <span class="t-h4">{{ t(cat.name) }}</span>
            <span class="t-body-sm desc">{{ t(cat.text) }}</span>
          </span>
        </NuxtLink>
        <NuxtLink to="/ara" class="card more">
          <span class="card-top">
            <span class="more-count">+{{ homeMoreCategories.count }}</span>
            <span class="go dark" aria-hidden="true"><ArrowRight :size="16"/></span>
          </span>
          <span class="card-text">
            <span class="t-h4">{{ t(homeMoreCategories.title) }}</span>
            <span class="t-body-sm desc">{{ t(homeMoreCategories.text) }}</span>
          </span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-categories{display:flex;flex-direction:column;gap:40px;padding-top:24px;padding-bottom:104px}
.grid{display:flex;flex-direction:column;gap:20px}
.row{display:flex;gap:20px}
.card{position:relative;display:flex;flex-direction:column;justify-content:space-between;border-radius:28px;transition:transform .2s ease,background-color .2s ease,border-color .2s ease,box-shadow .2s ease}
.card:hover,.card:focus-visible{transform:translateY(-6px)}
.top .card{height:260px}
.bottom .card{height:220px;flex:1 1 0;min-width:0}

.featured{flex:610 1 0;min-width:0;flex-direction:row;overflow:hidden;background:var(--ink-900)}
.featured:hover{box-shadow:0 22px 22px rgba(10,20,36,.2)}
.featured-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:28px}
.featured-text{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.featured .name{color:var(--white)}
.featured .desc{color:var(--ink-300)}
.hot{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.1);color:var(--white)}
.hot-dot{width:6px;height:6px;border-radius:999px;background:var(--lime-400)}
.featured-photo{flex:none;width:250px;height:100%;object-fit:cover}

.plain{background:var(--white);border:1px solid var(--cream-200);padding:24px}
.top .plain{flex:295 1 0;min-width:0}
.plain:hover,.plain:focus-visible{background:var(--orange-500);border-color:var(--orange-500);box-shadow:0 22px 22px rgba(10,20,36,.2)}
.plain:hover .icon,.plain:focus-visible .icon{background:var(--ink-900);color:var(--lime-400)}
.plain:hover .go,.plain:focus-visible .go{background:var(--ink-900);color:var(--white)}
.plain:hover .desc,.plain:focus-visible .desc{color:rgba(10,21,36,.8)}

.card-top{display:flex;align-items:flex-start;justify-content:space-between}
.card-text{display:flex;flex-direction:column;gap:6px}
.card-text .t-h4{color:var(--ink-900)}
.plain .desc{color:var(--ink-500)}
.icon{display:grid;place-items:center;width:52px;height:52px;border-radius:999px;color:var(--ink-900);transition:background-color .2s ease,color .2s ease}
.icon.lime{background:var(--lime-400)}
.plain .icon.lime{background:var(--lime-100)}
.icon.sky{background:var(--sky-200)}
.icon.orange{background:var(--orange-100)}
.tyre{transform:rotate(45deg)}
.go{display:grid;place-items:center;width:36px;height:36px;border-radius:999px;background:var(--cream-100);color:var(--ink-900);transition:background-color .2s ease,color .2s ease}
.go.dark{background:var(--ink-900);color:var(--lime-400)}

.more{background:var(--lime-400);padding:24px}
.more:hover{box-shadow:0 22px 22px rgba(10,20,36,.2)}
.more-count{font-family:var(--font-display);font-weight:800;font-size:56px;line-height:1;letter-spacing:-.02em;color:var(--ink-900)}
.more .desc{color:rgba(10,21,36,.75)}

@media (max-width:1100px){
  .row{flex-wrap:wrap}
  .featured{flex:1 1 100%}
  .top .plain{flex:1 1 calc(50% - 10px)}
  .bottom .card{flex:1 1 calc(50% - 10px)}
}
@media (max-width:760px){
  .home-categories{padding-bottom:72px}
  .featured{flex-direction:column;height:auto!important}
  .featured-body{gap:40px}
  .featured-photo{width:100%;height:180px}
  .top .plain,.bottom .card{flex:1 1 100%;height:200px}
}
</style>
