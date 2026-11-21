<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {useCoverage} from '~/composables/v2/useSearch';
import {homeCounters} from '~/data/mock/home';
import {demoMode} from '~/lib/env';

// Figma 108:235 "Güven şeridi · sayaç": the numbers count up from zero once the strip is visible.
// Live: the province and category counts come from GET /api/coverage (bundled list until it answers).
const demo = demoMode();
const coverage = useCoverage();
const counters = computed(() => (demo ? homeCounters : homeCounters.map((c) => (
  c.label === 'ilde servis ağı' ? {...c, value: coverage.value.cityCount} : c.label === 'hizmet kategorisi' ? {...c, value: coverage.value.categoryCount} : c))));
const root = ref<HTMLElement | null>(null);
const shown = ref(counters.value.map((c) => c.value));
let observer: IntersectionObserver | undefined;
let frame = 0;
let counting = false;
// Counts that arrive after (or without) the animation are shown as they are.
watch(counters, (next) => {
  if (!counting) shown.value = next.map((c) => c.value);
});

function countUp() {
  const start = performance.now();
  const duration = 1200;
  counting = true;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    shown.value = counters.value.map((c) => Math.round(c.value * eased));
    if (t < 1) frame = requestAnimationFrame(step);
    else counting = false;
  };
  frame = requestAnimationFrame(step);
}

onMounted(() => {
  if (!root.value || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Waiting for the strip to be visible: the animation reads the current counts when it runs.
  counting = true;
  shown.value = counters.value.map(() => 0);
  observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer?.disconnect();
      countUp();
    }
  }, {threshold: 0.4});
  observer.observe(root.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(frame);
});
</script>

<template>
  <ul ref="root" class="home-counters">
    <li v-for="(item, i) in counters" :key="item.label" class="item">
      <span class="sr-only">{{ item.prefix ?? '' }}{{ item.value }} {{ item.label }}</span>
      <span class="t-stat num" :class="{accent: item.accent}" aria-hidden="true">{{ item.prefix ?? '' }}{{ shown[i] }}</span>
      <span class="label" aria-hidden="true">{{ item.label }}</span>
    </li>
  </ul>
</template>

<style scoped>
.home-counters{display:flex;align-items:center}
.item{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:14px;padding:0 28px;min-height:56px}
.item + .item{border-left:1px solid var(--cream-200)}
.num{color:var(--ink-900);white-space:nowrap;font-variant-numeric:tabular-nums}
.num.accent{color:var(--orange-500)}
.label{flex:none;width:130px;font-size:16px;line-height:1.3;color:var(--ink-500)}
@media (max-width:1100px){
  .home-counters{flex-wrap:wrap;row-gap:24px}
  .item{flex:1 1 45%}
  .item:nth-child(3){border-left:0}
}
@media (max-width:760px){
  .item{flex:1 1 100%;padding:0 4px;border-left:0!important}
}
</style>
