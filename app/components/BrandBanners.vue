<script setup lang="ts">
import ActiveBrandBanner from '~/components/ActiveBrandBanner.vue';
import {useApp} from '~/composables/useApp';
import {brandAdsEnabled} from '~/lib/brand-app-check';
import {brandPublicContext} from '@otosanayide/core/brand-publication';

const props = defineProps<{city: string; category: string}>();
const app = useApp();
const hidden = () => app.demo || !brandAdsEnabled() || !brandPublicContext.safeParse({city: props.city, category: props.category, placement: props.category ? 'category_banner' : 'home_banner'}).success;
</script>

<template>
  <ActiveBrandBanner v-if="!hidden()" :key="JSON.stringify([city,category])" :city="city" :category="category"/>
</template>
