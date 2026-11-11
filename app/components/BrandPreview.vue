<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {brandPreviewResponse, readAdImage, readAdResponse} from '~/lib/ads-client';
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
    const r = await apiFetch('/api/admin/brand-preview?' + new URLSearchParams(input.data), {headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`}, cache: 'no-store'}), d = await readAdResponse(r, raw => brandPreviewResponse.parse(raw));
    if (!Object.prototype.hasOwnProperty.call(brandDeliveryLabels, d.reason) || Object.entries(input.data).some(([k, v]) => (d.context as Record<string, unknown>)[k] !== v)) throw Error('Reklam ödeme kaydı doğrulanamadı. Yenile.');
    result.value = d as Result;
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
    let blob: Blob;
    try {
      blob = await readAdImage(r);
    } catch (e) {
      throw r.ok ? Error('Banner görseli doğrulanamadı veya reklam koşulları değişti. Önizlemeyi yenile.') : e;
    }
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
  <section class="sec ds-col ds-g12">
    <h4>{{ t('Yayın Uygunluğu Önizlemesi') }}</h4>
    <p class="ds-note info ds-col">{{ t('Bu önizleme reklamı yayımlamaz. Banner görselini yüklerken dosya bütünlüğü ve güncel yayın koşulları yeniden kontrol edilir.') }}</p>
    <p v-if="demo||!id">{{ t('Önizleme için gerçek reklam rezervasyonunu yükle.') }}</p>
    <form v-else class="ds-col ds-g12" @submit="check">
      <fieldset class="grid fs" :disabled="busy||disabled">
        <label class="fld"><span class="ds-label">{{ t('Önizleme şehri') }}</span><select class="ds-field" :value="city" @change="city=text($event);result=null;image=null"><option v-for="v in cities" :key="v">{{ v }}</option></select></label>
        <label class="fld"><span class="ds-label">{{ t('Önizleme alanı') }}</span><select class="ds-field" :value="placement" @change="placement=text($event);result=null;image=null"><option value="home_banner">{{ t('Ana sayfa banner') }}</option><option value="category_banner">{{ t('Kategori banner') }}</option></select></label>
        <label class="fld"><span class="ds-label">{{ t('Önizleme kategorisi') }}</span><select class="ds-field" :value="category" @change="category=text($event);result=null;image=null"><option value="">{{ t('Kategori seçilmedi') }}</option><option v-for="v in categories" :key="v.id" :value="v.id">{{ t(v.name) }}</option></select></label>
      </fieldset>
      <button class="ds-btn s" :disabled="busy||disabled||placement==='category_banner'&&!category">{{ t('Yayın koşullarını kontrol et') }}</button>
    </form>
    <div v-if="result" class="ds-note info ds-col" role="status">
      <strong>{{ t(brandDeliveryLabels[result.reason]) }}</strong>
      <small class="ds-xs ds-muted">{{ t('Son sunucu kontrolü') }}: {{ time(result.checkedAtMs) }} · {{ t('İstanbul saati') }}</small>
      <article v-if="result.eligible&&result.ad" class="ds-card ds-pad16 ds-col ds-g8 ad">
        <span class="ds-badge sp">{{ t('Sponsorlu') }}</span>
        <strong>{{ result.ad.brand }}</strong>
        <h4>{{ result.ad.headline }}</h4>
        <p>{{ result.ad.description }}</p>
        <small class="ds-xs ds-muted brk">{{ result.ad.url }}</small>
        <template v-if="image">
          <img :src="image" :alt="t('Doğrulanmış banner önizlemesi')" :style="{width:'100%',height:'auto',maxHeight:'400px',objectFit:'contain',borderRadius:'12px'}" @error="onImageError"/>
          <small class="ds-xs ds-muted">{{ t('Banner dosyası doğrulandı. Bu bir yönetim önizlemesidir.') }}</small>
        </template>
        <button v-else type="button" class="ds-btn s" :disabled="busy||disabled" @click="void loadImage()">{{ t('Banner görselini doğrula ve göster') }}</button>
      </article>
    </div>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" class="ds-note err" role="alert">{{ t(error) }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
.all{grid-column:1/-1}
@media(max-width:760px){.grid{grid-template-columns:minmax(0,1fr)}}
.fs{border:0;padding:0;margin:0;min-width:0}
.sec{border-top:1px solid #edf0f3;padding-top:20px}
.brk{overflow-wrap:anywhere}
.ad{width:100%}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
