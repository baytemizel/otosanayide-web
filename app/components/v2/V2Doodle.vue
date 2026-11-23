<script setup lang="ts">
import {computed} from 'vue';
import {doodles, doodleSrc, type DoodleSlug} from '~/data/doodles';

// One drawing from the Figma doodle library (app/data/doodles.ts). Decorative by default: empty alt.
// `size` is the rendered width in px; the height follows the drawing's own ratio (1:1 or 4:3).
const props = withDefaults(defineProps<{name: DoodleSlug; size?: number; alt?: string; eager?: boolean}>(), {size: undefined, alt: '', eager: false});
const meta = computed(() => doodles[props.name]);
const width = computed(() => props.size ?? meta.value.width);
const height = computed(() => Math.round((width.value * meta.value.height) / meta.value.width));
</script>

<template>
  <img class="doodle" :src="doodleSrc(name)" :alt="alt" :aria-hidden="alt ? undefined : 'true'" :width="width" :height="height" :loading="eager ? 'eager' : 'lazy'" decoding="async" draggable="false">
</template>

<style scoped>
.doodle{display:block;flex:none;max-width:100%;height:auto;user-select:none}
</style>
