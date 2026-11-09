<script setup lang="ts">
import {computed, ref} from 'vue';
import type {Business} from '@otosanayide/core';
import {useLocale} from '~/composables/useLocale';
import {apiUrl} from '~/lib/api';

const props = defineProps<{business: Business; large: boolean}>();
const error = ref(false);
const {t} = useLocale();
const src = computed(() => apiUrl(`/api/businesses/photos/media?businessId=${encodeURIComponent(props.business.id)}&id=${encodeURIComponent(props.business.coverPhotoId!)}${props.large ? '' : '&size=thumbnail'}`));
</script>

<template>
  <slot v-if="error" name="fallback"/>
  <img v-else loading="lazy" decoding="async" :class="large?'profile-photo':''" :src="src" :alt="t('{0} işletme fotoğrafı',{'0':business.name})" @error="error=true"/>
</template>
