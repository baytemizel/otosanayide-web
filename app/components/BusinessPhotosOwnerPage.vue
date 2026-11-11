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
  <section class="ds-card ds-pad24 stack business-media">
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <h3>{{ t('İşletme fotoğrafları') }}</h3>
      <button class="ds-btn s sm" :disabled="busy" @click="reload()">{{ t('Galeriyi yenile') }}</button>
    </div>
    <p class="ds-small ds-muted">{{ t('En fazla 8 fotoğraf. Yüklemeden önce otomatik küçültülür; bağımsız incelemeden sonra yayımlanır. İlk onaylı fotoğraf kapak olur.') }}</p>
    <div v-if="locked" role="alert" class="ds-note warn">{{ t('İşlem sonucu belirsiz. Yeni işlemden önce galeriyi yenile; yükleme otomatik tekrarlanmaz.') }}</div>
    <div v-if="error" role="alert" class="ds-note err">{{ t('İşletme fotoğrafları alınamadı. Yetkini kontrol edip yenile.') }}</div>
    <template v-if="list">
      <p class="ds-small ds-b">{{ list.items.length }}/8</p>
      <div v-if="!list.enabled" class="ds-note">{{ t('İşletme fotoğrafı yükleme henüz açılmadı.') }}</div>
      <fieldset :disabled="busy || locked" :style="{border:0,padding:0,minWidth:0}" class="stack">
        <div class="business-media-grid">
          <article v-for="(p,index) in list.items.slice(0,all?8:3)" :key="p.id" class="ds-card ds-pad16 stack business-media">
            <strong class="ds-small">{{ t(p.status==='approved' && !p.public ? 'Onaylı · Yayında değil' : labels[p.status]) }}{{ list.coverId===p.id ? ' · '+t('Kapak fotoğrafı') : '' }}</strong>
            <BusinessPhotosOwnerThumbnail v-if="list.enabled && p.canOpen" :businessId="businessId" :id="p.id" :index="index" :options="options" :guard="guard" :open="()=>openPhoto(p.id)"/>
            <p class="ds-xs ds-muted">{{ p.width }}×{{ p.height }} · {{ Math.ceil(p.bytes/1024) }} KB</p>
            <p v-if="p.reason" class="ds-small">{{ p.reason }}</p>
            <div class="ds-row ds-wrap ds-g8"><button class="ds-btn s sm" :disabled="!list.enabled || !p.canOpen" @click="openPhoto(p.id)">{{ t('Fotoğrafı aç') }}</button><button v-if="p.status!=='uploading'" class="ds-btn d sm" @click="confirming={action:'withdraw',businessId,id:p.id,version:p.version}">{{ t('Fotoğrafı geri çek') }}</button><button v-if="p.canCover && p.id!==list.coverId" class="ds-btn s sm" @click="confirming={action:'cover',businessId,id:p.id,version:p.version}">{{ t('Kapak yap') }}</button></div>
          </article>
        </div>
        <div v-if="list.items.length>3"><button class="ds-btn s sm" @click="all=!all">{{ t(all ? 'Daha az göster' : 'Tüm fotoğrafları göster') }}</button></div>
        <template v-if="list.enabled && list.canUpload && !uploading">
          <label>{{ t('Fotoğraf seç') }}<input class="ds-field file" type="file" accept="image/jpeg,image/png,image/webp" @change="onFile"/></label>
          <template v-if="photo">
            <img :src="photo.uri" :alt="t('Gönderilecek fotoğraf önizlemesi')" :style="{width:'100%',maxHeight:'300px',objectFit:'contain'}"/>
            <p class="ds-xs ds-muted">{{ Math.ceil(photo.bytes.length/1024) }} KB · {{ photo.width }}×{{ photo.height }}</p>
            <label class="chk-row"><input v-model="rights" class="ds-check chk" type="checkbox"/>{{ t('Bu fotoğrafı kendim çektim; paylaşma hakkım var ve gereksiz kişisel bilgileri kapattım.') }}</label>
            <div class="ds-row ds-wrap ds-g10"><button class="ds-btn p sm" :disabled="!rights" @click="upload">{{ t('Fotoğrafı incelemeye gönder') }}</button><button class="ds-btn s sm" @click="photo=null">{{ t('Seçimi kaldır') }}</button></div>
          </template>
        </template>
        <div v-if="confirming" class="ds-note warn confirm"><p>{{ t(confirming.action==='cover' ? 'Onaylı fotoğraf işletmenin kapak fotoğrafı yapılacak.' : 'Fotoğraf kamu görünümünden kaldırılacak. Önceden indirilmiş kopyalar geri alınamaz.') }}</p><div class="ds-row ds-wrap ds-g10"><button class="ds-btn p sm" @click="mutate({type:'action',value:confirming})">{{ t('İşlemi onayla') }}</button><button class="ds-btn s sm" @click="confirming=null">{{ t('Vazgeç') }}</button></div></div>
      </fieldset>
    </template>
    <BusinessPhotosDialog v-if="opened" :src="opened" :close="()=>{opened=''}"/>
  </section>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
.file {padding-top: 11px;}
.stack label.chk-row {flex-direction: row; align-items: flex-start; gap: 10px; font-size: 14px; font-weight: 400;}
input.ds-check.chk {width: 20px; min-height: 0; padding: 0;}
.confirm {flex-direction: column;}
</style>
