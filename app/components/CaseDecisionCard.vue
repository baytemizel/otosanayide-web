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
  <section class="panel">
    <CaseStatusCard :item="item"/>
    <h3>{{ i18nT('İçeriğin güncel hali') }}</h3>
    <p v-if="item.moderationReason" class="review-text">{{ i18nT('İnceleme gerekçesi') }}: {{ item.moderationReason }}</p>
    <template v-if="item.review">
      <p class="review-text">{{ item.review.text }}</p>
      <p>{{ item.review.rating }}/5</p>
      <p v-if="item.review.reply" class="review-text">{{ item.review.reply.text }}</p>
      <ReviewPhotoGallery v-if="item.review.photoIds?.length" :ids="item.review.photoIds"/>
    </template>
    <p>{{ i18nT('Kaldırma tüm yorumu ve bağlı kamu içeriğini gizler. İtiraz kabulü yalnızca yeniden inceleme başlatır. Ayrı fotoğraf veya yanıt kararı için ilgili moderasyon kuyruğunu kullan.') }}</p>
    <label>{{ i18nT('İnceleme gerekçesi') }}<textarea v-model="reason" maxlength="1000" :disabled="busy"/></label>
    <p class="small muted">{{ i18nT('Gerekçe başvuru sahibine iletilir. Başka kişilerin özel bilgilerini yazma.') }}</p>
    <label><input v-model="reviewed" type="checkbox" :disabled="busy"/>{{ i18nT('Başvuruyu ve ilgili içeriği inceledim.') }}</label>
    <div class="row">
      <button v-for="d in decisions" :key="d" class="button secondary" :disabled="busy||!reviewed||reason.trim().length<10" @click="submit(d)">{{ i18nT(decisionLabels[d]!) }}</button>
    </div>
    <p v-if="error" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>
