<script setup lang="ts">
import {categoryIconPath} from '@otosanayide/core/category-visual';

withDefaults(defineProps<{category: string; size?: number}>(), {size: 24});
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 96 96" fill="currentColor" aria-hidden="true" focusable="false">
    <path :d="categoryIconPath(category)" fill-rule="evenodd"/>
  </svg>
</template>
