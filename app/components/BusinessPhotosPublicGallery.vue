<script setup lang="ts">
import {ref} from 'vue';
import {fetchPublicBusinessPhotos} from '@otosanayide/core/business-photos';
import BusinessPhotosDialog from '~/components/BusinessPhotosDialog.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch, apiOrigin, apiUrl} from '~/lib/api';

const props = defineProps<{businessId: string}>();
const {t} = useLocale();
const ids = ref<string[]>([]);
const all = ref(false);
const selected = ref('');

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
  <section v-if="ids.length" class="panel stack business-media">
    <h2>{{ t('İşletmenin fotoğrafları') }}</h2>
    <p>{{ t('İşletme sahibi tarafından eklendi ve yayın incelemesinden geçti. Hizmet kalitesi garantisi değildir.') }}</p>
    <div class="review-photo-grid"><button v-for="(id,i) in ids.slice(0,all?8:3)" :key="id" class="review-photo-thumb" :aria-label="t('İşletme fotoğrafını büyüt {number}',{number:i+1})" @click="selected=id"><img loading="lazy" :width="200" :height="150" :style="{objectFit:'cover'}" :src="thumbnailUrl(id)" :alt="t(i===0?'Kapak fotoğrafı':'İşletme fotoğrafı')"/></button></div>
    <button v-if="ids.length>3" class="button secondary" @click="all=!all">{{ t(all ? 'Daha az göster' : 'Tüm fotoğrafları göster') }}</button>
    <BusinessPhotosDialog v-if="selected" :src="fullUrl(selected)" :close="()=>{selected=''}"/>
  </section>
</template>
