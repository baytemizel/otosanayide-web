<script setup lang="ts">
import {useApp} from '~/composables/useApp';
import RecyclePanel from '~/components/RecyclePanel.vue';

const app = useApp();
</script>

<template>
  <RecyclePanel :key="app.demo?'demo':app.user?.uid??'guest'"/>
</template>
