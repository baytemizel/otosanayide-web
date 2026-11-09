<script setup lang="ts">
import {computed, ref} from 'vue';
import ReviewCard from '~/components/ReviewCard.vue';
import {useLocale} from '~/composables/useLocale';
import type {ReplyDraft} from '~/lib/business-replies-helpers';
import type {ReviewView} from '~/lib/reviews-helpers';

const props = defineProps<{review: ReviewView; draft?: ReplyDraft | null; onSubmit: (text: string, version: number) => Promise<void>; onWithdraw: (version: number) => Promise<void>}>();
const {t: i18nT} = useLocale();
const text = ref(props.draft?.text ?? '');
const busy = ref(false);
const error = ref('');
const locked = computed(() => props.draft && ['pending', 'approved'].includes(props.draft.status));
const statusLabel = computed(() => ({pending: 'İnceleme bekliyor', approved: 'Yayımlandı', rejected: 'Reddedildi', hidden: 'Yayında değil'} as Record<string, string>)[props.draft?.status ?? ''] ?? 'Belirtilmedi');

async function run(withdraw = false) {
  busy.value = true;
  error.value = '';
  try {
    if (withdraw) await props.onWithdraw(props.draft!.version);
    else await props.onSubmit(text.value.trim(), props.draft?.version ?? 0);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="panel">
    <ReviewCard :review="review"/>
    <h3>{{ i18nT("İşletmenin yanıtı") }}</h3>
    <template v-if="draft"><p role="status">{{ i18nT(statusLabel) }}</p><p v-if="draft.reason">{{ i18nT("İnceleme gerekçesi") }}: {{ draft.reason }}</p></template>
    <template v-if="locked"><p class="review-text">{{ draft?.text }}</p><button class="button secondary" :disabled="busy" @click="run(true)">{{ i18nT("Yanıtı geri çek") }}</button></template>
    <form v-else @submit.prevent="run()">
      <label>{{ i18nT("Yanıtın") }}<textarea v-model="text" required minlength="10" maxlength="2000" :disabled="busy"/></label>
      <p class="small muted">{{ i18nT("Müşterinin kişisel bilgilerini paylaşma. Yanıtın yayımlanmadan önce incelenir; değerlendirme puanını değiştirmez.") }}</p>
      <button class="button primary" :disabled="busy">{{ busy ? i18nT("Gönderiliyor…") : i18nT("İncelemeye gönder") }}</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>
