<script setup lang="ts">
import {ref} from 'vue';
import ClaimDecision from '~/components/ClaimDecision.vue';
import ClaimEvidence from '~/components/ClaimEvidence.vue';
import ClaimTargetEditor from '~/components/ClaimTargetEditor.vue';
import {useApp} from '~/composables/useApp';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import type {Claim, Decision} from '~/lib/claim-review-panel-helpers';

const props = defineProps<{claim: Claim; onDone: () => void; onMapped: (id: string) => void}>();
const app = useApp();
const reference = ref<string | null>(null);

function setReference(value: string | null) {
  reference.value = value;
}

async function decide(decision: Decision, reason: string) {
  const r = await apiFetch('/api/admin/claims', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify({claimId: props.claim.id, decision, reason, ...(decision === 'approve' ? {evidenceChecked: true, verificationReference: reference.value} : {})})});
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error ?? 'Karar kaydedilemedi.');
  props.onDone();
}
</script>

<template>
  <ClaimDecision :claim="claim" :verificationReference="reference" :onDecision="decide">
    <template #evidence>
      <ClaimTargetEditor v-if="!claim.businessId" :claim="claim" :onMapped="onMapped"/>
      <ClaimEvidence :claimId="claim.id" :review="!!claim.businessId" :onVerified="setReference"/>
    </template>
  </ClaimDecision>
</template>
