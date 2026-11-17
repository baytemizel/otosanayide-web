<script setup lang="ts">
import type {Component} from 'vue';

// "Durum" block shared by the v2 system screens (Figma 13 · Web v2 · Sistem & Durumlar):
// either a big code (404) or an icon in two circles, then eyebrow, H2, text and actions.
defineProps<{icon?: Component; code?: string; eyebrow: string; title: string; text: string}>();
</script>

<template>
  <section class="state v2-wrap">
    <p v-if="code" class="code" aria-hidden="true">
      <span v-for="(digit, index) in code.split('')" :key="index" :class="{accent: index === 1}">{{ digit }}</span>
    </p>
    <div v-else-if="icon" class="visual" aria-hidden="true">
      <span class="inner"><component :is="icon" :size="46" :stroke-width="2"/></span>
    </div>
    <p class="t-mono-md t-eyebrow">{{ eyebrow }}</p>
    <h1 class="t-h2 title">{{ title }}</h1>
    <p class="t-body-md t-muted text">{{ text }}</p>
    <div v-if="$slots.default" class="actions"><slot/></div>
    <slot name="after"/>
  </section>
</template>

<style scoped>
.state{display:flex;flex-direction:column;align-items:center;gap:22px;padding-top:80px;padding-bottom:120px;text-align:center}
.code{font-family:var(--font-display);font-weight:800;font-size:220px;line-height:.9;letter-spacing:-.05em;color:var(--ink-900)}
.code .accent{color:var(--orange-500)}
.visual{display:grid;place-items:center;width:176px;height:176px;border-radius:999px;background:var(--orange-100)}
.inner{display:grid;place-items:center;width:112px;height:112px;border-radius:999px;background:var(--ink-900);color:var(--lime-400)}
.title{max-width:860px}
.text{max-width:560px}
.actions{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;padding-top:8px}
@media (max-width:760px){
  .state{padding-top:48px;padding-bottom:72px}
  .code{font-size:140px}
  .visual{width:140px;height:140px}
  .inner{width:92px;height:92px}
}
</style>
