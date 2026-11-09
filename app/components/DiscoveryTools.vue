<script setup lang="ts">
import {computed} from 'vue';
import type {Business} from '@otosanayide/core';
import type {SavedCriteria} from '@otosanayide/core/discovery-tools';
import DiscoveryToolsSession from '~/components/DiscoveryToolsSession.vue';
import {useApp} from '~/composables/useApp';

defineProps<{items: Business[]; criteria: SavedCriteria; onApply: (v: SavedCriteria) => void}>();

const app = useApp();
const scope = computed(() => (app.member ? (app.demo ? 'demo' : app.user?.uid) : undefined));
</script>

<template>
  <DiscoveryToolsSession :key="scope??'guest'" :items="items" :criteria="criteria" :onApply="onApply" :scope="scope"/>
</template>
