<script setup lang="ts">
import {ref, useTemplateRef} from 'vue';
import {ArrowUpRight} from '@lucide/vue';
import {useBrandMeasurement} from '~/composables/useBrandMeasurement';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {brandAppCheckToken} from '~/lib/brand-app-check';
import {loadBrandBanner} from '@otosanayide/core/brand-banner-client';
import type {BrandPublicItem} from '@otosanayide/core/brand-publication';

const props = defineProps<{city: string; category: string}>();
const {t} = useLocale();
const banner = useTemplateRef<HTMLElement>('banner');
const ready = ref(false);
const ad = ref<{item: BrandPublicItem; url: string} | null>(null);
const emit = useBrandMeasurement(banner, () => ready.value, () => ad.value?.item.metrics);

useClientEffect(() => [props.city, props.category], () => {
  const controller = new AbortController();
  let url: string | undefined, expiry: ReturnType<typeof setTimeout> | undefined;
  const timeout = setTimeout(() => controller.abort(), 20000);
  ad.value = null;
  ready.value = false;
  loadBrandBanner({city: props.city, category: props.category, placement: props.category ? 'category_banner' : 'home_banner'}, brandAppCheckToken, apiFetch, controller.signal).then(result => {
    if (!result || controller.signal.aborted) return;
    const remaining = (result.item.image.expiresAtMs ?? 0) - Date.now();
    if (remaining <= 0) return;
    url = URL.createObjectURL(result.blob);
    ad.value = {item: result.item, url};
    expiry = setTimeout(() => {
      ad.value = null;
      if (url) {
        URL.revokeObjectURL(url);
        url = undefined;
      }
    }, remaining);
  }).catch(() => {
    if (!controller.signal.aborted) ad.value = null;
  }).finally(() => clearTimeout(timeout));
  return () => {
    controller.abort();
    clearTimeout(timeout);
    if (expiry) clearTimeout(expiry);
    if (url) URL.revokeObjectURL(url);
  };
});

function onCardClick(e: MouseEvent, item: BrandPublicItem) {
  if (Date.now() >= item.image.expiresAtMs!) {
    e.preventDefault();
    ad.value = null;
  } else if (e.isTrusted) emit('click');
}
function onCardAuxClick(e: MouseEvent, item: BrandPublicItem) {
  if (e.isTrusted && e.button === 1 && Date.now() < item.image.expiresAtMs!) emit('click');
}
function onImageError(url: string) {
  URL.revokeObjectURL(url);
  ad.value = null;
}
</script>

<template>
  <aside v-if="ad&&ad.item.image.expiresAtMs&&Date.now()<ad.item.image.expiresAtMs" ref="banner" class="brand-public bb" :aria-label="t('Sponsorlu marka reklamı')">
    <a class="brand-public-card bb-card" :href="ad.item.destinationUrl" target="_blank" rel="sponsored noopener noreferrer" :aria-label="t('{0} hakkında bilgi al',{'0':ad.item.brand})" @click="onCardClick($event,ad.item)" @auxclick="onCardAuxClick($event,ad.item)">
      <div class="brand-public-copy bb-copy">
        <span class="ds-badge sp">{{ t('Marka reklamı') }}</span>
        <span class="bb-brand">{{ ad.item.brand }}</span>
        <h3 class="ds-serif">{{ ad.item.headline }}</h3>
        <p>{{ ad.item.description }}</p>
        <span class="ds-btn s bb-cta">{{ t('Bilgi al') }}<ArrowUpRight :size="18"/></span>
      </div>
      <div class="brand-public-image bb-image"><img :src="ad.url" alt="" :width="ad.item.image.width" :height="ad.item.image.height" @load="ready=true" @error="onImageError(ad.url)"/></div>
    </a>
    <p class="brand-public-notice">{{ t('Ücretli marka tanıtımıdır. Tavsiye veya hizmet kalitesi garantisi değildir.') }}</p>
  </aside>
</template>

<style scoped>
.bb {margin: 40px 0 0;}
.bb-card {border: 0; border-radius: 18px; background: #10243a;}
.bb-card:focus-visible {outline: 2px solid #2459b4; outline-offset: 3px;}
.bb-copy {gap: 8px; padding: 32px 40px;}
.bb-copy h3 {margin: 0; font-size: 30px; line-height: 1.15; color: #fff;}
.bb-copy p {margin: 0; font-size: 15px; color: #c7d1dc;}
.bb-brand {font-size: 13px; color: #c7d1dc;}
.bb-cta {margin-top: 8px; border-color: transparent;}
.bb-image {background: #10243a;}
@media (max-width: 760px) {
  .bb-copy {padding: 24px;}
  .bb-copy h3 {font-size: 24px;}
}
</style>
