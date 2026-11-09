<script setup lang="ts">
import {useLocale} from '~/composables/useLocale';
import type {CaseItem} from '~/lib/review-cases-helpers';

defineProps<{item: CaseItem}>();
const {t: i18nT} = useLocale();
</script>

<template>
  <article class="panel">
    <h3>{{ i18nT(item.kind==='report'?'Yorumu bildir':'Karara itiraz et') }}</h3>
    <p role="status">{{ i18nT(item.status==='open'?'İnceleme bekliyor':'Başvuru sonuçlandı') }}</p>
    <p class="review-text">{{ item.text }}</p>
    <p v-if="item.decision">{{ i18nT({dismiss:'Başvuru uygun bulunmadı',remove:'Yorum yayından kaldırıldı',reopen:'Yorum yeniden incelemeye alındı',superseded:'İçerik değiştiği için kapatıldı'}[item.decision]??'Belirtilmedi') }}</p>
    <p v-if="item.reason" class="review-text">{{ item.reason }}</p>
    <NuxtLink :to="`/servis/${encodeURIComponent(item.businessId)}`">{{ i18nT('İlgili işletmeyi aç ↗') }}</NuxtLink>
  </article>
</template>
