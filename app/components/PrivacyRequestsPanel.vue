<script setup lang="ts">
import PrivacyRequestsPanelBody from '~/components/PrivacyRequestsPanelBody.vue';
import {useApp} from '~/composables/useApp';

const app = useApp();
</script>

<template>
  <PrivacyRequestsPanelBody :key="app.demo?'demo':app.user?.uid??'guest'"/>
</template>
