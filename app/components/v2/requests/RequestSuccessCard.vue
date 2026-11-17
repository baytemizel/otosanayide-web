<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Check} from '@lucide/vue';

// Success state after a mock submit (W14 talep, W16 randevu). Takes focus so screen readers announce it.
defineProps<{eyebrow: string; title: string; text: string}>();
const root = ref<HTMLElement | null>(null);
onMounted(() => root.value?.focus());
</script>

<template>
  <section ref="root" class="success surface" tabindex="-1" role="status" aria-live="polite">
    <span class="mark" aria-hidden="true"><Check :size="28" :stroke-width="2.5"/></span>
    <p class="t-mono-sm t-muted">{{ eyebrow }}</p>
    <h2 class="t-h3">{{ title }}</h2>
    <p class="t-body-md t-muted text">{{ text }}</p>
    <slot/>
    <div v-if="$slots.actions" class="actions"><slot name="actions"/></div>
  </section>
</template>

<style scoped>
.success{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:40px 32px;outline:none}
.mark{width:64px;height:64px;border-radius:999px;background:var(--ink-900);color:var(--lime-400);display:grid;place-items:center;margin-bottom:8px}
.text{max-width:560px}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px}
@media (max-width:760px){.success{padding:28px 22px}}
</style>
