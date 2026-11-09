<script setup lang="ts">
import {ref} from 'vue';
import BusinessPhotosOwnerPage from '~/components/BusinessPhotosOwnerPage.vue';

defineProps<{businessId: string}>();
const revision = ref(0);

function reload() {
  revision.value += 1;
}
</script>

<template>
  <BusinessPhotosOwnerPage :key="revision" :businessId="businessId" :reload="reload"/>
</template>
