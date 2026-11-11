<script setup lang="ts">
import {useLocale} from '~/composables/useLocale';
import type {BrandCreative} from '@otosanayide/core/brand-campaigns';

defineProps<{value: BrandCreative}>();
const {t} = useLocale();
</script>

<template>
  <aside class="brand-banner-preview bbp">
    <span class="ds-badge sp bbp-tag">{{ t('Marka reklamı · Önizleme') }}</span>
    <p class="bbp-brand">{{ value.brand||t('Marka adı') }}</p>
    <h3 class="ds-serif">{{ value.headline||t('Reklam başlığın burada görünecek.') }}</h3>
    <p class="bbp-desc">{{ value.description||t('Hizmetini açık ve doğru bilgilerle anlat.') }}</p>
    <span class="ds-btn s sm bbp-cta">{{ t('Bilgi al') }}</span>
    <small>{{ value.url||'https://…' }}</small>
  </aside>
</template>

<style scoped>
.bbp {background: #10243a; border-radius: 18px; padding: 32px 40px; gap: 8px;}
.bbp-tag {justify-self: start; color: #a63c09;}
.bbp-brand {font-size: 13px; color: #c7d1dc;}
.bbp h3 {color: #fff; font-size: 30px; line-height: 1.15;}
.bbp-desc {font-size: 15px; color: #c7d1dc;}
.bbp-cta {justify-self: start; margin-top: 4px; border-color: transparent;}
.bbp small {color: #c7d1dc;}
@media (max-width: 760px) {
  .bbp {padding: 24px;}
  .bbp h3 {font-size: 24px;}
}
</style>
