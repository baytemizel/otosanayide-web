<script setup lang="ts">
import {ref} from 'vue';
import {MessageSquare, Star} from '@lucide/vue';
import {reviewSchema} from '@otosanayide/core';
import OwnReviewStatus from '~/components/OwnReviewStatus.vue';
import ReviewCard from '~/components/ReviewCard.vue';
import ReviewForm from '~/components/ReviewForm.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {ReviewView} from '~/lib/reviews-helpers';

const props = withDefaults(defineProps<{businessId: string; sample?: boolean}>(), {sample: false});

const {t: i18nT, localeTag: i18nLocaleTag} = useLocale();
const app = useApp();
const hasOwnReview = ref<boolean | null>(null);
const writing = ref(false);
const reviews = ref<ReviewView[]>([]);
const count = ref(0);
const average = ref<number | null>(null);
const next = ref<string | null>(null);
const cursor = ref('');
const loading = ref(!app.demo && !props.sample);
const error = ref('');
const reload = ref(0);

useClientEffect(() => [props.businessId, cursor.value, app.demo, props.sample, reload.value], () => {
  if (app.demo || props.sample) return;
  let cancelled = false;
  loading.value = true;
  error.value = '';
  apiFetch(`/api/reviews?businessId=${encodeURIComponent(props.businessId)}${cursor.value ? `&after=${encodeURIComponent(cursor.value)}` : ''}`).then(async r => {
    const d = await r.json();
    if (!r.ok) throw Error(d.error ?? 'Yorumlar yüklenemedi.');
    if (!cancelled) {
      reviews.value = d.reviews;
      count.value = d.count;
      average.value = d.average;
      next.value = d.nextCursor;
    }
  }).catch(e => {
    if (!cancelled) error.value = e.message;
  }).finally(() => {
    if (!cancelled) loading.value = false;
  });
  return () => {
    cancelled = true;
  };
});

function changed() {
  cursor.value = '';
  reload.value++;
}
function setHasOwnReview(value: boolean | null) {
  hasOwnReview.value = value;
}
function closeForm() {
  writing.value = false;
}
async function submit(fields: Record<string, unknown>) {
  const v = reviewSchema.parse({...fields, businessId: props.businessId});
  if (app.demo || props.sample) {
    app.notify('Örnek yorum kontrol edildi. Yayımlanmadı ve puanlara eklenmedi.');
    writing.value = false;
    return;
  }
  const user = app.user;
  if (!user) throw Error('Giriş yapman gerekli.');
  const r = await apiFetch('/api/reviews', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify(v)});
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  app.notify('Yorumun incelemeye alındı. Onaylandığında burada görünecek.');
  writing.value = false;
  reload.value++;
}
</script>

<template>
  <section class="section" id="deneyimler">
    <div class="row between">
      <h2>{{ i18nT('Deneyimler') }}</h2>
      <template v-if="app.member"><button v-if="!hasOwnReview||app.demo||sample" :disabled="!app.demo&&!sample&&hasOwnReview===null" class="button secondary" @click="writing=!writing"><Star :size="17"/>{{ i18nT('Yorum yaz') }}</button></template>
      <NuxtLink v-else class="button secondary" to="/giris">{{ i18nT('Yorum için giriş yap') }}</NuxtLink>
    </div>
    <OwnReviewStatus v-if="!sample" :key="app.user?.uid??'guest'" :businessId="businessId" :revision="reload" :onChanged="changed" :onPresence="setHasOwnReview"/>{{ ' ' }}<p v-if="count>0"><strong>{{ average?.toLocaleString(i18nLocaleTag,{minimumFractionDigits:1,maximumFractionDigits:1}) }} / 5</strong> · {{ count }}{{ i18nT(' yayımlanmış değerlendirme') }}</p>
    <ReviewForm v-if="writing" :onSubmit="submit" :onCancel="closeForm" :demo="app.demo||sample"/>{{ ' ' }}<p v-if="loading" role="status">{{ i18nT('Deneyimler yükleniyor…') }}</p>
    <div v-else-if="error" role="alert" class="notice">
      <p>{{ i18nT(error) }}</p>
      <button class="button secondary" @click="reload++">{{ i18nT('Tekrar dene') }}</button>
    </div>
    <template v-else-if="reviews.length">
      <ReviewCard v-for="r in reviews" :key="r.id" :review="r" reportable/>
    </template>
    <div v-else class="inline-empty">
      <MessageSquare :size="30"/>
      <p>{{ app.demo||sample?i18nT('Önizlemede gerçek müşteri yorumu gösterilmez.'):i18nT('Henüz yayımlanmış bir deneyim yok.') }}</p>
    </div>
    <div v-if="!loading&&!error&&(next||cursor)" class="row">
      <button v-if="cursor" class="button secondary" @click="cursor=''">{{ i18nT('İlk yorumlar') }}</button>
      <button v-if="next" class="button secondary" @click="cursor=next!">{{ i18nT('Sonraki yorumlar') }}</button>
    </div>
  </section>
</template>
