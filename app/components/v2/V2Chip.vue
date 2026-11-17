<script setup lang="ts">
// V2/Chip/{Default,Active,Soft,Dark,DarkActive}. As a button it reports its pressed state.
withDefaults(defineProps<{
  variant?: 'default' | 'active' | 'soft' | 'dark' | 'dark-active';
  as?: 'span' | 'button';
  pressed?: boolean;
}>(), {variant: 'default', as: 'span', pressed: undefined});
</script>

<template>
  <button v-if="as === 'button'" type="button" class="chip" :class="`chip-${variant}`" :aria-pressed="pressed"><slot/></button>
  <span v-else class="chip" :class="`chip-${variant}`"><slot/></span>
</template>
