<script setup lang="ts">
import {useLocale} from '~/composables/useLocale';
import type {CaseItem} from '~/lib/review-cases-helpers';

defineProps<{item: CaseItem}>();
const {t: i18nT} = useLocale();
</script>

<template>
  <article class="ds-card ds-pad csc">
    <h3>{{ i18nT(item.kind==='report'?'Yorumu bildir':'Karara itiraz et') }}</h3>
    <p role="status" class="ds-small ds-b">{{ i18nT(item.status==='open'?'İnceleme bekliyor':'Başvuru sonuçlandı') }}</p>
    <p class="review-text ds-small">{{ item.text }}</p>
    <p v-if="item.decision" class="ds-small">{{ i18nT({dismiss:'Başvuru uygun bulunmadı',remove:'Yorum yayından kaldırıldı',reopen:'Yorum yeniden incelemeye alındı',superseded:'İçerik değiştiği için kapatıldı'}[item.decision]??'Belirtilmedi') }}</p>
    <p v-if="item.reason" class="review-text ds-small ds-muted">{{ item.reason }}</p>
    <NuxtLink class="ds-small ds-orange ds-b" :to="`/servis/${encodeURIComponent(item.businessId)}`">{{ i18nT('İlgili işletmeyi aç ↗') }}</NuxtLink>
  </article>
</template>

<style scoped>
.csc {display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;}
.csc h3, .csc p {margin: 0;}
.csc h3 {font-size: 16px;}
</style>
