<script setup lang="ts">
import {computed, ref} from 'vue';
import EvidenceFiles from '~/components/EvidenceFiles.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {EvidenceList} from '~/lib/claim-evidence-helpers';

const props = withDefaults(defineProps<{claimId: string; canUpload?: boolean; review?: boolean; onVerified?: (reference: string | null) => void}>(), {canUpload: false, review: false});
const {t: i18nT} = useLocale();
const app = useApp();
const data = ref<EvidenceList | null>(null);
const reload = ref(0);
const error = ref('');
const viewed = ref<string[]>([]);
const attested = ref(false);
const reason = ref('');
const busy = ref(false);
const message = ref('');

useClientEffect(() => [app.user, props.claimId, reload.value], () => {
  let cancelled = false;
  data.value = null;
  message.value = '';
  viewed.value = [];
  attested.value = false;
  error.value = '';
  const user = app.user;
  const claimId = props.claimId;
  if (!user) return;
  user.getIdToken()
    .then(token => apiFetch(`/api/claims/evidence?claimId=${encodeURIComponent(claimId)}`, {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? 'Belgeler yüklenemedi.');
      if (!cancelled) data.value = d;
    })
    .catch(e => {
      if (!cancelled) error.value = e.message;
    });
  return () => {
    cancelled = true;
  };
});

async function request(path: string, method: string, body?: BodyInit, contentType = 'application/json') {
  const user = app.user;
  if (!user) throw Error('Giriş gerekli.');
  const r = await apiFetch(path, {method, headers: {Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': contentType}, body});
  if (!r.ok) {
    const d = await r.json();
    throw Error(d.error ?? 'Belge işlemi tamamlanamadı.');
  }
  return r;
}

const path = computed(() => `/api/claims/evidence?claimId=${encodeURIComponent(props.claimId)}`);

function refreshList() {
  props.onVerified?.(null);
  reload.value += 1;
}

function markViewed(id: string) {
  viewed.value = viewed.value.includes(id) ? viewed.value : [...viewed.value, id];
}

async function openEvidence(id: string) {
  return (await request(`${path.value}&id=${encodeURIComponent(id)}`, 'GET')).blob();
}

async function uploadEvidence(blob: Blob, kind: string) {
  await request(`${path.value}&kind=${kind}`, 'POST', blob, blob.type);
  props.onVerified?.(null);
  reload.value += 1;
}

async function withdrawEvidence(id: string) {
  await request('/api/claims/evidence', 'PATCH', JSON.stringify({claimId: props.claimId, id, action: 'withdraw'}));
  props.onVerified?.(null);
  reload.value += 1;
}

async function submitReview(e: Event) {
  e.preventDefault();
  busy.value = true;
  error.value = '';
  try {
    const r = await request('/api/admin/claim-evidence', 'POST', JSON.stringify({claimId: props.claimId, evidenceIds: data.value!.items.map(i => i.id), evidenceRevision: data.value!.evidenceRevision, attested: attested.value, reason: reason.value}));
    const result = await r.json();
    props.onVerified?.(result.verificationReference);
    message.value = 'Belge incelemesi kaydedildi. Sahiplik için ayrıca başvuru kararı ver.';
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="panel">
    <div class="row between">
      <h3>{{ i18nT('Belge incelemesi') }}</h3>
      <button class="button secondary compact" :disabled="busy" @click="refreshList">{{ i18nT('Belge listesini yenile') }}</button>
    </div>
    <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
    <p v-if="message" role="status" class="notice">{{ i18nT(message) }}</p>
    <p v-if="!data&&!error">{{ i18nT('Belgeler yükleniyor…') }}</p>
    <EvidenceFiles v-else-if="data" :key="`${claimId}-${reload}`" :data="data" :canUpload="canUpload" :onViewed="markViewed" :onOpen="openEvidence" :onUpload="uploadEvidence" :onWithdraw="withdrawEvidence"/>
    <form v-if="review&&data" class="stack" @submit="submitReview">
      <label class="evidence-attestation"><input v-model="attested" type="checkbox"/>{{ i18nT('Tüm güncel belgeleri açıp işletme ve temsil yetkisiyle eşleşmesini kontrol ettim.') }}</label>
      <label>{{ i18nT('Belge inceleme gerekçesi') }}<textarea v-model="reason" minlength="10" maxlength="1000" required/></label>
      <button class="button primary" :disabled="busy||!data.enabled||!attested||data.pendingUploads>0||!data.items.length||data.items.some(i=>!viewed.includes(i.id))">{{ i18nT('Belge incelemesini doğrula') }}</button>
    </form>
  </div>
</template>
