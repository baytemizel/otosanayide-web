<script setup lang="ts">
import type {Component} from 'vue';

// "Durum" block of S02 (Kapsam dışı il, Figma 128:189) and S03 (Sonuç bulunamadı, 128:312):
// icon in a lime ring, eyebrow, H2, text, optional chips, actions and a footnote.
defineProps<{icon: Component; eyebrow: string; title: string; text: string}>();
</script>

<template>
  <section class="state v2-wrap" aria-live="polite">
    <div class="visual" aria-hidden="true">
      <span class="inner"><component :is="icon" :size="46" :stroke-width="2"/></span>
    </div>
    <p class="t-mono-md t-eyebrow">{{ eyebrow }}</p>
    <h1 class="t-h2 title">{{ title }}</h1>
    <p class="t-body-md t-muted text">{{ text }}</p>
    <slot name="chips"/>
    <div class="actions"><slot/></div>
    <slot name="after"/>
  </section>
</template>

<style scoped>
.state{display:flex;flex-direction:column;align-items:center;gap:22px;padding-top:80px;padding-bottom:120px;text-align:center}
.visual{display:grid;place-items:center;width:176px;height:176px;border-radius:999px;background:var(--lime-100)}
.inner{display:grid;place-items:center;width:112px;height:112px;border-radius:999px;background:var(--ink-900);color:var(--lime-400)}
.title{max-width:860px}
.text{max-width:560px}
.actions{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;padding-top:8px}
@media (max-width:760px){
  .state{padding-top:48px;padding-bottom:72px}
  .visual{width:140px;height:140px}
  .inner{width:92px;height:92px}
}
</style>
