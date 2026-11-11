<script setup lang="ts">
import {ref} from 'vue';
import type {BusinessProfileInput} from '@otosanayide/core/business-management';
import CatalogueDraftPanel from '~/components/CatalogueDraftPanel.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import type {Detail} from '~/lib/catalogue-draft-editor-helpers';

const props = defineProps<{businessId: string; onSaved: () => void}>();
const app = useApp();
const {t: i18nT} = useLocale();
const detail = ref<Detail | null>(null);
const open = ref(false);
const busy = ref(false);
const error = ref('');
const reason = ref('');

async function load() {
  const user = app.user;
  if (!user) return;
  busy.value = true;
  error.value = '';
  try {
    const r = await apiFetch(`/api/admin/catalogue/draft?businessId=${encodeURIComponent(props.businessId)}`, {headers: {Authorization: `Bearer ${await user.getIdToken()}`}});
    const d = await responseJson(r);
    if (!r.ok) throw Error(d.error);
    detail.value = d;
    open.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}

async function save(profile: BusinessProfileInput) {
  const user = app.user;
  const current = detail.value;
  const currentReason = reason.value;
  if (!user || !current) throw Error('Oturum gerekli.');
  if (currentReason.trim().length < 10) throw Error('Düzenleme gerekçesi en az 10 karakter olmalı.');
  const r = await apiFetch('/api/admin/catalogue/draft', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify({businessId: props.businessId, profileVersion: current.profileVersion, publicationVersion: current.publicationVersion, profile, reason: currentReason})});
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error);
  open.value = false;
  detail.value = null;
  props.onSaved();
}

function toggle() {
  if (open.value) open.value = false;
  else if (detail.value) open.value = true;
  else void load();
}

function setReason(value: string) {
  reason.value = value;
}
</script>

<template>
  <div class="ds-col ds-g12">
    <div><button class="ds-btn s sm" :disabled="busy" @click="toggle">{{ i18nT(open?'Düzenleyiciyi kapat':'Kaynakları incele ve profili düzenle') }}</button></div>
    <div v-if="busy" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</div>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
    <CatalogueDraftPanel v-if="open&&detail" :detail="detail" :reason="reason" :onReason="setReason" :onSave="save" :businessId="businessId"/>
  </div>
</template>

<style scoped>
@media(max-width:480px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;text-align:center}}
</style>
