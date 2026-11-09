<script setup lang="ts">
import {ref} from 'vue';
import {claimStatusLabels} from '@otosanayide/core/claim-status';
import {useLocale} from '~/composables/useLocale';
import type {Claim} from '~/lib/claim-tracker-helpers';

const props = defineProps<{claim: Claim; onReply: (message: string) => Promise<void>}>();
const {t: i18nT} = useLocale();
const message = ref('');
const busy = ref(false);
const error = ref('');

async function submit(e: Event) {
  e.preventDefault();
  busy.value = true;
  error.value = '';
  try {
    await props.onReply(message.value.trim());
    message.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Yanıt gönderilemedi.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <article class="panel">
    <div class="row between">
      <h3>{{ claim.name }}</h3>
      <strong>{{ i18nT(claimStatusLabels[claim.status]??'İnceleniyor') }}</strong>
    </div>
    <p>{{ claim.city }}</p>
    <p v-if="claim.reviewReason" class="notice">{{ i18nT('İnceleme notu: ') }}{{ claim.reviewReason }}</p>
    <p v-if="claim.reply">{{ i18nT('Son yanıtın: ') }}{{ claim.reply }}</p>
    <form v-if="claim.status==='needs_information'" class="stack" @submit="submit">
      <label>{{ i18nT('İstenen ek açıklama') }}<textarea v-model="message" required minlength="10" maxlength="2000" :disabled="busy"/></label>
      <p class="small muted">{{ i18nT('Bu alana kimlik belgesi, şifre veya kart bilgisi ekleme. Belgeler için ayrı özel belge alanını kullan.') }}</p>
      <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
      <button class="button primary" :disabled="busy">{{ busy?i18nT('Gönderiliyor…'):i18nT('Yanıtı incelemeye gönder') }}</button>
    </form>
  </article>
</template>
