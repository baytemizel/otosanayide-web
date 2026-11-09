<script setup lang="ts">
import {computed, ref} from 'vue';
import {fetchBusinessPhotos, type BusinessPhotoCall} from '@otosanayide/core/business-photos';
import type {PreparedReviewPhoto} from '@otosanayide/core/own-review-photo-client';
import {fetchBusinessPhotoMedia} from '@otosanayide/core/public-review-photo-client';
import BusinessPhotosDialog from '~/components/BusinessPhotosDialog.vue';
import BusinessPhotosOwnerThumbnail from '~/components/BusinessPhotosOwnerThumbnail.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {prepareBusinessPhoto} from '~/lib/business-photo-preparation';
import {useMediaSession} from '~/lib/business-photos-helpers';

const labels = {uploading: 'İşleniyor', pending: 'İnceleme bekliyor', approved: 'Yayımlandı', rejected: 'Reddedildi', hidden: 'Yayında değil', failed: 'Yükleme tamamlanmadı'};

const props = defineProps<{businessId: string; reload: () => void}>();
const {t} = useLocale();
const {options, guard} = useMediaSession();
const data = ref<Awaited<ReturnType<typeof fetchBusinessPhotos>> | null>(null);
const photo = ref<(PreparedReviewPhoto & {id: string}) | null>(null);
const rights = ref(false);
const busy = ref(false);
const locked = ref(false);
const error = ref(false);
const opened = ref('');
const all = ref(false);
const confirming = ref<Extract<BusinessPhotoCall, {type: 'action'}>['value'] | null>(null);
let gate = false;

useClientEffect(() => [props.businessId, guard.value, options.value.origin, options.value.locale], () => {
  let active = true;
  const check = guard.value;
  fetchBusinessPhotos(options.value, {type: 'list', businessId: props.businessId})
    .then(v => {
      check();
      if (active) data.value = v;
    })
    .catch(() => {
      if (active) error.value = true;
    });
  return () => {
    active = false;
  };
});
useClientEffect(() => [photo.value], () => {
  const current = photo.value;
  return () => current?.dispose();
});

async function run(f: () => Promise<void>, write = false) {
  if (gate || (write && locked.value)) return;
  const check = guard.value;
  gate = true;
  busy.value = true;
  error.value = false;
  try {
    await f();
  } catch {
    try {
      check();
      error.value = true;
      if (write) locked.value = true;
    } catch {}
  } finally {
    gate = false;
    try {
      check();
      busy.value = false;
    } catch {}
  }
}
async function mutate(call: BusinessPhotoCall) {
  const check = guard.value;
  const current = options.value;
  await run(async () => {
    await fetchBusinessPhotos(current, call);
    check();
    props.reload();
  }, true);
}

const list = computed(() => (data.value && 'items' in data.value ? data.value : null));
const uploading = computed(() => list.value?.items.some(p => p.status === 'uploading'));

function openPhoto(id: string) {
  const check = guard.value;
  const current = options.value;
  void run(async () => {
    const v = await fetchBusinessPhotoMedia({...current, businessId: props.businessId, id, thumbnail: false}, {guard: check, token: current.token});
    check();
    opened.value = v.uri;
  });
}
function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (!f) return;
  const check = guard.value;
  void run(async () => {
    photo.value = null;
    rights.value = false;
    const image = await prepareBusinessPhoto(f);
    const value = {...image, id: crypto.randomUUID()};
    try {
      check();
      photo.value = value;
    } catch (err) {
      value.dispose();
      throw err;
    }
  });
}
function upload() {
  const current = photo.value!;
  void mutate({type: 'upload', businessId: props.businessId, requestId: current.id, photo: current, rights: true});
}
</script>

