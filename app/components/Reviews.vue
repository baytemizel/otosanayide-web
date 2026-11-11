<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {MessageSquare, Pencil, Star} from '@lucide/vue';
import {reviewSchema} from '@otosanayide/core';
import OwnReviewStatus from '~/components/OwnReviewStatus.vue';
import ReviewCard from '~/components/ReviewCard.vue';
import ReviewForm from '~/components/ReviewForm.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {ReviewView} from '~/lib/reviews-helpers';

const props = withDefaults(defineProps<{businessId: string; businessName?: string; sample?: boolean; onSummary?: (value: {count: number; average: number | null}) => void}>(), {sample: false});

/** Dimension averages are not in the API; these rows stay passive and show no values. */
const dimensionLabels = ['Hizmet kalitesi', 'İletişim', 'Fiyat şeffaflığı', 'Ödeme kolaylığı', 'Temizlik'];

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
const empty = computed(() => !loading.value && !error.value && !reviews.value.length && !cursor.value);

watch([loading, error, count, average], () => {
  if (!loading.value && !error.value) props.onSummary?.({count: count.value, average: average.value});
});

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
  <section id="deneyimler" class="ds-card rv">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h2 class="rv-h">{{ i18nT(empty?'Yorumlar':'Yorumlar ve puanlar') }}</h2>
      <template v-if="!empty">
        <template v-if="app.member"><button v-if="!hasOwnReview||app.demo||sample" :disabled="!app.demo&&!sample&&hasOwnReview===null" class="ds-btn s sm" @click="writing=!writing"><Pencil :size="15"/>{{ i18nT('Deneyimini paylaş') }}</button></template>
        <NuxtLink v-else class="ds-btn s sm" to="/giris">{{ i18nT('Yorum için giriş yap') }}</NuxtLink>
      </template>
    </div>
    <OwnReviewStatus v-if="!sample" :key="app.user?.uid??'guest'" :businessId="businessId" :revision="reload" :onChanged="changed" :onPresence="setHasOwnReview"/>
    <div v-if="count>0" class="rv-summary">
      <div class="rv-score">
        <span class="ds-serif rv-average">{{ average?.toLocaleString(i18nLocaleTag,{minimumFractionDigits:1,maximumFractionDigits:1}) }}</span>
        <span class="ds-stars" role="img" :aria-label="`${average?.toLocaleString(i18nLocaleTag,{minimumFractionDigits:1,maximumFractionDigits:1})} / 5`"><Star v-for="n in 5" :key="n" :size="16" :fill="n<=Math.round(average??0)?'currentColor':'none'"/></span>
        <span class="ds-xs ds-muted">{{ count }}{{ i18nT(' yayımlanmış değerlendirme') }}</span>
      </div>
      <div class="rv-bars ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
        <div v-for="label in dimensionLabels" :key="label" class="rv-bar"><span class="ds-small">{{ i18nT(label) }}</span><span class="ds-bar"/></div>
      </div>
    </div>
    <ReviewForm v-if="writing" :onSubmit="submit" :onCancel="closeForm" :demo="app.demo||sample" :businessName="businessName"/>
    <p v-if="loading" role="status" class="ds-small ds-muted">{{ i18nT('Deneyimler yükleniyor…') }}</p>
    <div v-else-if="error" role="alert" class="ds-note err rv-error">
      <p>{{ i18nT(error) }}</p>
      <button class="ds-btn s sm" @click="reload++">{{ i18nT('Tekrar dene') }}</button>
    </div>
    <div v-else-if="reviews.length" class="rv-list">
      <ReviewCard v-for="r in reviews" :key="r.id" :review="r" reportable/>
    </div>
    <template v-else>
      <div class="ds-note"><MessageSquare :size="16"/><p>{{ app.demo||sample?i18nT('Önizlemede gerçek müşteri yorumu gösterilmez.'):i18nT('Bu işletme için henüz yorum yok. “Henüz yorum yok” sıfır yıldız anlamına gelmez.') }}</p></div>
      <template v-if="empty">
        <template v-if="app.member"><button v-if="!hasOwnReview||app.demo||sample" :disabled="!app.demo&&!sample&&hasOwnReview===null" class="ds-btn s rv-first" @click="writing=!writing"><Pencil :size="15"/>{{ i18nT('İlk yorumu yaz') }}</button></template>
        <NuxtLink v-else class="ds-btn s rv-first" to="/giris">{{ i18nT('Yorum için giriş yap') }}</NuxtLink>
      </template>
    </template>
    <div v-if="!loading&&!error&&(next||cursor)" class="ds-row ds-g8 ds-wrap rv-pager">
      <button v-if="cursor" class="ds-btn s" @click="cursor=''">{{ i18nT('İlk yorumlar') }}</button>
      <button v-if="next" class="ds-btn s" @click="cursor=next!">{{ i18nT('Sonraki yorumlar') }}</button>
    </div>
  </section>
</template>

<style scoped>
.rv {display: flex; flex-direction: column; gap: 16px; padding: 24px;}
.rv :deep(p) {margin: 0;}
.rv-h {margin: 0; font: 700 19px/1.3 Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0;}
.rv-summary {display: flex; align-items: flex-start; gap: 40px;}
.rv-score {flex: none; width: 160px; display: flex; flex-direction: column; gap: 4px;}
.rv-average {font-size: 52px; line-height: 1; font-weight: 700; letter-spacing: -1.04px;}
.rv-bars {flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px;}
.rv-bar {display: flex; align-items: center; gap: 12px;}
.rv-bar > span:first-child {flex: none; width: 150px;}
.rv-list {display: flex; flex-direction: column;}
.rv-error {flex-direction: column;}
.rv-first {align-self: flex-start;}
.rv-pager > .ds-btn {flex: 1 1 200px;}
@media (max-width: 1100px) {
  .rv-summary {gap: 24px;}
  .rv-bar > span:first-child {width: 110px;}
}
@media (max-width: 760px) {
  .rv {padding: 0; border: 0;}
  .rv-summary {flex-direction: column; gap: 16px;}
  .rv-score, .rv-bars {width: 100%;}
  .rv-bar > span:first-child {width: 120px;}
}
</style>
