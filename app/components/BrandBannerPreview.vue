<script setup lang="ts">
import {useLocale} from '~/composables/useLocale';
import type {BrandCreative} from '@otosanayide/core/brand-campaigns';

defineProps<{value: BrandCreative}>();
const {t} = useLocale();
</script>

<template>
  <aside class="brand-banner-preview">
    <span>{{ t('Marka reklamı · Önizleme') }}</span>
    <p>{{ value.brand||t('Marka adı') }}</p>
    <h3>{{ value.headline||t('Reklam başlığın burada görünecek.') }}</h3>
    <p>{{ value.description||t('Hizmetini açık ve doğru bilgilerle anlat.') }}</p>
    <span class="badge">{{ t('Bilgi al') }}</span>
    <small>{{ value.url||'https://…' }}</small>
  </aside>
</template>
