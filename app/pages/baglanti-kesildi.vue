<script setup lang="ts">
import SystemOfflineState from '~/components/v2/system/SystemOfflineState.vue';
import {useLocale} from '~/composables/useLocale';

// Preview route for S04; the same state replaces the page automatically when the browser goes offline.
const {t} = useLocale();
useSeoMeta({title: () => t('Bağlantı kesildi'), robots: 'noindex'});
const reload = () => window.location.reload();
</script>

<template>
  <SystemOfflineState @retry="reload" @browse="navigateTo('/')"/>
</template>
