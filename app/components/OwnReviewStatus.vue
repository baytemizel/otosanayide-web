<script setup lang="ts">
import {ref} from 'vue';
import {reviewSchema} from '@otosanayide/core';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import type {OwnReviewView} from '~/lib/own-review-status-helpers';
import CaseButton from '~/components/CaseButton.vue';
import OwnReviewEditor from '~/components/OwnReviewEditor.vue';
import OwnReviewPhotos from '~/components/OwnReviewPhotos.vue';

const props = withDefaults(defineProps<{businessId: string; revision?: number; onChanged?: () => void; onPresence?: (value: boolean | null) => void}>(), {revision: 0});
const app = useApp();
const {t: i18nT} = useLocale();
const review = ref<OwnReviewView | null>(null);
const error = ref('');
const reload = ref(0);
const loading = ref(false);

useClientEffect(() => [app.user, app.demo, props.businessId, props.revision, reload.value, props.onPresence], () => {
  let cancelled = false;
  review.value = null;
  error.value = '';
  props.onPresence?.(null);
  const user = app.user;
  if (!user || app.demo) return;
  loading.value = true;
  const businessId = props.businessId;
  user.getIdToken()
    .then(token => apiFetch(`/api/reviews/mine?businessId=${encodeURIComponent(businessId)}`, {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await responseJson(r);
      if (!r.ok) throw Error(d.error);
      if (!cancelled) {
        review.value = d.review;
        props.onPresence?.(!!d.review);
      }
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

async function mutate(data: Record<string, unknown>) {
  const user = app.user;
  if (!user) throw Error('Giriş gerekli.');
  const businessId = props.businessId;
  const r = await apiFetch('/api/reviews/mine', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify({...data, businessId})});
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error);
  if (props.onChanged) props.onChanged();
  else reload.value++;
}

async function edit(fields: Record<string, unknown>, version: number) {
  const value = reviewSchema.parse({...fields, businessId: props.businessId});
  await mutate({action: 'edit', expectedVersion: version, review: value});
}

function withdraw(version: number) {
  return mutate({action: 'withdraw', expectedVersion: version, confirmed: true});
}
</script>

<template>
  <template v-if="app.user&&!app.demo">
    <p v-if="loading" role="status" class="ds-small ds-muted">{{ i18nT('Yorum durumun yükleniyor…') }}</p>
    <template v-else-if="review">
      <OwnReviewEditor :key="`${review.id}-${review.version}`" :review="review" :onEdit="edit" :onWithdraw="withdraw"/>
      <CaseButton v-if="['rejected','hidden'].includes(review.status)" :reviewId="review.id" kind="appeal"/>
      <OwnReviewPhotos v-if="review.status!=='withdrawn'" :key="`${review.id}-${review.version}`" :reviewId="review.id"/>
    </template>
    <button class="ds-btn g sm ors-refresh" :disabled="loading" @click="reload++">{{ i18nT('Yorum durumunu yenile') }}</button>
    <p v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</p>
  </template>
</template>

<style scoped>
.ors-refresh {align-self: flex-start; padding: 0;}
</style>
