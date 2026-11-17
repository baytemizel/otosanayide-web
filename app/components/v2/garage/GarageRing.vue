<script setup lang="ts">
import {computed} from 'vue';

// "halka" from W11 (Figma 123:333): cream track with a coloured arc that fills clockwise from 12 o'clock.
// progress 0..1 = share of the reminder window that has passed.
const props = withDefaults(defineProps<{progress: number; tone?: 'orange' | 'green' | 'muted'; size?: number}>(), {tone: 'orange', size: 56});
const stroke = 7.28;
const r = (56 - stroke) / 2;
const circumference = 2 * Math.PI * r;
const dash = computed(() => `${Math.min(1, Math.max(0, props.progress)) * circumference} ${circumference}`);
</script>

<template>
  <svg class="garage-ring" :class="tone" :width="size" :height="size" viewBox="0 0 56 56" aria-hidden="true">
    <circle cx="28" cy="28" :r="r" fill="none" class="track" :stroke-width="stroke"/>
    <circle cx="28" cy="28" :r="r" fill="none" class="arc" :stroke-width="stroke" :stroke-dasharray="dash" transform="rotate(-90 28 28)"/>
  </svg>
</template>

<style scoped>
.garage-ring{flex:none}
.track{stroke:var(--cream-200)}
.arc{transition:stroke-dasharray .4s ease}
.orange .arc{stroke:var(--orange-500)}
.green .arc{stroke:var(--green-500)}
.muted .arc{stroke:var(--ink-300)}
</style>
