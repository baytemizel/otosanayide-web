<script setup lang="ts">
withDefaults(defineProps<{tone?: 'neutral' | 'warn' | 'err' | 'info'; title: string; text?: string}>(), {tone: 'neutral', text: ''});
</script>

<template>
  <div class="system-state">
    <span class="system-icon" :class="tone"><slot name="icon"/></span>
    <h1 class="ds-serif">{{ title }}</h1>
    <p v-if="text">{{ text }}</p>
    <div class="ds-row ds-g12 ds-wrap system-actions"><slot/></div>
  </div>
</template>

<style scoped>
.system-state {display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 110px 16px 120px; text-align: center;}
.system-icon {display: grid; place-items: center; width: 96px; height: 96px; border-radius: 48px; background: #f4f6f8; color: #10243a;}
.system-icon.warn {background: #fff6df; color: #8a5a00;}
.system-icon.err {background: #fdecea; color: #b42318;}
.system-icon.info {background: #eaf0f8; color: #2459b4;}
h1 {margin: 0; font-size: 34px; line-height: 38px;}
p {margin: 0; max-width: 560px; color: #586879; font-size: 15px; line-height: 22.5px;}
.system-actions {justify-content: center;}
@media (max-width: 760px) {
  .system-state {padding: 64px 16px 72px;}
  h1 {font-size: 28px; line-height: 32px;}
}
</style>
