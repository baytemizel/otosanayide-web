<script setup lang="ts">
import {MapPin} from '@lucide/vue';

// Styled mock map (Figma "Mini harita"): static street art with a centred pin. No map SDK.
defineProps<{label: string}>();
</script>

<template>
  <div class="profile-mini-map" role="img" :aria-label="label">
    <img src="/v2/profile/mini-map.svg" alt="" width="340" height="260" class="art">
    <span class="pin"><MapPin :size="20" aria-hidden="true"/></span>
  </div>
</template>

<style scoped>
.profile-mini-map{position:relative;overflow:hidden;border-radius:18px;background:var(--cream-100);width:340px;height:260px;flex:none}
.art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pin{position:absolute;left:44%;top:37%;display:grid;place-items:center;width:44px;height:44px;border-radius:999px;background:var(--ink-900);color:var(--lime-400)}
</style>
