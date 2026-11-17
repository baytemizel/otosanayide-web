<script setup lang="ts">
import {nextTick, onBeforeUnmount, ref, watch} from 'vue';
import {X} from '@lucide/vue';

// Modal shell from the v2 modal frames (S08, W07, W12): white panel, 32 px radius, dark scrim.
const props = withDefaults(defineProps<{open: boolean; title: string; subtitle?: string; width?: number}>(), {width: 640});
const emit = defineEmits<{close: []}>();
const panel = ref<HTMLElement | null>(null);
let previous: Element | null = null;

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

watch(() => props.open, async (open) => {
  if (!import.meta.client) return;
  if (open) {
    previous = document.activeElement;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    await nextTick();
    panel.value?.focus();
  } else {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    (previous as HTMLElement | null)?.focus?.();
  }
}, {immediate: true});

onBeforeUnmount(() => {
  if (!import.meta.client) return;
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="v2-modal-scrim" @click.self="emit('close')">
      <section ref="panel" class="v2-modal" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1" :style="{maxWidth: `${width}px`}">
        <header class="head">
          <div class="titles">
            <h2 class="t-h3">{{ title }}</h2>
            <p v-if="subtitle" class="t-body-sm t-muted">{{ subtitle }}</p>
            <slot name="head"/>
          </div>
          <button type="button" class="close" aria-label="Kapat" @click="emit('close')"><X :size="18" aria-hidden="true"/></button>
        </header>
        <slot/>
        <template v-if="$slots.footer">
          <hr class="divider">
          <footer class="foot"><slot name="footer"/></footer>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.v2-modal-scrim{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:rgba(10,21,36,.55);overflow-y:auto}
.v2-modal{width:100%;display:flex;flex-direction:column;gap:20px;padding:32px;background:var(--white);border-radius:32px;box-shadow:var(--shadow-modal);outline:none}
.head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.titles{display:flex;flex-direction:column;gap:4px;min-width:0}
.close{flex:none;width:40px;height:40px;border-radius:999px;background:var(--cream-100);display:grid;place-items:center;color:var(--ink-900)}
.foot{display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap}
@media (max-width:760px){.v2-modal{padding:24px;border-radius:24px}}
</style>
