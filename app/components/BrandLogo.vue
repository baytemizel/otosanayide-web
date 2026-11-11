<script setup lang="ts">
import {computed} from 'vue';

const props = withDefaults(defineProps<{dark?: boolean; scale?: number}>(), {dark: false, scale: 1});
const width = computed(() => Math.round(54 * props.scale));
const height = computed(() => Math.round(32 * props.scale));
</script>

<template>
  <span class="ds-logo">
    <img :src="dark ? '/brand/logo-mark-dark.svg' : '/brand/logo-mark-light.svg'" alt="" :width="width" :height="height">
    <span :style="{fontSize: Math.round(23 * scale) + 'px', color: dark ? '#fff' : '#10243a'}">otosanayide<b>.</b></span>
  </span>
</template>
