<script setup lang="ts">
import {Star} from '@lucide/vue';
import CaseButton from '~/components/CaseButton.vue';
import ReviewPhotoGallery from '~/components/ReviewPhotoGallery.vue';
import {useLocale} from '~/composables/useLocale';
import type {ReviewView} from '~/lib/reviews-helpers';

withDefaults(defineProps<{review: ReviewView; reportable?: boolean}>(), {reportable: false});

const dimensions = {quality: 'Hizmet kalitesi', payment: 'Ödeme kolaylığı', cleanliness: 'Temizlik', wcCleanliness: 'WC temizliği'};
const dimensionEntries = Object.entries(dimensions) as [keyof typeof dimensions, string][];
const resolvedLabels: Record<string, string> = {yes: 'Evet', partial: 'Kısmen', no: 'Hayır', unknown: 'Belirtilmedi'};
const wcLabels: Record<string, string> = {yes: 'Var', no: 'Yok', unknown: 'Bilinmiyor'};

const {t: i18nT} = useLocale();
</script>

<template>
  <article class="rc">
    <div class="ds-row ds-sb ds-g12">
      <strong class="rc-title">{{ i18nT('Hizmet deneyimi') }}</strong>
      <span class="ds-stars" role="img" :aria-label="`${review.rating}/5`"><Star v-for="n in 5" :key="n" :size="13" :fill="n<=review.rating?'currentColor':'none'"/></span>
    </div>
    <p class="review-text rc-text">{{ review.text }}</p>
    <div class="ds-row ds-g8 ds-wrap">
      <template v-for="[k,label] in dimensionEntries" :key="k"><span v-if="review[k]" class="ds-chip">{{ i18nT(label) }}: {{ review[k] }}/5</span></template>
      <span class="ds-chip">{{ i18nT('Sorun çözüldü') }}: {{ i18nT(resolvedLabels[review.resolved]??'Belirtilmedi') }}</span>
      <span class="ds-chip">{{ i18nT('WC: ') }}{{ i18nT(wcLabels[review.wc]??'Bilinmiyor') }}</span>
    </div>
    <ReviewPhotoGallery v-if="review.photoIds?.length" :ids="review.photoIds"/>
    <div v-if="review.reply" class="rc-reply">
      <strong>{{ i18nT('İşletme yanıtı') }}</strong>
      <p class="review-text ds-muted">{{ review.reply.text }}</p>
    </div>
    <div class="ds-row ds-g16 ds-wrap rc-actions">
      <span class="ds-xs ds-muted ds-passive" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Faydalı') }}</span>
      <CaseButton v-if="reportable" :reviewId="review.id" kind="report"/>
    </div>
  </article>
</template>

<style scoped>
.rc {display: flex; flex-direction: column; gap: 8px; padding: 18px 0; border-top: 1px solid #edf0f3;}
.rc-title {font-size: 13px;}
.rc-text {font-size: 15px;}
.rc-reply {display: flex; flex-direction: column; padding: 8px 14px; border-left: 3px solid #f36b21; border-radius: 0 10px 10px 0; background: #f7f9fa; font-size: 13px;}
.rc-actions {min-height: 18px;}
@media (max-width: 760px) {
  .rc {margin-bottom: 12px; padding: 16px; border: 1px solid #dfe5eb; border-radius: 14px;}
  .rc-title {font-size: 15px;}
  .rc-text {font-size: 13px;}
}
</style>