<template>
  <section class="panel stack business-media">
    <h2>{{ t('İşletme fotoğrafları') }}</h2>
    <p>{{ t('En fazla 8 fotoğraf. Yüklemeden önce otomatik küçültülür; bağımsız incelemeden sonra yayımlanır. İlk onaylı fotoğraf kapak olur.') }}</p>
    <button class="button secondary" :disabled="busy" @click="reload()">{{ t('Galeriyi yenile') }}</button>
    <p v-if="locked" role="alert">{{ t('İşlem sonucu belirsiz. Yeni işlemden önce galeriyi yenile; yükleme otomatik tekrarlanmaz.') }}</p>
    <p v-if="error" role="alert" class="error">{{ t('İşletme fotoğrafları alınamadı. Yetkini kontrol edip yenile.') }}</p>
    <template v-if="list">
      <p>{{ list.items.length }}/8</p>
      <p v-if="!list.enabled" class="notice">{{ t('İşletme fotoğrafı yükleme henüz açılmadı.') }}</p>
      <fieldset :disabled="busy || locked" :style="{border:0,padding:0,minWidth:0}" class="stack">
        <div class="business-media-grid">
          <article v-for="(p,index) in list.items.slice(0,all?8:3)" :key="p.id" class="panel stack business-media">
            <strong>{{ t(p.status==='approved' && !p.public ? 'Onaylı · Yayında değil' : labels[p.status]) }}{{ list.coverId===p.id ? ' · '+t('Kapak fotoğrafı') : '' }}</strong>
            <BusinessPhotosOwnerThumbnail v-if="list.enabled && p.canOpen" :businessId="businessId" :id="p.id" :index="index" :options="options" :guard="guard" :open="()=>openPhoto(p.id)"/>
            <p>{{ p.width }}×{{ p.height }} · {{ Math.ceil(p.bytes/1024) }} KB</p>
            <p v-if="p.reason">{{ p.reason }}</p>
            <div class="row"><button class="button secondary" :disabled="!list.enabled || !p.canOpen" @click="openPhoto(p.id)">{{ t('Fotoğrafı aç') }}</button><button v-if="p.status!=='uploading'" class="button secondary" @click="confirming={action:'withdraw',businessId,id:p.id,version:p.version}">{{ t('Fotoğrafı geri çek') }}</button><button v-if="p.canCover && p.id!==list.coverId" class="button secondary" @click="confirming={action:'cover',businessId,id:p.id,version:p.version}">{{ t('Kapak yap') }}</button></div>
          </article>
        </div>
        <button v-if="list.items.length>3" class="button secondary" @click="all=!all">{{ t(all ? 'Daha az göster' : 'Tüm fotoğrafları göster') }}</button>
        <template v-if="list.enabled && list.canUpload && !uploading">
          <label>{{ t('Fotoğraf seç') }}<input type="file" accept="image/jpeg,image/png,image/webp" @change="onFile"/></label>
          <template v-if="photo">
            <img :src="photo.uri" :alt="t('Gönderilecek fotoğraf önizlemesi')" :style="{width:'100%',maxHeight:'300px',objectFit:'contain'}"/>
            <p>{{ Math.ceil(photo.bytes.length/1024) }} KB · {{ photo.width }}×{{ photo.height }}</p>
            <label><input v-model="rights" type="checkbox"/>{{ t('Bu fotoğrafı kendim çektim; paylaşma hakkım var ve gereksiz kişisel bilgileri kapattım.') }}</label>
            <button class="button primary" :disabled="!rights" @click="upload">{{ t('Fotoğrafı incelemeye gönder') }}</button>
            <button class="button secondary" @click="photo=null">{{ t('Seçimi kaldır') }}</button>
          </template>
        </template>
        <div v-if="confirming" class="notice"><p>{{ t(confirming.action==='cover' ? 'Onaylı fotoğraf işletmenin kapak fotoğrafı yapılacak.' : 'Fotoğraf kamu görünümünden kaldırılacak. Önceden indirilmiş kopyalar geri alınamaz.') }}</p><button class="button primary" @click="mutate({type:'action',value:confirming})">{{ t('İşlemi onayla') }}</button><button class="button secondary" @click="confirming=null">{{ t('Vazgeç') }}</button></div>
      </fieldset>
    </template>
    <BusinessPhotosDialog v-if="opened" :src="opened" :close="()=>{opened=''}"/>
  </section>
</template>
