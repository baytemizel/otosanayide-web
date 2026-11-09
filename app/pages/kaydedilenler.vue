<script setup lang="ts">
import {computed} from 'vue';
import SavedPage from '~/components/SavedPage.vue';
import {useApp} from '~/composables/useApp';

const app = useApp();
const scope = computed(() => (app.demo ? 'demo' : app.user?.uid ?? 'guest') + ':' + app.data.favorites.join(','));
</script>

<template>
  <SavedPage :key="scope"/>
</template>
