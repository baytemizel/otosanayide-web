<script setup lang="ts">
import {computed, ref} from 'vue';
import {inspectLanguage, type AiModeration} from '@otosanayide/core/content-moderation';
import ReviewCard from '~/components/ReviewCard.vue';
import {useLocale} from '~/composables/useLocale';
import type {ReviewModerationItem} from '~/lib/review-moderation-helpers';

const props = withDefaults(defineProps<{replyText?: string; review: ReviewModerationItem; onDecision: (decision: 'approve' | 'reject' | 'hide', reason: string, contentReviewed: boolean) => Promise<void>; onAnalyze?: () => Promise<void>; aiEnabled?: boolean}>(), {aiEnabled: false});

const {t: i18nT} = useLocale();
const contentReviewed = ref(false);
const local = computed(() => props.review.automatic?.local ?? inspectLanguage(props.replyText ?? props.review.text));
const ai = computed<AiModeration>(() => props.review.automatic?.ai ?? {status: 'not_requested'});
const reason = ref('');
const busy = ref(false);
const error = ref('');

async function decide(decision: 'approve' | 'reject' | 'hide') {
  if (reason.value.trim().length < 10) {
    error.value = 'En az 10 karakterlik gerekçe yaz.';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await props.onDecision(decision, reason.value.trim(), contentReviewed.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Karar kaydedilemedi.';
  } finally {
    busy.value = false;
  }
}
async function analyze() {
  busy.value = true;
  error.value = '';
  contentReviewed.value = false;
  try {
    await props.onAnalyze!();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'AI kontrolü tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="panel">
    <NuxtLink :to="`/servis/${encodeURIComponent(review.businessId)}`" target="_blank" rel="noopener noreferrer">{{ i18nT('İlgili işletmeyi aç ↗') }}</NuxtLink>
    <ReviewCard :review="review"/>
    <div v-if="replyText" class="notice">
      <strong>{{ i18nT('İşletmenin yanıtı') }}</strong>
      <p class="review-text">{{ replyText }}</p>
    </div>
    <div class="notice">
      <strong>{{ i18nT('Otomatik içerik kontrolü') }}</strong>
      <p>{{ local.flagged?i18nT('Kelime filtresi şüpheli ifade buldu.'):i18nT('Kelime filtresinde eşleşme yok; bu bir uygunluk garantisi değildir.') }}</p>
      <p v-if="local.obfuscation">{{ i18nT('Karakter gizleme veya benzer harf kullanımı olasılığı var.') }}</p>
      <p>{{ ai.status==='checked'?(ai.flagged?i18nT('AI risk işaretledi; bağlamı incele.'):i18nT('AI risk işaretlemedi; son karar yöneticiye aittir.')):ai.status==='running'?i18nT('AI kontrolü sürüyor. Gerekirse listeyi yenile.'):ai.status==='unavailable'?i18nT('AI sonucu alınamadı. Manuel inceleme gerekli.'):i18nT('AI kontrolü yapılmadı.') }}</p>
      <p v-if="ai.categories?.length">{{ ai.categories.join(' · ') }}</p>
      <button v-if="review.status==='pending'&&onAnalyze" type="button" class="button secondary" :disabled="busy||!aiEnabled||ai.status==='checked'" @click="analyze">{{ i18nT('AI ile kontrol et') }}</button>
      <p v-if="!aiEnabled" class="small muted">{{ i18nT('AI bağlantısı henüz açılmadı.') }}</p>
    </div>
    <label>{{ i18nT('İnceleme gerekçesi') }}<textarea v-model="reason" maxlength="1000" :disabled="busy"/></label>
    <p class="small muted">{{ i18nT('Düşük puan tek başına ret sebebi değildir. Kişisel bilgi, spam ve hizmetle ilgisiz içerik açısından incele. Gerekçe kamuya gösterilmez.') }}</p>
    <label v-if="review.status==='pending'" class="evidence-attestation"><input v-model="contentReviewed" type="checkbox" :disabled="busy"/>{{ i18nT('İçeriği ve otomatik kontrol sonuçlarını inceledim.') }}</label>
    <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
    <div class="row">
      <template v-if="review.status==='pending'">
        <button class="button primary" :disabled="busy||!contentReviewed" @click="decide('approve')">{{ i18nT('Yayımla') }}</button>
        <button class="button secondary" :disabled="busy" @click="decide('reject')">{{ i18nT('Gerekçeyle reddet') }}</button>
      </template>
      <button v-else class="button secondary" :disabled="busy" @click="decide('hide')">{{ i18nT('Yayından kaldır') }}</button>
    </div>
  </section>
</template>
