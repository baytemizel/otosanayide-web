<script setup lang="ts">
import {ArrowRight} from '@lucide/vue';
import HomeMiniQuiz from '~/components/v2/home/HomeMiniQuiz.vue';
import HomeSectionHead from '~/components/v2/home/HomeSectionHead.vue';
import {homeGuides, homeGuidesAllTo} from '~/data/mock/home';

// Figma 113:386 "Rehber + mini test".
</script>

<template>
  <section id="rehber" class="home-guides v2-wrap" aria-labelledby="home-guides-title">
    <HomeSectionHead eyebrow="REHBER" title="2 dakikada daha bilinçli sürücü" heading-id="home-guides-title">
      <NuxtLink :to="homeGuidesAllTo" class="btn btn-outline">Tüm rehberler<ArrowRight aria-hidden="true"/></NuxtLink>
    </HomeSectionHead>

    <div class="row">
      <NuxtLink v-for="g in homeGuides" :key="g.id" :to="g.to" class="guide">
        <span class="cover" :class="g.tone">
          <span class="number" aria-hidden="true">{{ g.number }}</span>
          <span class="read t-mono-sm">{{ g.readTime.toLocaleUpperCase('tr-TR') }}</span>
        </span>
        <span class="body">
          <span class="t-mono-sm topic">{{ g.topic.toLocaleUpperCase('tr-TR') }}</span>
          <span class="t-h4 title">{{ g.title }}</span>
          <span class="more t-label-sm">Rehberi oku<ArrowRight :size="16" aria-hidden="true"/></span>
        </span>
      </NuxtLink>
      <HomeMiniQuiz class="quiz"/>
    </div>
  </section>
</template>

<style scoped>
.home-guides{display:flex;flex-direction:column;gap:40px;padding-top:104px;padding-bottom:104px}
.row{display:flex;gap:20px;align-items:stretch}
.guide{flex:1 1 0;min-width:0;display:flex;flex-direction:column;overflow:hidden;background:var(--white);border:1px solid var(--cream-200);border-radius:28px;transition:transform .2s ease,box-shadow .2s ease}
.guide:hover{transform:translateY(-4px);box-shadow:0 18px 20px rgba(10,20,36,.1)}
.cover{display:flex;align-items:flex-start;justify-content:space-between;height:150px;padding:20px}
.cover.sky{background:var(--sky-200)}
.cover.orange{background:var(--orange-100)}
.cover.lime{background:var(--lime-100)}
.number{font-family:var(--font-display);font-weight:800;font-size:72px;line-height:1;letter-spacing:-.02em;color:var(--ink-900)}
.read{padding:6px 11px;border-radius:999px;background:var(--white);color:var(--ink-800);white-space:nowrap}
.body{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:22px}
.topic{color:var(--orange-600)}
.title{color:var(--ink-900);max-width:236px}
.more{display:flex;align-items:center;gap:8px;padding-top:6px;color:var(--ink-900)}
.guide:hover .more{text-decoration:underline}
.quiz{flex:0 0 340px}

@media (max-width:1100px){
  .row{flex-wrap:wrap}
  .guide{flex:1 1 calc(33% - 14px)}
  .quiz{flex:1 1 100%}
}
@media (max-width:760px){
  .home-guides{padding-top:72px;padding-bottom:72px}
  .guide{flex:1 1 100%}
}
</style>
