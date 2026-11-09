<script setup lang="ts">
import {useLocale} from '~/composables/useLocale';
import type {OwnReviewView} from '~/lib/own-review-status-helpers';

defineProps<{review: OwnReviewView}>();
const {t: i18nT} = useLocale();
</script>

<template>
  <section class="panel">
    <h3>{{ i18nT('Yorumunun durumu') }}</h3>
    <p role="status">{{ i18nT({pending:'İnceleme bekliyor',approved:'Yayımlandı',rejected:'Reddedildi',hidden:'Yayında değil',withdrawn:'Geri çekildi'}[review.status]??'Belirtilmedi') }}{{ review.rating!==null?` · ${review.rating}/5`:'' }}</p>
    <p class="review-text">{{ review.text }}</p>
    <p v-if="review.reason"><strong>{{ i18nT('İnceleme gerekçesi') }}: </strong>{{ review.reason }}</p>
    <p v-if="review.status==='pending'" class="small muted">{{ i18nT('Yorumun henüz kamuya açık değil ve puan ortalamasına dahil edilmiyor.') }}</p>
    <p v-if="!review.canEdit&&['hidden','withdrawn'].includes(review.status)" class="small muted">{{ i18nT('Yönetici tarafından kaldırılan yorum için yeniden gönderim kapalıdır. İnceleme kararı geri çekmeyle aşılamaz.') }}</p>
  </section>
</template>
