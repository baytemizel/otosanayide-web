<script setup lang="ts">
import {computed} from 'vue';
import {Lock} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import SystemStateView from '~/components/v2/system/SystemStateView.vue';
import {portalUrl} from '~/lib/portal';

// S05 · Yetkisiz erişim (Figma 128:511).
useSeoMeta({title: 'Yetki gerekli', robots: 'noindex'});
const claimHref = computed(() => portalUrl('claim') ?? '/#isletmeler');
</script>

<template>
  <SystemStateView :icon="Lock" eyebrow="Yetki gerekli" title="Bu sayfa için yetkin yok." text="Bu alan yalnızca işletme yöneticilerine açık. İşletme seninse sahiplik başvurusu yapabilirsin.">
    <V2Button size="lg" arrow :href="claimHref">Sahiplik başvurusu</V2Button>
    <V2Button variant="outline" to="/">Ana sayfaya dön</V2Button>
  </SystemStateView>
</template>
