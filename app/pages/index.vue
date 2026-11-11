<script setup lang="ts">
import Discovery from '~/components/Discovery.vue';
import {useLocale} from '~/composables/useLocale';
import {usePageSeo} from '~/composables/usePageSeo';

const {t: i18nT} = useLocale();
usePageSeo({
  description: () => i18nT('41 ilde özel oto servis, oto kuaför, kaporta ve bakım işletmelerini keşfet.'),
  path: '/',
});
</script>

<template>
  <Discovery/>
</template>
