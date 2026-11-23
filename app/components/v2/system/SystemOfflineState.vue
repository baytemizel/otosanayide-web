<script setup lang="ts">
import V2Button from '~/components/v2/V2Button.vue';
import SystemStateView from '~/components/v2/system/SystemStateView.vue';
import {useLocale} from '~/composables/useLocale';

// S04 · Bağlantı kesildi (Figma 128:389).
const emit = defineEmits<{retry: []; browse: []}>();
const {t} = useLocale();
</script>

<template>
  <SystemStateView doodle="sys-baglanti" :eyebrow="t('Çevrimdışı')" :title="t('Bağlantı kesildi.')" :text="t('İnternet bağlantını kontrol et. Son baktığın işletmeleri çevrimdışıyken de görebilirsin.')">
    <V2Button size="lg" arrow @click="emit('retry')">{{ t('Tekrar dene') }}</V2Button>
    <V2Button variant="outline" @click="emit('browse')">{{ t('Son görüntülenenler') }}</V2Button>
  </SystemStateView>
</template>
