<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {ArrowLeft, ArrowRight} from '@lucide/vue';
import V2ReviewCard from '~/components/v2/V2ReviewCard.vue';
import {homeReviews} from '~/data/mock/home';

// Figma 113:253 "Yorumlar · karusel": draggable track with arrows, a position counter and a progress line.
const track = ref<HTMLElement | null>(null);
const index = ref(0);
const progress = ref({width: 0.2, offset: 0});
const atStart = ref(true);
const atEnd = ref(false);
const pad = (n: number) => String(n).padStart(2, '0');
const counter = computed(() => `${pad(index.value + 1)} / ${pad(homeReviews.length)}`);

function step() {
  const first = track.value?.querySelector<HTMLElement>('.slide');
  return first ? first.offsetWidth + 20 : 420;
}
function update() {
  const el = track.value;
  if (!el) return;
  const max = el.scrollWidth - el.clientWidth;
  const ratio = max > 0 ? el.scrollLeft / max : 0;
  const width = el.scrollWidth ? el.clientWidth / el.scrollWidth : 1;
  progress.value = {width, offset: ratio * (1 - width)};
  index.value = Math.min(homeReviews.length - 1, Math.round(el.scrollLeft / step()));
  atStart.value = el.scrollLeft <= 2;
  atEnd.value = el.scrollLeft >= max - 2;
}
function go(dir: 1 | -1) {
  track.value?.scrollBy({left: dir * step(), behavior: 'smooth'});
}

// Mouse dragging; touch and trackpads scroll natively.
let dragging = false;
let moved = false;
let startX = 0;
let startLeft = 0;
function down(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || !track.value) return;
  dragging = true;
  moved = false;
  startX = e.clientX;
  startLeft = track.value.scrollLeft;
  track.value.classList.add('dragging');
}
function move(e: PointerEvent) {
  if (!dragging || !track.value) return;
  const dx = e.clientX - startX;
  if (Math.abs(dx) > 4) moved = true;
  track.value.scrollLeft = startLeft - dx;
}
function up() {
  if (!dragging || !track.value) return;
  dragging = false;
  track.value.classList.remove('dragging');
  const s = step();
  track.value.scrollTo({left: Math.round(track.value.scrollLeft / s) * s, behavior: 'smooth'});
}
function clickCapture(e: MouseEvent) {
  if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
}

onMounted(() => {
  update();
  window.addEventListener('resize', update);
  window.addEventListener('pointerup', up);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', update);
  window.removeEventListener('pointerup', up);
});
</script>

<template>
  <section class="home-reviews" aria-labelledby="home-reviews-title" aria-roledescription="karusel">
    <div class="head">
      <div class="titles">
        <p class="t-mono-md">YORUMLAR</p>
        <h2 id="home-reviews-title" class="t-h2">Sürücüler ne diyor?</h2>
      </div>
      <div class="arrows">
        <p class="t-mono-md counter" aria-live="polite">{{ counter }}</p>
        <button type="button" class="arrow outline" aria-label="Önceki yorum" :disabled="atStart" @click="go(-1)"><ArrowLeft :size="20" aria-hidden="true"/></button>
        <button type="button" class="arrow solid" aria-label="Sonraki yorum" :disabled="atEnd" @click="go(1)"><ArrowRight :size="20" aria-hidden="true"/></button>
      </div>
    </div>

    <ul
      ref="track" class="track" tabindex="0" aria-label="Sürücü yorumları"
      @scroll.passive="update" @pointerdown="down" @pointermove="move" @click.capture="clickCapture" @dragstart.prevent>
      <li v-for="(review, i) in homeReviews" :key="review.id" class="slide" :aria-label="`${i + 1} / ${homeReviews.length}`">
        <V2ReviewCard :review="review"/>
      </li>
    </ul>

    <div class="foot">
      <span class="bar" aria-hidden="true">
        <span class="bar-fill" :style="{width: `${progress.width * 100}%`, transform: `translateX(${(progress.offset / Math.max(progress.width, 0.01)) * 100}%)`}"/>
      </span>
      <span class="t-body-sm drag-hint">Sürükle ya da okları kullan</span>
    </div>
  </section>
</template>

<style scoped>
.home-reviews{display:flex;flex-direction:column;gap:40px;padding:104px 0;background:var(--lime-400);color:var(--ink-900)}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:0 var(--gutter)}
.titles{display:flex;flex-direction:column;gap:14px}
.arrows{display:flex;align-items:center;gap:10px}
.counter{margin-right:8px;white-space:nowrap}
.arrow{display:grid;place-items:center;width:52px;height:52px;border-radius:999px;transition:opacity .15s ease,transform .15s ease}
.arrow:hover:not(:disabled){transform:translateY(-1px)}
.arrow:disabled{opacity:.4;cursor:default}
.arrow.outline{border:1.5px solid var(--ink-900);color:var(--ink-900)}
.arrow.solid{background:var(--ink-900);color:var(--lime-400)}

.track{display:flex;gap:20px;overflow-x:auto;padding:0 var(--gutter);scroll-padding:0 var(--gutter);scroll-snap-type:x mandatory;scrollbar-width:none;cursor:grab;user-select:none}
.track::-webkit-scrollbar{display:none}
.track.dragging{cursor:grabbing;scroll-snap-type:none}
.track:focus-visible{outline-offset:-3px}
.slide{flex:0 0 400px;display:flex;scroll-snap-align:start}
.slide > *{flex:1}
.foot{display:flex;align-items:center;gap:16px;padding:0 var(--gutter)}
.bar{position:relative;flex:none;width:240px;height:4px;border-radius:999px;background:rgba(10,21,36,.16);overflow:hidden}
.bar-fill{position:absolute;left:0;top:0;height:4px;border-radius:999px;background:var(--ink-900);transition:transform .15s linear}
.drag-hint{color:rgba(10,21,36,.7)}

@media (max-width:760px){
  .home-reviews{padding:72px 0;gap:28px}
  .head{flex-direction:column;align-items:flex-start}
  .slide{flex-basis:min(320px,calc(100vw - 56px))}
  .bar{width:160px}
}
</style>
