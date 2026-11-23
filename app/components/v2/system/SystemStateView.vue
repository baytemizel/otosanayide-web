<script setup lang="ts">
import V2Doodle from '~/components/v2/V2Doodle.vue';
import type {DoodleSlug} from '~/data/doodles';

// "Durum" block shared by the v2 system screens (Figma 13 · Web v2 · Sistem & Durumlar):
// the screen's scene doodle (320 × 240; 404 is 360 × 270), then eyebrow, H2, text and actions.
withDefaults(defineProps<{doodle: DoodleSlug; doodleSize?: number; eyebrow: string; title: string; text: string}>(), {doodleSize: 320});
</script>

<template>
  <section class="state v2-wrap">
    <V2Doodle :name="doodle" :size="doodleSize" class="art" eager/>
    <p class="t-mono-md t-eyebrow">{{ eyebrow }}</p>
    <h1 class="t-h2 title">{{ title }}</h1>
    <p class="t-body-md t-muted text">{{ text }}</p>
    <div v-if="$slots.default" class="actions"><slot/></div>
    <slot name="after"/>
  </section>
</template>

<style scoped>
.state{display:flex;flex-direction:column;align-items:center;gap:22px;padding-top:80px;padding-bottom:120px;text-align:center}
.title{max-width:860px}
.text{max-width:560px}
.actions{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;padding-top:8px}
@media (max-width:760px){
  .state{padding-top:48px;padding-bottom:72px}
  .art{width:min(100%,260px)}
}
</style>
