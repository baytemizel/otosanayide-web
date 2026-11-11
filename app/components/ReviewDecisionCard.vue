<script setup lang="ts">
import {computed, ref} from 'vue';
import {Info} from '@lucide/vue';
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
  <section class="ds-card ds-pad24 ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3 style="margin:0">{{ i18nT(replyText?'İşletmenin yanıtı':'Yorum') }}</h3>
      <span class="ds-badge" :class="review.status==='pending'?'warn':'ok'">{{ i18nT(review.status==='pending'?'Yayın beklemede':'Yayında') }}</span>
    </div>
    <NuxtLink class="text-link ds-small" :to="`/servis/${encodeURIComponent(review.businessId)}`" target="_blank" rel="noopener noreferrer">{{ i18nT('İlgili işletmeyi aç ↗') }}</NuxtLink>
    <div class="content-box"><ReviewCard :review="review"/></div>
    <div v-if="replyText" class="content-box ds-col ds-g4">
      <strong class="ds-small">{{ i18nT('İşletmenin yanıtı') }}</strong>
      <p class="review-text" style="margin:0;font-size:15px">{{ replyText }}</p>
    </div>
    <div class="ds-note info">
      <Info class="ds-i" :size="16"/>
      <div class="ds-col ds-g6 ds-f1">
        <strong>{{ i18nT('Otomatik içerik kontrolü') }}</strong>
        <span>{{ local.flagged?i18nT('Kelime filtresi şüpheli ifade buldu.'):i18nT('Kelime filtresinde eşleşme yok; bu bir uygunluk garantisi değildir.') }}</span>
        <span v-if="local.obfuscation">{{ i18nT('Karakter gizleme veya benzer harf kullanımı olasılığı var.') }}</span>
        <strong>{{ i18nT('AI inceleme yardımı') }}</strong>
        <span>{{ ai.status==='checked'?(ai.flagged?i18nT('AI risk işaretledi; bağlamı incele.'):i18nT('AI risk işaretlemedi; son karar yöneticiye aittir.')):ai.status==='running'?i18nT('AI kontrolü sürüyor. Gerekirse listeyi yenile.'):ai.status==='unavailable'?i18nT('AI sonucu alınamadı. Manuel inceleme gerekli.'):i18nT('AI kontrolü yapılmadı.') }}</span>
        <span v-if="ai.categories?.length">{{ ai.categories.join(' · ') }}</span>
        <div v-if="review.status==='pending'&&onAnalyze"><button type="button" class="ds-btn s sm" :class="{'ds-passive':!aiEnabled}" :aria-disabled="aiEnabled?undefined:'true'" :title="aiEnabled?undefined:i18nT('Yakında')" :disabled="busy||!aiEnabled||ai.status==='checked'" @click="analyze">{{ i18nT('AI ile kontrol et') }}</button></div>
        <span v-if="!aiEnabled" class="ds-xs">{{ i18nT('AI bağlantısı henüz açılmadı.') }}</span>
      </div>
    </div>
    <div v-if="review.status==='pending'" class="ds-row ds-wrap ds-g8">
      <button type="button" class="ds-chip line ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Kişisel bilgiyi maskele ve yayınla') }}</button>
      <button type="button" class="ds-chip line ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Yazara düzenleme iste') }}</button>
    </div>
    <label class="ds-col"><span class="ds-label">{{ i18nT('İnceleme gerekçesi') }}</span><textarea v-model="reason" class="ds-field" maxlength="1000" :disabled="busy"/><span class="ds-help">{{ i18nT('Düşük puan tek başına ret sebebi değildir. Kişisel bilgi, spam ve hizmetle ilgisiz içerik açısından incele. Gerekçe kamuya gösterilmez.') }}</span></label>
    <label v-if="review.status==='pending'" class="ds-row ds-as ds-g10 ds-small"><input v-model="contentReviewed" class="ds-check" type="checkbox" :disabled="busy"/>{{ i18nT('İçeriği ve otomatik kontrol sonuçlarını inceledim.') }}</label>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
    <div class="ds-row ds-wrap ds-g10">
      <template v-if="review.status==='pending'">
        <button class="ds-btn n" :disabled="busy||!contentReviewed" @click="decide('approve')">{{ i18nT('Yayımla') }}</button>
        <button class="ds-btn d" :disabled="busy" @click="decide('reject')">{{ i18nT('Gerekçeyle reddet') }}</button>
        <button type="button" class="ds-btn g ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Atla') }}</button>
      </template>
      <button v-else class="ds-btn d" :disabled="busy" @click="decide('hide')">{{ i18nT('Yayından kaldır') }}</button>
    </div>
  </section>
</template>

<style scoped>
.content-box{background:#f7f9fa;border:1px solid #dfe5eb;border-radius:14px;padding:16px;min-width:0}
input.ds-check{width:20px;height:20px;min-height:0;padding:0}
@media(max-width:480px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;text-align:center}}
</style>
