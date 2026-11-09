<script setup lang="ts">
import {computed, ref} from 'vue';
import {claimStatusLabels} from '@otosanayide/core/claim-status';
import ClaimReviewPanelReviewItem from '~/components/ClaimReviewPanelReviewItem.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {Claim} from '~/lib/claim-review-panel-helpers';

const {t: i18nT} = useLocale();
const app = useApp();
const claims = ref<Claim[]>([]);
const error = ref('');
const loading = ref(false);
const reload = ref(0);
const selected = ref('');
const message = ref('');

useClientEffect(() => [app.demo, app.user, reload.value], () => {
  let cancelled = false;
  claims.value = [];
  error.value = '';
  const user = app.user;
  if (app.demo || !user) return;
  loading.value = true;
  user.getIdToken()
    .then(token => apiFetch('/api/admin/claims', {headers: {Authorization: `Bearer ${token}`}}))
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

const claim = computed(() => claims.value.find(c => c.id === selected.value));

/** Bound at render, like the source closure: a late result still belongs to the claim it was started for. */
function mappedFor(claimId: string) {
  return (businessId: string) => {
    claims.value = claims.value.map(c => (c.id === claimId ? {...c, businessId} : c));
    message.value = 'İşletme eşlendi. Belge incelemesine devam edebilirsin.';
  };
}

function done() {
  message.value = 'Başvuru kararı ve işlem geçmişi kaydedildi.';
  selected.value = '';
  reload.value += 1;
}
</script>

<template>
  <section v-if="app.demo" class="panel">
    <h2>{{ i18nT('Sahiplik başvuruları') }}</h2>
    <p>{{ i18nT('Canlı yönetici hesabında başvuru seçimi, özel belge incelemesi, ek bilgi talebi ve gerekçeli onay/ret burada yapılır.') }}</p>
    <ol class="stack">
      <li>{{ i18nT('Başvurunun doğru işletmeyle eşleşmesini kontrol et.') }}</li>
      <li>{{ i18nT('Her belgeyi açıp temsil yetkisini incele.') }}</li>
      <li>{{ i18nT('Belge incelemesini kaydet ve başvuru kararını ver.') }}</li>
    </ol>
    <p class="notice">{{ i18nT('Önizlemede özel belge alınmaz ve gerçek sahiplik yetkisi verilmez.') }}</p>
  </section>
  <section v-else-if="!app.user" class="panel">
    <p>{{ i18nT('Başvuruları görmek için yönetici hesabıyla giriş yap.') }}</p>
  </section>
  <template v-else>
    <div class="row between">
      <h2>{{ i18nT('Sahiplik inceleme kuyruğu') }}</h2>
      <button class="button secondary compact" :disabled="loading" @click="reload++">{{ i18nT('Başvuruları yenile') }}</button>
    </div>
    <p v-if="message" class="notice" role="status">{{ i18nT(message) }}</p>
    <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
    <p v-if="loading" role="status">{{ i18nT('Başvurular yükleniyor…') }}</p>
    <template v-else>
      <label>{{ i18nT('İncelenecek başvuru') }}<select v-model="selected"><option value="">{{ i18nT('Başvuru seç') }}</option><option v-for="c in claims" :key="c.id" :value="c.id">{{ i18nT(c.name) }} · {{ c.city }} · {{ claimStatusLabels[c.status] }}</option></select></label>
      <ClaimReviewPanelReviewItem v-if="claim" :key="`${claim.id}-${claim.businessId??'unbound'}-${reload}`" :claim="claim" :onMapped="mappedFor(claim.id)" :onDone="done"/>
      <p v-if="!error&&!claims.length">{{ i18nT('Bekleyen başvuru yok.') }}</p>
      <p class="small muted">{{ i18nT('En fazla 50 açık başvuru gösterilir; karar sonrası liste güncellenir.') }}</p>
    </template>
  </template>
</template>
