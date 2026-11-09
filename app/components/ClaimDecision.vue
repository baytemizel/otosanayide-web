<script setup lang="ts">
import {ref} from 'vue';
import {claimStatusLabels} from '@otosanayide/core/claim-status';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import type {Claim, Decision} from '~/lib/claim-review-panel-helpers';

const props = defineProps<{claim: Claim; verificationReference: string | null; onDecision: (decision: Decision, reason: string) => Promise<void>}>();
const {t: i18nT} = useLocale();
const reason = ref('');
const checked = ref(false);
const busy = ref(false);
const error = ref('');

useClientEffect(() => [props.verificationReference], () => {
  checked.value = false;
});

async function decide(decision: Decision) {
  error.value = '';
  if (reason.value.trim().length < 10) {
    error.value = 'En az 10 karakterlik karar gerekçesi yaz.';
    return;
  }
  busy.value = true;
  try {
    await props.onDecision(decision, reason.value.trim());
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="panel">
    <div class="row between">
      <h2>{{ claim.name }}</h2>
      <strong>{{ claimStatusLabels[claim.status]??i18nT('İncelemede') }}</strong>
    </div>
    <p>{{ claim.city }} · {{ claim.address }}</p>
    <p>{{ i18nT('Başvuru yetkilisi: ') }}{{ claim.contactName }} · {{ claim.phone }}</p>
    <p v-if="claim.note">{{ i18nT('Başvuru notu: ') }}{{ claim.note }}</p>
    <p v-if="claim.reply">{{ i18nT('Son ek açıklama: ') }}{{ claim.reply }}</p>
    <p v-if="!claim.businessId" class="notice">{{ i18nT('Yeni nokta başvurusu. Sahiplik onayından önce işletme kaydıyla eşleme gerekiyor.') }}</p>
    <slot name="evidence"/>
    <label>{{ i18nT('Başvuru karar gerekçesi') }}<textarea v-model="reason" maxlength="1000" :disabled="busy"/></label>
    <label class="evidence-attestation"><input v-model="checked" type="checkbox" :disabled="!verificationReference||busy"/>{{ i18nT('Güncel belge incelemesi tamamlandı; başvuru yetkisini onaylıyorum.') }}</label>
    <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
    <div class="row" :style="{flexWrap:'wrap'}">
      <button class="button primary" :disabled="busy||!checked||!verificationReference||!claim.businessId" @click="decide('approve')">{{ i18nT('Sahipliği onayla') }}</button>
      <button class="button secondary" :disabled="busy" @click="decide('request_information')">{{ i18nT('Ek bilgi iste') }}</button>
      <button class="button secondary" :disabled="busy" @click="decide('reject')">{{ i18nT('Başvuruyu reddet') }}</button>
    </div>
    <p class="small muted">{{ i18nT('Onay yalnızca ilgili işletmeye yönetim yetkisi verir. Yayın, konum doğrulaması, randevu ve teklif özellikleri ayrıca değerlendirilir.') }}</p>
  </section>
</template>
