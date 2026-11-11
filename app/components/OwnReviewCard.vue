<script setup lang="ts">
import {useLocale} from '~/composables/useLocale';
import type {OwnReviewView} from '~/lib/own-review-status-helpers';

defineProps<{review: OwnReviewView}>();
const {t: i18nT} = useLocale();
</script>

<template>
  <section class="ds-surface orc">
    <h3>{{ i18nT('Yorumunun durumu') }}</h3>
    <p role="status" class="ds-small ds-b">{{ i18nT({pending:'İnceleme bekliyor',approved:'Yayımlandı',rejected:'Reddedildi',hidden:'Yayında değil',withdrawn:'Geri çekildi'}[review.status]??'Belirtilmedi') }}{{ review.rating!==null?` · ${review.rating}/5`:'' }}</p>
    <p class="review-text ds-small">{{ review.text }}</p>
    <p v-if="review.reason" class="ds-small"><strong>{{ i18nT('İnceleme gerekçesi') }}: </strong>{{ review.reason }}</p>
    <p v-if="review.status==='pending'" class="ds-xs ds-muted">{{ i18nT('Yorumun henüz kamuya açık değil ve puan ortalamasına dahil edilmiyor.') }}</p>
    <p v-if="!review.canEdit&&['hidden','withdrawn'].includes(review.status)" class="ds-xs ds-muted">{{ i18nT('Yönetici tarafından kaldırılan yorum için yeniden gönderim kapalıdır. İnceleme kararı geri çekmeyle aşılamaz.') }}</p>
  </section>
</template>

<style scoped>
.orc {display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: 12px;}
.orc h3, .orc p {margin: 0;}
.orc h3 {font-size: 16px;}
</style>
