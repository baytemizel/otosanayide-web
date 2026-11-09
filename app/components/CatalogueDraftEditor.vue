<script setup lang="ts">
import {ref} from 'vue';
import type {BusinessProfileInput} from '@otosanayide/core/business-management';
import CatalogueDraftPanel from '~/components/CatalogueDraftPanel.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
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
    const d = await r.json();
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
  const d = await r.json();
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
  <div class="stack">
    <button class="button secondary" :disabled="busy" @click="toggle">{{ i18nT(open?'Düzenleyiciyi kapat':'Kaynakları incele ve profili düzenle') }}</button>
    <p v-if="busy" role="status">{{ i18nT('Yükleniyor…') }}</p>
    <p v-if="error" role="alert">{{ i18nT(error) }}</p>
    <CatalogueDraftPanel v-if="open&&detail" :detail="detail" :reason="reason" :onReason="setReason" :onSave="save" :businessId="businessId"/>
  </div>
</template>
