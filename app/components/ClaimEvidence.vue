<script setup lang="ts">
import {computed, ref} from 'vue';
import {Phone} from '@lucide/vue';
import EvidenceFiles from '~/components/EvidenceFiles.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
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
      const d = await responseJson(r);
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
    const d = await responseJson(r);
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
    const result = await responseJson(r);
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
  <div class="ds-card ev-card">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3 v-if="review">{{ i18nT('Belge incelemesi') }}</h3>
      <h2 v-else>{{ i18nT('Sahiplik kanıtı') }}</h2>
      <button class="ds-btn s sm" :disabled="busy" @click="refreshList">{{ i18nT('Belge listesini yenile') }}</button>
    </div>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
    <div v-if="message" role="status" class="ds-note ok">{{ i18nT(message) }}</div>
    <p v-if="!data&&!error" class="ds-small ds-muted">{{ i18nT('Belgeler yükleniyor…') }}</p>
    <EvidenceFiles v-else-if="data" :key="`${claimId}-${reload}`" :data="data" :canUpload="canUpload" :onViewed="markViewed" :onOpen="openEvidence" :onUpload="uploadEvidence" :onWithdraw="withdrawEvidence"/>
    <div v-if="!review" class="ev-row">
      <Phone :size="20" class="ds-i"/>
      <div class="ds-col ds-f1">
        <span class="ds-small ds-b">{{ i18nT('Bağımsız iletişim kanalından teyit') }}</span>
        <span class="ds-xs ds-muted">{{ i18nT('Kayıtlı işletme telefonuna arama ile') }}</span>
      </div>
      <button type="button" class="ds-btn s sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Teyit iste') }}</button>
    </div>
    <form v-if="review&&data" class="stack" @submit="submitReview">
      <label class="evidence-attestation"><input v-model="attested" class="ds-check chk" type="checkbox"/>{{ i18nT('Tüm güncel belgeleri açıp işletme ve temsil yetkisiyle eşleşmesini kontrol ettim.') }}</label>
      <label>{{ i18nT('Belge inceleme gerekçesi') }}<textarea v-model="reason" class="ds-field" minlength="10" maxlength="1000" required/></label>
      <div><button class="ds-btn p" :disabled="busy||!data.enabled||!attested||data.pendingUploads>0||!data.items.length||data.items.some(i=>!viewed.includes(i.id))">{{ i18nT('Belge incelemesini doğrula') }}</button></div>
    </form>
  </div>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
h2 {margin: 0; font-size: 28px; line-height: 1.12;}
.ev-card {display: flex; flex-direction: column; gap: 20px; max-width: 900px; padding: 32px;}
.ev-row {display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 14px; border: 1px solid #dfe5eb; border-radius: 12px;}
input.ds-check.chk {width: 20px; height: 20px; min-height: 0; padding: 0;}
@media (max-width: 760px) {
  .ev-card {padding: 20px;}
}
</style>
