<script setup lang="ts">
import {ref} from 'vue';
import {Star} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';

// Selectable 1–5 star rating (radio group). Arrow keys move the value.
const props = withDefaults(defineProps<{modelValue: number; label: string; size?: number}>(), {size: 18});
const emit = defineEmits<{'update:modelValue': [value: number]}>();
const hover = ref(0);
const {t} = useLocale();

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); emit('update:modelValue', Math.min(5, props.modelValue + 1)); }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); emit('update:modelValue', Math.max(1, props.modelValue - 1)); }
}
</script>

<template>
  <span class="profile-star-input" role="radiogroup" :aria-label="label" @mouseleave="hover = 0" @keydown="onKey">
    <button
      v-for="n in 5" :key="n" type="button" role="radio" class="star"
      :aria-checked="modelValue === n" :aria-label="t('{count} yıldız', {count: n})"
      :tabindex="(modelValue || 1) === n ? 0 : -1"
      :class="{off: n > (hover || modelValue)}"
      @mouseenter="hover = n" @click="emit('update:modelValue', n)">
      <Star :size="size" aria-hidden="true"/>
    </button>
  </span>
</template>

<style scoped>
.profile-star-input{display:inline-flex;gap:2px;flex:none}
.star{display:grid;place-items:center;color:var(--orange-500);border-radius:6px;transition:transform .1s ease}
.star:hover{transform:scale(1.08)}
.star :deep(svg){fill:currentColor;stroke:currentColor}
.star.off{color:var(--cream-200)}
</style>
