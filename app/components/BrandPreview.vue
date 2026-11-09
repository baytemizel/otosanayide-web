<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {cities, categories} from '@otosanayide/core';
import {brandDeliveryInput, brandDeliveryLabels, type BrandDeliveryReason} from '@otosanayide/core/brand-delivery';

type Result = {reason: BrandDeliveryReason; eligible: boolean; checkedAtMs: number; ad: null | {brand: string; headline: string; description: string; url: string; image: {id: string; width: number; height: number}}};
const props = withDefaults(defineProps<{id?: string; demo?: boolean; disabled?: boolean; onBusy?: (v: boolean) => void}>(), {demo: false, disabled: false});
const app = useApp();
const {t, localeTag} = useLocale();
const city = ref('İstanbul');
const category = ref('');
const placement = ref('home_banner');
const result = ref<Result | null>(null);
const image = ref<string | null>(null);
const busy = ref(false);
const error = ref('');
let lock = false, pending: AbortController | null = null;
const text = (e: Event) => (e.target as HTMLSelectElement).value;

useClientEffect(() => [], () => () => {
  pending?.abort();
});
useClientEffect(() => [image.value], () => {
  const url = image.value;
  return () => {
    if (url) URL.revokeObjectURL(url);
  };
});

async function check(e: Event) {
  e.preventDefault();
  const id = props.id;
  if (!id || props.demo || lock) return;
  lock = true;
  busy.value = true;
  props.onBusy?.(true);
  result.value = null;
  image.value = null;
  error.value = '';
  try {
    const input = brandDeliveryInput.safeParse({reservationId: id, city: city.value, category: category.value, placement: placement.value});
    if (!input.success) throw Error(brandDeliveryLabels.invalid);
    const r = await apiFetch('/api/admin/brand-preview?' + new URLSearchParams(input.data), {headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`}, cache: 'no-store'}), d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (!Object.prototype.hasOwnProperty.call(brandDeliveryLabels, d.reason) || Object.entries(input.data).some(([k, v]) => d.context?.[k] !== v)) throw Error('Reklam ödeme kaydı doğrulanamadı. Yenile.');
    result.value = d;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı. Daha sonra tekrar deneyin.';
  } finally {
    lock = false;
    busy.value = false;
    props.onBusy?.(false);
  }
}

async function loadImage() {
  const id = props.id, current = result.value;
  if (!id || !current?.eligible || !current.ad?.image || lock) return;
  lock = true;
  busy.value = true;
  props.onBusy?.(true);
  image.value = null;
  error.value = '';
  const controller = new AbortController();
  pending = controller;
  try {
    const r = await apiFetch('/api/admin/brand-preview/image?' + new URLSearchParams({reservationId: id, city: city.value, category: category.value, placement: placement.value, imageId: current.ad.image.id}), {headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`}, cache: 'no-store', signal: controller.signal});
    if (!r.ok) {
      const d = await r.json();
      throw Error(d.error);
    }
    if (r.headers.get('content-type') !== 'image/webp') throw Error('Banner görseli doğrulanamadı veya reklam koşulları değişti. Önizlemeyi yenile.');
    const blob = await r.blob();
    if (!blob.size || blob.size > 2500000) throw Error('Banner görseli doğrulanamadı veya reklam koşulları değişti. Önizlemeyi yenile.');
    if (!controller.signal.aborted) image.value = URL.createObjectURL(blob);
  } catch (e) {
    if (!controller.signal.aborted) error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı. Daha sonra tekrar deneyin.';
  } finally {
    lock = false;
    if (!controller.signal.aborted) {
      busy.value = false;
      props.onBusy?.(false);
    }
  }
}

const time = (v: number) => new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'});

function onImageError() {
  image.value = null;
  error.value = 'Banner görseli görüntülenemedi. Önizlemeyi yenile.';
}
</script>

<template>
  <section class="panel stack">
    <h4>{{ t('Yayın Uygunluğu Önizlemesi') }}</h4>
    <p class="notice">{{ t('Bu önizleme reklamı yayımlamaz. Banner görselini yüklerken dosya bütünlüğü ve güncel yayın koşulları yeniden kontrol edilir.') }}</p>
    <p v-if="demo||!id">{{ t('Önizleme için gerçek reklam rezervasyonunu yükle.') }}</p>
    <form v-else class="stack" @submit="check">
      <fieldset class="form-grid" :disabled="busy||disabled" :style="{border:0,padding:0,minWidth:0}">
        <label>{{ t('Önizleme şehri') }}<select :value="city" @change="city=text($event);result=null;image=null"><option v-for="v in cities" :key="v">{{ v }}</option></select></label>
        <label>{{ t('Önizleme alanı') }}<select :value="placement" @change="placement=text($event);result=null;image=null"><option value="home_banner">{{ t('Ana sayfa banner') }}</option><option value="category_banner">{{ t('Kategori banner') }}</option></select></label>
        <label>{{ t('Önizleme kategorisi') }}<select :value="category" @change="category=text($event);result=null;image=null"><option value="">{{ t('Kategori seçilmedi') }}</option><option v-for="v in categories" :key="v.id" :value="v.id">{{ t(v.name) }}</option></select></label>
      </fieldset>
      <button class="button secondary" :disabled="busy||disabled||placement==='category_banner'&&!category">{{ t('Yayın koşullarını kontrol et') }}</button>
    </form>
    <div v-if="result" class="notice stack" role="status">
      <strong>{{ t(brandDeliveryLabels[result.reason]) }}</strong>
      <small>{{ t('Son sunucu kontrolü') }}: {{ time(result.checkedAtMs) }} · {{ t('İstanbul saati') }}</small>
      <article v-if="result.eligible&&result.ad" class="panel stack">
        <span class="badge">{{ t('Sponsorlu') }}</span>
        <strong>{{ result.ad.brand }}</strong>
        <h4>{{ result.ad.headline }}</h4>
        <p>{{ result.ad.description }}</p>
        <small :style="{overflowWrap:'anywhere'}">{{ result.ad.url }}</small>
        <template v-if="image">
          <img :src="image" :alt="t('Doğrulanmış banner önizlemesi')" :style="{width:'100%',height:'auto',maxHeight:'400px',objectFit:'contain',borderRadius:'12px'}" @error="onImageError"/>
          <small>{{ t('Banner dosyası doğrulandı. Bu bir yönetim önizlemesidir.') }}</small>
        </template>
        <button v-else type="button" class="button secondary" :disabled="busy||disabled" @click="void loadImage()">{{ t('Banner görselini doğrula ve göster') }}</button>
      </article>
    </div>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
  </section>
</template>
