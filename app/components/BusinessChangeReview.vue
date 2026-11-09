<script setup lang="ts">
import {ref} from 'vue';
import ProfileReviewCard from '~/components/ProfileReviewCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {Change} from '~/lib/business-change-review-helpers';

const {t: i18nT} = useLocale();
const app = useApp();
const changes = ref<Change[]>([]);
const loading = ref(false);
const error = ref('');
const reload = ref(0);
const message = ref('');

useClientEffect(() => [app.user, app.demo, reload.value], () => {
  let cancelled = false;
  changes.value = [];
  error.value = '';
  const user = app.user;
  if (app.demo || !user) return;
  loading.value = true;
  user
    .getIdToken()
    .then(token => apiFetch('/api/admin/business-changes', {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? 'İncelemeler yüklenemedi.');
      if (!cancelled) changes.value = d.changes;
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

async function decide(c: Change, decision: 'approve' | 'reject', reason: string) {
  const r = await apiFetch('/api/admin/business-changes', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify({businessId: c.id, revisionId: c.revisionId, decision, reason})});
  const d = await r.json();
  if (!r.ok) throw Error(d.error ?? 'Karar kaydedilemedi.');
  changes.value = changes.value.filter(x => x.id !== c.id);
  message.value = i18nT('{0}: {1}. Karar geçmişe kaydedildi.', {'0': c.profile.name, '1': i18nT(decision === 'approve' ? 'onaylandı' : 'reddedildi')});
}
</script>

<template>
  <section v-if="app.demo" class="panel"><h2>{{ i18nT("Profil değişikliği incelemeleri") }}</h2><p>{{ i18nT("Canlı yönetici hesabı bağlandığında mevcut ve önerilen bilgiler yan yana karşılaştırılabilir. Önizlemede gerçek onay işlemi yapılmaz.") }}</p></section>
  <section v-else-if="!app.user" class="panel"><p>{{ i18nT("İnceleme için yönetici hesabıyla giriş yap.") }}</p></section>
  <template v-else>
    <div class="row between"><h2>{{ i18nT("Bekleyen profil değişiklikleri") }}</h2><button class="button secondary compact" :disabled="loading" @click="reload++">{{ i18nT("Yenile") }}</button></div>
    <p class="small muted">{{ i18nT("En fazla 50 bekleyen kayıt gösterilir. İşlem sonrasında yenileyerek sıradaki kayıtları yükle.") }}</p>
    <p v-if="message" class="notice" role="status">{{ i18nT(message) }}</p>
    <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
    <p v-if="loading" role="status">{{ i18nT("İncelemeler yükleniyor…") }}</p>
    <template v-else><ProfileReviewCard v-for="c in changes" :key="c.revisionId" :change="c" :onDecision="(d,r)=>decide(c,d,r)"/></template>
    <p v-if="!loading && !error && changes.length===0">{{ i18nT("Bekleyen profil değişikliği yok.") }}</p>
  </template>
</template>
