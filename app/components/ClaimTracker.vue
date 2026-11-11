<script setup lang="ts">
import {ref} from 'vue';
import ClaimEvidence from '~/components/ClaimEvidence.vue';
import ClaimReply from '~/components/ClaimReply.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {Claim} from '~/lib/claim-tracker-helpers';

const {t: i18nT} = useLocale();
const app = useApp();
const claims = ref<Claim[]>([]);
const loading = ref(false);
const error = ref('');
const reload = ref(0);
const message = ref('');

useClientEffect(() => [app.user, app.demo, reload.value], () => {
  let cancelled = false;
  claims.value = [];
  error.value = '';
  const user = app.user;
  if (!user || app.demo) return;
  loading.value = true;
  user.getIdToken()
    .then(token => apiFetch('/api/claims', {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? 'Başvurular yüklenemedi.');
      if (!cancelled) claims.value = d.claims;
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

async function reply(c: Claim, text: string) {
  const r = await apiFetch('/api/claims', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify({claimId: c.id, message: text})});
  const d = await r.json();
  if (!r.ok) throw Error(d.error ?? 'Yanıt gönderilemedi.');
  claims.value = claims.value.map(v => (v.id === c.id ? {...v, status: 'submitted', reply: text} : v));
  message.value = 'Yanıtın incelemeye gönderildi.';
}
</script>

<template>
  <section v-if="app.demo" class="ds-card ds-pad24 ds-col ds-g8">
    <h3>{{ i18nT('Başvuru takibi') }}</h3>
    <p class="ds-small ds-muted">{{ i18nT('Önizleme başvuruları gerçek kurumsal hesap oluşturmaz. Canlı hesabında başvurunun durumunu, inceleme gerekçesini ve ek bilgi taleplerini burada göreceksin.') }}</p>
  </section>
  <section v-else-if="!app.user" class="ds-card ds-pad24 ds-col ds-g12">
    <p>{{ i18nT('Başvurularını takip etmek için giriş yap.') }}</p>
    <div><NuxtLink class="ds-btn s sm" to="/isletme/giris">{{ i18nT('Giriş yap') }}</NuxtLink></div>
  </section>
  <section v-else class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3>{{ i18nT('Başvurularım') }}</h3>
      <button class="ds-btn s sm" :disabled="loading" @click="reload++">{{ i18nT('Başvuruları yenile') }}</button>
    </div>
    <div v-if="message" role="status" class="ds-note ok">{{ i18nT(message) }}</div>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
    <p v-if="loading" role="status" class="ds-small ds-muted">{{ i18nT('Başvurular yükleniyor…') }}</p>
    <template v-else>
      <div v-for="c in claims" :key="c.id" class="ds-col ds-g12">
        <ClaimReply :claim="c" :onReply="(text: string) => reply(c, text)"/>
        <ClaimEvidence :claimId="c.id" :canUpload="['submitted','needs_information'].includes(c.status)"/>
      </div>
    </template>
    <p v-if="!loading&&!error&&!claims.length" class="ds-small ds-muted">{{ i18nT('Henüz başvurun yok.') }}</p>
    <div v-if="claims.length===50" class="ds-note">{{ i18nT('İlk 50 başvuru gösteriliyor. Daha eski kayıtlar için destek ekibine başvur.') }}</div>
  </section>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
</style>
