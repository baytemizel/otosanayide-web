<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue';
import {Camera, X} from '@lucide/vue';
import {fetchPublicBusinessPhotos} from '@otosanayide/core/business-photos';
import BusinessPhotosDialog from '~/components/BusinessPhotosDialog.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch, apiOrigin, apiUrl} from '~/lib/api';

const props = defineProps<{businessId: string; coverId?: string}>();
const {t} = useLocale();
const ids = ref<string[]>([]);
const all = ref(false);
const selected = ref('');
const allDialog = useTemplateRef<HTMLDialogElement>('allDialog');
const sideIds = computed(() => ids.value.filter(id => id !== props.coverId).slice(0, 2));
const coverListed = computed(() => !!props.coverId && ids.value.includes(props.coverId));

function showAll() {
  all.value = true;
  allDialog.value?.showModal();
}
function onAllClick(e: MouseEvent) {
  if (e.target === e.currentTarget) allDialog.value?.close();
}

useClientEffect(() => [props.businessId], () => {
  let active = true;
  fetchPublicBusinessPhotos({
    origin: apiOrigin(),
    request: apiFetch,
    businessId: props.businessId,
    guard: () => {
      if (!active) throw Error('session_changed');
    },
  })
    .then(v => {
      if (active) ids.value = v.coverId ? [v.coverId, ...v.ids.filter(id => id !== v.coverId)] : v.ids;
    })
    .catch(() => {});
  return () => {
    active = false;
  };
});

const thumbnailUrl = (id: string) => apiUrl(`/api/businesses/photos/media?businessId=${props.businessId}&id=${id}&size=thumbnail`);
const fullUrl = (id: string) => apiUrl(`/api/businesses/photos/media?businessId=${props.businessId}&id=${id}`);
</script>

<template>
  <template v-if="ids.length">
    <div v-if="sideIds.length" class="pg-side">
      <button v-for="(id,i) in sideIds" :key="id" type="button" class="pg-tile" :aria-label="t('İşletme fotoğrafını büyüt {number}',{number:i+1})" @click="selected=id"><img loading="lazy" decoding="async" :src="fullUrl(id)" :alt="t('İşletme fotoğrafı')"/></button>
      <button type="button" class="ds-btn s sm pg-all" @click="showAll"><Camera :size="15"/>{{ t('Tüm fotoğraflar') }} ({{ ids.length }})</button>
    </div>
    <button v-if="coverListed" type="button" class="pg-count" :aria-label="`${t('Tüm fotoğraflar')} (${ids.length})`" @click="showAll">1 / {{ ids.length }}</button>
    <div class="pg-foot" :class="{solo:!sideIds.length}">
      <p class="ds-xs ds-muted">{{ t('İşletme sahibi tarafından eklendi ve yayın incelemesinden geçti. Hizmet kalitesi garantisi değildir.') }}</p>
      <button type="button" class="ds-btn s sm pg-all-inline" @click="showAll"><Camera :size="15"/>{{ t('Tüm fotoğraflar') }} ({{ ids.length }})</button>
    </div>
    <dialog ref="allDialog" class="pg-dialog" :aria-label="t('İşletmenin fotoğrafları')" @close="all=false" @click="onAllClick">
      <div class="ds-row ds-sb ds-g12"><h2>{{ t('İşletmenin fotoğrafları') }}</h2><button type="button" class="ds-iconbtn" :aria-label="t('Kapat')" @click="allDialog?.close()"><X :size="18"/></button></div>
      <div v-if="all" class="pg-grid"><button v-for="(id,i) in ids.slice(0,8)" :key="id" type="button" class="review-photo-thumb" :aria-label="t('İşletme fotoğrafını büyüt {number}',{number:i+1})" @click="selected=id"><img loading="lazy" :width="200" :height="150" :style="{objectFit:'cover'}" :src="thumbnailUrl(id)" :alt="t(i===0?'Kapak fotoğrafı':'İşletme fotoğrafı')"/></button></div>
    </dialog>
    <BusinessPhotosDialog v-if="selected" :src="fullUrl(selected)" :close="()=>{selected=''}"/>
  </template>
</template>

<style scoped>
.pg-side {position: relative; flex: 1 1 0; min-width: 0; height: 400px; display: flex; flex-direction: column; gap: 8px;}
.pg-tile {flex: 1; min-height: 0; padding: 0; border: 0; overflow: hidden; background: #eef2f5; cursor: zoom-in;}
.pg-tile:first-of-type {border-top-right-radius: 16px;}
.pg-tile:nth-last-of-type(2) {border-bottom-right-radius: 16px;}
.pg-tile img {width: 100%; height: 100%; object-fit: cover;}
.pg-all {position: absolute; right: 12px; bottom: 12px;}
.pg-count {display: none; position: absolute; top: 208px; right: 12px; height: 30px; padding: 0 12px; border: 0; border-radius: 15px; background: rgba(16,36,58,.75); color: #fff; font-size: 13px;}
.pg-foot {flex: 1 0 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;}
.pg-foot p {margin: 0;}
.pg-all-inline {display: none;}
.pg-foot.solo .pg-all-inline {display: inline-flex;}
.pg-dialog {border: 0; border-radius: 18px; padding: 24px; width: min(720px, 94vw); max-height: 90dvh; overflow: auto; color: #10243a;}
.pg-dialog::backdrop {background: rgba(16,36,58,.45);}
.pg-dialog h2 {margin: 0; font: 700 19px/1.3 Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0;}
.pg-grid {display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px;}
.pg-count:focus-visible, .pg-tile:focus-visible {outline: 2px solid #2459b4; outline-offset: 2px;}
@media (max-width: 1100px) {.pg-side {height: 320px;}}
@media (max-width: 760px) {
  .pg-side {display: none;}
  .pg-count {display: block;}
  .pg-foot {padding: 0 16px; flex-wrap: wrap;}
  .pg-all-inline {display: inline-flex;}
}
</style>
