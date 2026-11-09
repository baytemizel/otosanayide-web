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
  <section v-if="app.demo" class="panel">
    <h2>{{ i18nT('Başvuru takibi') }}</h2>
    <p>{{ i18nT('Önizleme başvuruları gerçek kurumsal hesap oluşturmaz. Canlı hesabında başvurunun durumunu, inceleme gerekçesini ve ek bilgi taleplerini burada göreceksin.') }}</p>
  </section>
  <section v-else-if="!app.user" class="panel">
    <p>{{ i18nT('Başvurularını takip etmek için giriş yap.') }}</p>
  </section>
  <section v-else>
    <div class="row between">
      <h2>{{ i18nT('Başvurularım') }}</h2>
      <button class="button secondary compact" :disabled="loading" @click="reload++">{{ i18nT('Başvuruları yenile') }}</button>
    </div>
    <p v-if="message" role="status" class="notice">{{ i18nT(message) }}</p>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <p v-if="loading" role="status">{{ i18nT('Başvurular yükleniyor…') }}</p>
    <template v-else>
      <div v-for="c in claims" :key="c.id">
        <ClaimReply :claim="c" :onReply="(text: string) => reply(c, text)"/>
        <ClaimEvidence :claimId="c.id" :canUpload="['submitted','needs_information'].includes(c.status)"/>
      </div>
    </template>
    <p v-if="!loading&&!error&&!claims.length">{{ i18nT('Henüz başvurun yok.') }}</p>
    <p v-if="claims.length===50" class="notice">{{ i18nT('İlk 50 başvuru gösteriliyor. Daha eski kayıtlar için destek ekibine başvur.') }}</p>
  </section>
</template>
