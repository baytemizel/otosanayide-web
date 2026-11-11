<script setup lang="ts">
import {onMounted, ref, useId, useTemplateRef} from 'vue';
import {X} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {ReportError, reportReasonLabels, reportReasons, submitBusinessReport, type ReportReason} from '~/lib/business-report';
import {trapFocus} from '~/lib/focus';

/** S08: a report goes to the review queue; it never changes the profile directly. */
const props = defineProps<{businessId: string; businessName: string; onClose: () => void}>();
const {t: i18nT} = useLocale();
const app = useApp();
const titleId = useId();
const dialog = useTemplateRef<HTMLElement>('dialog');
const first = useTemplateRef<HTMLButtonElement>('closeBtn');
const reason = ref<ReportReason>('closed');
const busy = ref(false);
const error = ref('');
const done = ref(false);
/** One id per open dialog: a resend after a lost answer is the same report. */
const operationId = crypto.randomUUID();
let opener: Element | null = null;

onMounted(() => {
  opener = document.activeElement;
  first.value?.focus();
});
function close() {
  if (busy.value) return;
  props.onClose();
  if (opener instanceof HTMLElement) opener.focus();
}

async function submit(e: Event) {
  e.preventDefault();
  const note = String(new FormData(e.currentTarget as HTMLFormElement).get('note') ?? '');
  const user = app.user;
  if (!user) return;
  busy.value = true;
  error.value = '';
  try {
    await submitBusinessReport(props.businessId, {reason: reason.value, note}, await user.getIdToken(), operationId);
    done.value = true;
  } catch (err) {
    error.value = err instanceof ReportError ? err.message : 'Bildirimi kontrol et. “Diğer” için en az 10 karakter açıklama yaz.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="ds-modal-scrim" @keydown.esc="close()">
    <div ref="dialog" class="ds-modal report" role="dialog" aria-modal="true" :aria-labelledby="titleId" @keydown.tab="trapFocus($event, dialog)">
      <div class="ds-row ds-sb ds-g12">
        <h2 :id="titleId">{{ i18nT('Yanlış bilgi bildir') }}</h2>
        <button ref="closeBtn" type="button" class="ds-iconbtn" :aria-label="i18nT('Kapat')" :disabled="busy" @click="close()"><X :size="18"/></button>
      </div>
      <p class="ds-small ds-muted">{{ businessName }}</p>
      <p v-if="done" class="ds-note ok" role="status">{{ i18nT('Bildirimin alındı. İnceleme sonrası profil güncellenebilir; bildirim profili doğrudan değiştirmez.') }}</p>
      <template v-else-if="!app.member">
        <p class="ds-small">{{ i18nT('Bildirim göndermek için giriş yap.') }}</p>
        <NuxtLink class="ds-btn p" to="/giris">{{ i18nT('Giriş yap') }}</NuxtLink>
      </template>
      <form v-else class="ds-col ds-g12" @submit="submit">
        <fieldset class="ds-col ds-g8 reasons">
          <legend class="ds-label">{{ i18nT('Ne yanlış?') }}</legend>
          <label v-for="r in reportReasons" :key="r" class="ds-row ds-g8 ds-small"><input v-model="reason" type="radio" class="ds-radio" name="reason" :value="r"/>{{ i18nT(reportReasonLabels[r]) }}</label>
        </fieldset>
        <label class="ds-col ds-g4">
          <span class="ds-label">{{ i18nT('Açıklama') }}</span>
          <textarea class="ds-field note" name="note" maxlength="1000" :required="reason === 'other'" :minlength="reason === 'other' ? 10 : undefined" :placeholder="i18nT('Doğru bilgi veya kaynağı (isteğe bağlı)')"/>
          <span class="ds-xs ds-muted">{{ i18nT('Kişisel bilgi, plaka veya telefon numarası yazma.') }}</span>
        </label>
        <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
        <div class="ds-row ds-g10 ds-wrap actions">
          <button type="button" class="ds-btn g" :disabled="busy" @click="close()">{{ i18nT('Vazgeç') }}</button>
          <button class="ds-btn p" :disabled="busy">{{ busy ? i18nT('Gönderiliyor…') : i18nT('Bildir') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.report {max-width: 520px; display: flex; flex-direction: column; gap: 14px; padding: 28px;}
h2 {margin: 0; font: 700 19px/24.7px Arimo, Arial, sans-serif; letter-spacing: 0;}
p {margin: 0;}
.reasons {margin: 0; padding: 0; border: 0;}
.note {min-height: 96px; resize: vertical;}
.actions {justify-content: flex-end;}
@media (max-width: 480px) {.report {padding: 20px;}}
</style>
