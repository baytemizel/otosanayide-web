<script setup lang="ts">
// V2/Logo/Light and V2/Logo/Dark: logo mark (61.5×36) + "otosanayide." wordmark.
withDefaults(defineProps<{dark?: boolean; compact?: boolean}>(), {dark: false, compact: false});
</script>

<template>
  <span class="v2-logo" :class="{dark, compact}">
    <img :src="dark ? '/brand/logo-mark-dark.svg' : '/brand/logo-mark-light.svg'" alt="" width="164" height="96">
    <span class="word">otosanayide<b>.</b></span>
  </span>
</template>

<style scoped>
.v2-logo{display:inline-flex;align-items:center;gap:10px}
img{width:61.5px;height:36px}
.word{font-family:var(--font-display);font-weight:700;font-size:26px;line-height:1.2;letter-spacing:-.025em;color:var(--ink-900);white-space:nowrap}
.word b{color:var(--orange-500)}
.dark .word{color:var(--white)}
.compact{gap:8px}
.compact img{width:49.2px;height:28.8px}
.compact .word{font-size:20.8px}
</style>
