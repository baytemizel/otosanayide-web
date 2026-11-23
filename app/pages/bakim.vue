<script setup lang="ts">
import V2Button from '~/components/v2/V2Button.vue';
import SystemStateView from '~/components/v2/system/SystemStateView.vue';
import {useLocale} from '~/composables/useLocale';

// S06 · Bakım çalışması (Figma 128:628). There is no status page yet, so the button reloads.
const {t} = useLocale();
useSeoMeta({title: () => t('Bakım çalışması'), robots: 'noindex'});
const reload = () => window.location.reload();
</script>

<template>
  <SystemStateView doodle="sys-bakim" :eyebrow="t('Bakım')" :title="t('Kısa bir bakımdayız.')" :text="t('Sistemi güncelliyoruz; birazdan yeniden buradayız. Kayıtların ve hatırlatmaların etkilenmez.')">
    <V2Button size="lg" arrow @click="reload">{{ t('Durum sayfası') }}</V2Button>
  </SystemStateView>
</template>
