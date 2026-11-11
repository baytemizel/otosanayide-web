<script setup lang="ts">
import BusinessPhotosPublicGallery from '~/components/BusinessPhotosPublicGallery.vue';
import {publicEnv} from '~/lib/env';

withDefaults(defineProps<{businessId: string; sample?: boolean; coverId?: string}>(), {sample: false});
const enabled = publicEnv().businessPhotosEnabled;
</script>

<template>
  <BusinessPhotosPublicGallery v-if="!sample && enabled" :key="businessId" :businessId="businessId" :coverId="coverId"/>
</template>
