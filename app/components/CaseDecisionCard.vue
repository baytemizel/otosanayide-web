<script setup lang="ts">
import {computed, ref} from 'vue';
import CaseStatusCard from '~/components/CaseStatusCard.vue';
import ReviewPhotoGallery from '~/components/ReviewPhotoGallery.vue';
import {useLocale} from '~/composables/useLocale';
import type {Item} from '~/lib/case-moderation-helpers';

const props = defineProps<{item: Item; onDecision: (decision: string, reason: string) => Promise<void>}>();
const {t: i18nT} = useLocale();
const reason = ref('');
const reviewed = ref(false);
const busy = ref(false);
const error = ref('');
const decisionLabels: Record<string, string> = {dismiss: 'Başvuruyu reddet', remove: 'Yorumu kaldır', reopen: 'Yeniden incelemeye al', superseded: 'Değişmiş içeriğin başvurusunu kapat'};

async function submit(decision: string) {
  if (!reviewed.value || reason.value.trim().length < 10) return;
  busy.value = true;
  error.value = '';
  try {
    await props.onDecision(decision, reason.value.trim());
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}

const stale = computed(() => !props.item.review || props.item.currentVersion !== props.item.reviewVersion);
const decisions = computed(() => (stale.value ? ['superseded'] : ['dismiss', props.item.kind === 'report' ? 'remove' : 'reopen']));
</script>

<template>
  <section class="ds-card ds-pad24 ds-col ds-g16">
    <CaseStatusCard :item="item"/>
    <div class="content-box ds-col ds-g8">
      <strong class="ds-small">{{ i18nT('İçeriğin güncel hali') }}</strong>
      <p v-if="item.moderationReason" class="review-text ds-small" style="margin:0">{{ i18nT('İnceleme gerekçesi') }}: {{ item.moderationReason }}</p>
      <template v-if="item.review">
        <p class="review-text" style="margin:0;font-size:15px">{{ item.review.text }}</p>
        <div class="ds-xs ds-muted">{{ item.review.rating }}/5</div>
        <p v-if="item.review.reply" class="review-text ds-small" style="margin:0">{{ item.review.reply.text }}</p>
        <ReviewPhotoGallery v-if="item.review.photoIds?.length" :ids="item.review.photoIds"/>
      </template>
    </div>
    <div class="ds-note info">{{ i18nT('Kaldırma tüm yorumu ve bağlı kamu içeriğini gizler. İtiraz kabulü yalnızca yeniden inceleme başlatır. Ayrı fotoğraf veya yanıt kararı için ilgili moderasyon kuyruğunu kullan.') }}</div>
    <label class="ds-col"><span class="ds-label">{{ i18nT('İnceleme gerekçesi') }}</span><textarea v-model="reason" class="ds-field" maxlength="1000" :disabled="busy"/><span class="ds-help">{{ i18nT('Gerekçe başvuru sahibine iletilir. Başka kişilerin özel bilgilerini yazma.') }}</span></label>
    <label class="ds-row ds-as ds-g10 ds-small"><input v-model="reviewed" class="ds-check" type="checkbox" :disabled="busy"/>{{ i18nT('Başvuruyu ve ilgili içeriği inceledim.') }}</label>
    <div class="ds-row ds-wrap ds-g10">
      <button v-for="d in decisions" :key="d" class="ds-btn" :class="d==='remove'?'d':'s'" :disabled="busy||!reviewed||reason.trim().length<10" @click="submit(d)">{{ i18nT(decisionLabels[d]!) }}</button>
    </div>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
  </section>
</template>

<style scoped>
.content-box{background:#f7f9fa;border:1px solid #dfe5eb;border-radius:14px;padding:16px}
input.ds-check{width:20px;height:20px;min-height:0;padding:0}
@media(max-width:480px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;text-align:center}}
</style>
