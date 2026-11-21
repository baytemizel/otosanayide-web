<script setup lang="ts">
import {computed} from 'vue';
import {Lock} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import SystemStateView from '~/components/v2/system/SystemStateView.vue';
import {useLocale} from '~/composables/useLocale';
import {portalUrl} from '~/lib/portal';

// S05 · Yetkisiz erişim (Figma 128:511).
const {t} = useLocale();
useSeoMeta({title: () => t('Yetki gerekli'), robots: 'noindex'});
const claimHref = computed(() => portalUrl('claim') ?? '/#isletmeler');
</script>

<template>
  <SystemStateView :icon="Lock" :eyebrow="t('Yetki gerekli')" :title="t('Bu sayfa için yetkin yok.')" :text="t('Bu alan yalnızca işletme yöneticilerine açık. İşletme seninse sahiplik başvurusu yapabilirsin.')">
    <V2Button size="lg" arrow :href="claimHref">{{ t('Sahiplik başvurusu') }}</V2Button>
    <V2Button variant="outline" to="/">{{ t('Ana sayfaya dön') }}</V2Button>
  </SystemStateView>
</template>
