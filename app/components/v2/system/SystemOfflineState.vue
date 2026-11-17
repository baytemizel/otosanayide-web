<script setup lang="ts">
import {WifiOff} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import SystemStateView from '~/components/v2/system/SystemStateView.vue';

// S04 · Bağlantı kesildi (Figma 128:389).
const emit = defineEmits<{retry: []; browse: []}>();
</script>

<template>
  <SystemStateView :icon="WifiOff" eyebrow="Çevrimdışı" title="Bağlantı kesildi." text="İnternet bağlantını kontrol et. Son baktığın işletmeleri çevrimdışıyken de görebilirsin.">
    <V2Button size="lg" arrow @click="emit('retry')">Tekrar dene</V2Button>
    <V2Button variant="outline" @click="emit('browse')">Son görüntülenenler</V2Button>
  </SystemStateView>
</template>
