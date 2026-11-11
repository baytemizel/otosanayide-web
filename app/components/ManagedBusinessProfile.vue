<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import type {BusinessProfileInput} from '@otosanayide/core/business-management';
import OwnedProfileForm from '~/components/OwnedProfileForm.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {ManagedBusiness} from '~/lib/managed-business-profile-helpers';

const props = defineProps<{section?: 'location'; onContext?: (label: string) => void}>();
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

watch(selected, b => props.onContext?.(b ? `${b.name} · ${b.district}` : ''), {immediate: true});

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
  <section v-if="!app.user" class="ds-card ds-pad24 ds-col ds-g12"><p>{{ i18nT("Bağlı işletmelerini görmek için giriş yap.") }}</p><div><NuxtLink class="ds-btn s sm" to="/isletme/giris">{{ i18nT("Giriş yap") }}</NuxtLink></div></section>
  <p v-else-if="loading" role="status" class="ds-small ds-muted">{{ i18nT("Yetkili olduğun işletmeler yükleniyor…") }}</p>
  <template v-else>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
    <div class="ds-row ds-wrap ds-g12 toolbar">
      <label v-if="selected" class="ds-col ds-f1 branch"><span class="ds-label">{{ i18nT("İşletme / şube") }}</span><select class="ds-field" :value="selected.id" @change="id=($event.target as HTMLSelectElement).value"><option v-for="b in items" :key="b.id" :value="b.id">{{ b.name }} · {{ b.district }}</option></select></label>
      <button class="ds-btn s sm" @click="refresh++">{{ i18nT("Kayıtları yeniden yükle") }}</button>
    </div>
    <OwnedProfileForm v-if="selected" :key="`${selected.id}-${refresh}`" :business="selected" :onSubmit="submit" :section="section"/>
    <section v-else-if="!error" class="ds-card ds-pad24 ds-col ds-g8 no-business"><h3>{{ i18nT("Bağlı işletme bulunamadı.") }}</h3><p class="ds-small ds-muted">{{ i18nT("Başvurun onaylandığında işletme profilini burada yönetebilirsin.") }}</p></section>
  </template>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
.toolbar {align-items: flex-end;}
.branch {min-width: 240px; max-width: 480px;}
</style>
