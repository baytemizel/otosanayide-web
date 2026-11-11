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
  <article class="ds-card ds-pad24 ds-col ds-g12">
    <div class="ds-row ds-sb ds-wrap ds-g10">
      <h3>{{ claim.name }}</h3>
      <span :class="['ds-badge', claim.status==='approved' ? 'ok' : claim.status==='rejected' ? 'err' : claim.status==='needs_information' ? 'warn' : 'info']">{{ i18nT(claimStatusLabels[claim.status]??'İnceleniyor') }}</span>
    </div>
    <p class="ds-small ds-muted">{{ claim.city }}</p>
    <div v-if="claim.reviewReason" class="ds-note">{{ i18nT('İnceleme notu: ') }}{{ claim.reviewReason }}</div>
    <p v-if="claim.reply" class="ds-small">{{ i18nT('Son yanıtın: ') }}{{ claim.reply }}</p>
    <form v-if="claim.status==='needs_information'" class="stack" @submit="submit">
      <label>{{ i18nT('İstenen ek açıklama') }}<textarea v-model="message" class="ds-field" required minlength="10" maxlength="2000" :disabled="busy"/></label>
      <p class="ds-xs ds-muted">{{ i18nT('Bu alana kimlik belgesi, şifre veya kart bilgisi ekleme. Belgeler için ayrı özel belge alanını kullan.') }}</p>
      <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
      <div><button class="ds-btn p sm" :disabled="busy">{{ busy?i18nT('Gönderiliyor…'):i18nT('Yanıtı incelemeye gönder') }}</button></div>
    </form>
  </article>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
</style>
