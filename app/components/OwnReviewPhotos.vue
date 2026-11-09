<script setup lang="ts">
import {ref} from 'vue';
import ReviewPhotoFiles from '~/components/ReviewPhotoFiles.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {ReviewPhoto} from '~/lib/review-photos-helpers';

const props = defineProps<{reviewId: string}>();

const app = useApp();
const {t: i18nT} = useLocale();
const data = ref<{enabled: boolean; canUpload: boolean; items: ReviewPhoto[]} | null>(null);
const error = ref('');
const reload = ref(0);

useClientEffect(() => [app.user, props.reviewId, reload.value], () => {
  let cancel = false;
  error.value = '';
  data.value = null;
  const user = app.user, reviewId = props.reviewId;
  if (!user) return;
  user.getIdToken().then(token => apiFetch(`/api/review-photos?reviewId=${encodeURIComponent(reviewId)}`, {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (!cancel) data.value = d;
  }).catch(e => {
    if (!cancel) error.value = e.message;
  });
  return () => {
    cancel = true;
  };
});

async function request(path: string, method: string, body?: BodyInit, type = 'application/json') {
  const r = await apiFetch(path, {method, headers: {Authorization: `Bearer ${await app.user!.getIdToken()}`, 'Content-Type': type}, body});
  if (!r.ok) {
    const d = await r.json();
    throw Error(d.error);
  }
  return r;
}
async function open(id: string) {
  return (await request(`/api/review-photos/media?id=${id}`, 'GET')).blob();
}
async function upload(blob: Blob) {
  await request(`/api/review-photos?reviewId=${encodeURIComponent(props.reviewId)}&rights=yes`, 'POST', blob, blob.type);
  reload.value++;
}
async function withdraw(id: string, version: number) {
  await request('/api/review-photos', 'PATCH', JSON.stringify({id, version}));
  reload.value++;
}
</script>

<template>
  <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
  <button class="text-link" @click="reload++">{{ i18nT('Fotoğraf listesini yenile') }}</button>
  <ReviewPhotoFiles v-if="data" :key="reload" :enabled="data.enabled" :canUpload="data.canUpload" :items="data.items" :onOpen="open" :onUpload="upload" :onWithdraw="withdraw"/>
</template>
