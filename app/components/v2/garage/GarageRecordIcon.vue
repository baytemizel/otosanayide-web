<script setup lang="ts">
import {computed} from 'vue';
import {BatteryCharging, Droplet, File, LifeBuoy, ShieldCheck, Wrench} from '@lucide/vue';
import type {MockRecordIcon} from '~/data/mock/garage';

// 48 px tinted circle with the record's Lucide icon (W11 "Kayıt satırı").
const props = defineProps<{icon: MockRecordIcon}>();
const map = {
  wrench: {is: Wrench, tone: 'orange'},
  tyre: {is: LifeBuoy, tone: 'lime'},
  shield: {is: ShieldCheck, tone: 'sky'},
  battery: {is: BatteryCharging, tone: 'lime'},
  droplet: {is: Droplet, tone: 'orange'},
  file: {is: File, tone: 'cream'},
} as const;
const item = computed(() => map[props.icon]);
</script>

<template>
  <span class="record-icon" :class="[item.tone, icon]" aria-hidden="true"><component :is="item.is" :size="20"/></span>
</template>

<style scoped>
.record-icon{flex:none;width:48px;height:48px;border-radius:999px;display:grid;place-items:center;color:var(--ink-900)}
.orange{background:var(--orange-100)}
.lime{background:var(--lime-100)}
.sky{background:var(--sky-200)}
.cream{background:var(--cream-100)}
/* Lucide has no tyre: the life buoy turned 45° gives the straight spokes of the Figma icon. */
.tyre :deep(svg){transform:rotate(45deg)}
</style>
