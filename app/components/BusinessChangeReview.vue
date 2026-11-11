<script setup lang="ts">
import {ref} from 'vue';
import OpeningHoursSummary from '~/components/OpeningHoursSummary.vue';
import ProfileReviewCard from '~/components/ProfileReviewCard.vue';
import {contractReady} from '~/lib/contract';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
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
    .then(token => apiFetch(`/api/admin/business-changes${contractReady.adminV2 ? '?v=2' : ''}`, {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await responseJson(r);
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
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error ?? 'Karar kaydedilemedi.');
  changes.value = changes.value.filter(x => x.id !== c.id);
  message.value = i18nT('{0}: {1}. Karar geçmişe kaydedildi.', {'0': c.profile.name, '1': i18nT(decision === 'approve' ? 'onaylandı' : 'reddedildi')});
}
</script>

<template>
  <section v-if="app.demo" class="ds-card ds-pad24 ds-col ds-g8"><h3 style="margin:0">{{ i18nT("Profil değişikliği incelemeleri") }}</h3><div class="ds-small ds-muted">{{ i18nT("Canlı yönetici hesabı bağlandığında mevcut ve önerilen bilgiler yan yana karşılaştırılabilir. Önizlemede gerçek onay işlemi yapılmaz.") }}</div></section>
  <section v-else-if="!app.user" class="ds-card ds-pad24"><div class="ds-small ds-muted">{{ i18nT("İnceleme için yönetici hesabıyla giriş yap.") }}</div></section>
  <section v-else class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12"><h3 style="margin:0">{{ i18nT("Bekleyen profil değişiklikleri") }}</h3><button class="ds-btn s sm" :disabled="loading" @click="reload++">{{ i18nT("Yenile") }}</button></div>
    <div class="ds-small ds-muted">{{ i18nT("En fazla 50 bekleyen kayıt gösterilir. İşlem sonrasında yenileyerek sıradaki kayıtları yükle.") }}</div>
    <div v-if="message" class="ds-note ok" role="status">{{ i18nT(message) }}</div>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
    <div v-if="loading" class="ds-small ds-muted" role="status">{{ i18nT("İncelemeler yükleniyor…") }}</div>
    <template v-else>
      <template v-for="c in changes" :key="c.revisionId">
        <!-- portal-04: hour changes ride on the same approval; v=2 adds the published and pending values. -->
        <div v-if="(c as any).pendingOpeningHours" class="ds-card ds-pad ds-row ds-wrap ds-g16 hours-change">
          <div class="ds-col ds-g4"><strong class="ds-small">{{ i18nT('Yayındaki çalışma saatleri') }}</strong><OpeningHoursSummary class="ds-xs" :value="(c as any).openingHours"/></div>
          <div class="ds-col ds-g4"><strong class="ds-small">{{ i18nT((c as any).pendingOpeningHours.action === 'clear' ? 'Önerilen: saatleri kaldır' : 'Önerilen çalışma saatleri') }}</strong><OpeningHoursSummary v-if="(c as any).pendingOpeningHours.action !== 'clear'" class="ds-xs" :value="(c as any).pendingOpeningHours.value"/></div>
        </div>
        <ProfileReviewCard :change="c" :onDecision="(d,r)=>decide(c,d,r)"/>
      </template>
    </template>
    <div v-if="!loading && !error && changes.length===0" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT("Bekleyen profil değişikliği yok.") }}</div>
  </section>
</template>
