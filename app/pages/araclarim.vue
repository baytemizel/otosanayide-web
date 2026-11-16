<script setup lang="ts">
import Garage from '~/components/Garage.vue';
import SystemAccountLayout from '~/components/SystemAccountLayout.vue';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
useSeoMeta({title: () => i18nT('Araçlarım')});
</script>

<template>
  <SystemAccountLayout>
    <Garage/>
  </SystemAccountLayout>
</template>
