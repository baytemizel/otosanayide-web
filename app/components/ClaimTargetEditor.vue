<script setup lang="ts">
import ClaimTargetForm from '~/components/ClaimTargetForm.vue';
import {useApp} from '~/composables/useApp';
import {apiFetch} from '~/lib/api';
import type {ClaimSeed} from '~/lib/claim-target-editor-helpers';

const props = defineProps<{claim: ClaimSeed; onMapped: (id: string) => void}>();
const app = useApp();

async function headers() {
  const user = app.user;
  if (!user) throw Error('Giriş gerekli.');
  return {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`};
}

async function lookup(id: string) {
  const r = await apiFetch(`/api/admin/claim-targets?businessId=${encodeURIComponent(id)}`, {headers: await headers()});
  const d = await r.json();
  if (!r.ok) throw Error(d.error ?? 'Kayıt bulunamadı.');
  return d.business;
}

async function map(input: unknown) {
  const r = await apiFetch('/api/admin/claim-targets', {method: 'POST', headers: await headers(), body: JSON.stringify(input)});
  const d = await r.json();
  if (!r.ok) throw Error(d.error ?? 'Eşleme kaydedilemedi.');
  props.onMapped(d.businessId);
}
</script>

<template>
  <ClaimTargetForm :claim="claim" :onLookup="lookup" :onMap="map"/>
</template>
