<script setup lang="ts">
import {computed, ref} from 'vue';
import {claimStatusLabels} from '@otosanayide/core/claim-status';
import ClaimReviewPanelReviewItem from '~/components/ClaimReviewPanelReviewItem.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
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
      const d = await responseJson(r);
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
  <section v-if="app.demo" class="ds-card ds-pad24 ds-col ds-g12">
    <h3 style="margin:0">{{ i18nT('Sahiplik başvuruları') }}</h3>
    <div class="ds-small ds-muted">{{ i18nT('Canlı yönetici hesabında başvuru seçimi, özel belge incelemesi, ek bilgi talebi ve gerekçeli onay/ret burada yapılır.') }}</div>
    <ol class="ds-col ds-g8 ds-small" style="margin:0;padding-left:20px">
      <li>{{ i18nT('Başvurunun doğru işletmeyle eşleşmesini kontrol et.') }}</li>
      <li>{{ i18nT('Her belgeyi açıp temsil yetkisini incele.') }}</li>
      <li>{{ i18nT('Belge incelemesini kaydet ve başvuru kararını ver.') }}</li>
    </ol>
    <div class="ds-note warn">{{ i18nT('Önizlemede özel belge alınmaz ve gerçek sahiplik yetkisi verilmez.') }}</div>
  </section>
  <section v-else-if="!app.user" class="ds-card ds-pad24">
    <div class="ds-small ds-muted">{{ i18nT('Başvuruları görmek için yönetici hesabıyla giriş yap.') }}</div>
  </section>
  <section v-else class="ds-col ds-g16">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3 style="margin:0">{{ i18nT('Sahiplik inceleme kuyruğu') }}</h3>
      <button class="ds-btn s sm" :disabled="loading" @click="reload++">{{ i18nT('Başvuruları yenile') }}</button>
    </div>
    <div v-if="message" class="ds-note ok" role="status">{{ i18nT(message) }}</div>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
    <div v-if="loading" class="ds-small ds-muted" role="status">{{ i18nT('Başvurular yükleniyor…') }}</div>
    <template v-else>
      <label class="ds-col" style="max-width:480px"><span class="ds-label">{{ i18nT('İncelenecek başvuru') }}</span><select v-model="selected" class="ds-field"><option value="">{{ i18nT('Başvuru seç') }}</option><option v-for="c in claims" :key="c.id" :value="c.id">{{ i18nT(c.name) }} · {{ c.city }} · {{ claimStatusLabels[c.status] }}</option></select></label>
      <ClaimReviewPanelReviewItem v-if="claim" :key="`${claim.id}-${claim.businessId??'unbound'}-${reload}`" :claim="claim" :onMapped="mappedFor(claim.id)" :onDone="done"/>
      <div v-if="!error&&!claims.length" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('Bekleyen başvuru yok.') }}</div>
      <div class="ds-xs ds-muted">{{ i18nT('En fazla 50 açık başvuru gösterilir; karar sonrası liste güncellenir.') }}</div>
    </template>
  </section>
</template>
