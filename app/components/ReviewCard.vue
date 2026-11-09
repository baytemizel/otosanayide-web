<script setup lang="ts">
import {Star} from '@lucide/vue';
import CaseButton from '~/components/CaseButton.vue';
import ReviewPhotoGallery from '~/components/ReviewPhotoGallery.vue';
import {useLocale} from '~/composables/useLocale';
import type {ReviewView} from '~/lib/reviews-helpers';

withDefaults(defineProps<{review: ReviewView; reportable?: boolean}>(), {reportable: false});

const dimensions = {quality: 'Hizmet kalitesi', payment: 'Ödeme kolaylığı', cleanliness: 'İşletme temizliği', wcCleanliness: 'WC temizliği'};
const dimensionEntries = Object.entries(dimensions) as [keyof typeof dimensions, string][];
const resolvedLabels: Record<string, string> = {yes: 'Çözüldü', partial: 'Kısmen çözüldü', no: 'Çözülmedi', unknown: 'Belirtilmedi'};
const wcLabels: Record<string, string> = {yes: 'Var', no: 'Yok', unknown: 'Bilinmiyor'};

const {t: i18nT} = useLocale();
</script>

<template>
  <article class="panel review-card">
    <div class="row between">
      <strong>{{ i18nT('Hizmet deneyimi') }}</strong>
      <span class="row"><Star :size="17" aria-hidden="true"/>{{ review.rating }}/5</span>
    </div>
    <p class="review-text">{{ review.text }}</p>
    <div class="tags">
      <template v-for="[k,label] in dimensionEntries" :key="k"><span v-if="review[k]">{{ i18nT(label) }}: {{ review[k] }}/5</span></template>
      <span>{{ i18nT('Sorun: ') }}{{ i18nT(resolvedLabels[review.resolved]??'Belirtilmedi') }}</span>
      <span>{{ i18nT('WC: ') }}{{ i18nT(wcLabels[review.wc]??'Bilinmiyor') }}</span>
    </div>
    <ReviewPhotoGallery v-if="review.photoIds?.length" :ids="review.photoIds"/>
    <div v-if="review.reply" class="notice review-reply">
      <strong>{{ i18nT('İşletmenin yanıtı') }}</strong>
      <p class="review-text">{{ review.reply.text }}</p>
    </div>
    <CaseButton v-if="reportable" :reviewId="review.id" kind="report"/>
  </article>
</template>
