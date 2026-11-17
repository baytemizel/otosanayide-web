<script setup lang="ts">
import {List, Map as MapIcon} from '@lucide/vue';

// "Görünüm seçici" (Figma 119:257): list / map switch.
defineProps<{view: 'liste' | 'harita'}>();
const emit = defineEmits<{change: [view: 'liste' | 'harita']}>();
</script>

<template>
  <div class="views" role="group" aria-label="Görünüm">
    <button type="button" class="t-label-sm" :class="{on: view === 'liste'}" :aria-pressed="view === 'liste'" @click="emit('change', 'liste')">
      <List :size="15" aria-hidden="true"/>Liste
    </button>
    <button type="button" class="t-label-sm" :class="{on: view === 'harita'}" :aria-pressed="view === 'harita'" @click="emit('change', 'harita')">
      <MapIcon :size="15" aria-hidden="true"/>Harita
    </button>
  </div>
</template>

<style scoped>
.views{display:inline-flex;gap:4px;padding:4px;border-radius:999px;background:var(--cream-100)}
button{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:999px;color:var(--ink-700)}
button :deep(svg){color:var(--ink-700)}
button.on{background:var(--ink-900);color:var(--white)}
button.on :deep(svg){color:var(--lime-400)}
</style>
