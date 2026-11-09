<script setup lang="ts">
import {computed, ref} from 'vue';
import type {BusinessProfileInput} from '@otosanayide/core/business-management';
import OwnedProfileForm from '~/components/OwnedProfileForm.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {ManagedBusiness} from '~/lib/managed-business-profile-helpers';

const {t: i18nT} = useLocale();
const app = useApp();
const items = ref<ManagedBusiness[]>([]);
const id = ref('');
const loading = ref(true);
const error = ref('');
const refresh = ref(0);

useClientEffect(() => [app.user, refresh.value], () => {
  let cancelled = false;
  items.value = [];
  loading.value = true;
  error.value = '';
  const user = app.user;
  if (!user) {
    loading.value = false;
    return;
  }
  user
    .getIdToken()
    .then(token => apiFetch('/api/businesses/manage', {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? 'İşletmeler yüklenemedi.');
      if (!cancelled) items.value = d.businesses;
    })
    .catch(e => {
      if (!cancelled) error.value = e.message;
    })
    .finally(() => {
      if (!cancelled) loading.value = false;
    });
  return () => {
    cancelled = true;
  };
});

const selected = computed(() => items.value.find(b => b.id === id.value) ?? items.value[0]);

async function submit(profile: BusinessProfileInput) {
  const current = selected.value;
  const user = app.user;
  if (!current || !user) throw Error('Oturum gerekli.');
  const r = await apiFetch('/api/businesses/manage', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify({businessId: current.id, expectedVersion: current.version, expectedRevisionId: current.change?.revisionId ?? null, profile})});
  const d = await r.json();
  if (!r.ok) throw Error(d.error ?? 'Kaydedilemedi.');
  items.value = items.value.map(b => (b.id === current.id ? {...b, change: {revisionId: d.revisionId, status: 'pending', profile, reason: ''}} : b));
}
</script>

<template>
  <section v-if="!app.user" class="panel"><p>{{ i18nT("Bağlı işletmelerini görmek için giriş yap.") }}</p></section>
  <p v-else-if="loading" role="status">{{ i18nT("Yetkili olduğun işletmeler yükleniyor…") }}</p>
  <template v-else>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <button class="button secondary compact" @click="refresh++">{{ i18nT("Kayıtları yeniden yükle") }}</button>
    <template v-if="selected">
      <label>{{ i18nT("İşletme / şube") }}<select :value="selected.id" @change="id=($event.target as HTMLSelectElement).value"><option v-for="b in items" :key="b.id" :value="b.id">{{ b.name }} · {{ b.district }}</option></select></label>
      <OwnedProfileForm :key="`${selected.id}-${refresh}`" :business="selected" :onSubmit="submit"/>
    </template>
    <section v-else-if="!error" class="panel"><h2>{{ i18nT("Bağlı işletme bulunamadı.") }}</h2><p>{{ i18nT("Başvurun onaylandığında işletme profilini burada yönetebilirsin.") }}</p></section>
  </template>
</template>
