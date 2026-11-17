<script setup lang="ts">
import {Star} from '@lucide/vue';

// Read-only row of five stars (filled orange, rest cream-200).
withDefaults(defineProps<{value: number; size?: number; label?: string}>(), {size: 16, label: undefined});
</script>

<template>
  <span class="profile-stars" role="img" :aria-label="label ?? `5 üzerinden ${value}`">
    <Star v-for="n in 5" :key="n" :size="size" :class="{off: n > Math.round(value)}" aria-hidden="true"/>
  </span>
</template>

<style scoped>
.profile-stars{display:inline-flex;gap:2px;color:var(--orange-500);flex:none}
.profile-stars :deep(svg){fill:currentColor;stroke:currentColor}
.profile-stars .off{color:var(--cream-200)}
</style>
