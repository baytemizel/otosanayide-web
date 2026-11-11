<script setup lang="ts">
import {computed, ref} from 'vue';
import {Flag} from '@lucide/vue';
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
const badgeClass = computed(() => ({pending: 'warn', approved: 'ok', rejected: 'err', hidden: 'neu'} as Record<string, string>)[props.draft?.status ?? ''] ?? 'neu');

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
  <section class="ds-card ds-pad24 ds-col ds-g12 reply-card">
    <ReviewCard :review="review"/>
    <div class="ds-row ds-sb ds-wrap ds-g10">
      <h3>{{ i18nT("İşletmenin yanıtı") }}</h3>
      <span v-if="draft" :class="['ds-badge', badgeClass]" role="status">{{ i18nT(statusLabel) }}</span>
      <span v-else class="ds-badge warn">{{ i18nT("Yanıt bekliyor") }}</span>
    </div>
    <div v-if="draft?.reason" class="ds-note warn">{{ i18nT("İnceleme gerekçesi") }}: {{ draft.reason }}</div>
    <template v-if="locked">
      <div class="reply-quote">
        <div class="ds-small ds-b">{{ i18nT("Yanıtınız") }} · {{ i18nT(statusLabel) }}</div>
        <p class="ds-small ds-muted review-text">{{ draft?.text }}</p>
      </div>
      <div><button class="ds-btn s sm" :disabled="busy" @click="run(true)">{{ i18nT("Yanıtı geri çek") }}</button></div>
    </template>
    <form v-else class="ds-col ds-g12" @submit.prevent="run()">
      <label class="ds-col"><span class="ds-label">{{ i18nT("Yanıtın") }}</span><textarea v-model="text" class="ds-field" required minlength="10" maxlength="2000" :disabled="busy"/></label>
      <div class="ds-row ds-sb ds-wrap ds-g12">
        <p class="ds-xs ds-muted ds-f1 reply-hint">{{ i18nT("Müşterinin kişisel bilgilerini paylaşma. Yanıtın yayımlanmadan önce incelenir; değerlendirme puanını değiştirmez.") }} · {{ text.length }} / 2000</p>
        <div class="ds-row ds-g10 ds-wrap">
          <button type="button" class="ds-btn g sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><Flag :size="15"/>{{ i18nT("Yorumu bildir") }}</button>
          <button class="ds-btn p sm" :disabled="busy">{{ busy ? i18nT("Gönderiliyor…") : i18nT("İncelemeye gönder") }}</button>
        </div>
      </div>
    </form>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
  </section>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
.reply-card :deep(.review-card) {margin: 0; padding: 0; border: 0; background: none;}
.reply-quote {display: flex; flex-direction: column; gap: 2px; padding: 8px 14px; border-left: 3px solid #f36b21; border-radius: 0 10px 10px 0; background: #f7f9fa;}
.reply-hint {min-width: 240px;}
</style>
