<script setup lang="ts">
import {Wrench} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import SystemStateView from '~/components/v2/system/SystemStateView.vue';

// S06 · Bakım çalışması (Figma 128:628). There is no status page yet, so the button reloads.
useSeoMeta({title: 'Bakım çalışması', robots: 'noindex'});
const reload = () => window.location.reload();
</script>

<template>
  <SystemStateView :icon="Wrench" eyebrow="Bakım" title="Kısa bir bakımdayız." text="Sistemi güncelliyoruz; birazdan yeniden buradayız. Kayıtların ve hatırlatmaların etkilenmez.">
    <V2Button size="lg" arrow @click="reload">Durum sayfası</V2Button>
  </SystemStateView>
</template>
