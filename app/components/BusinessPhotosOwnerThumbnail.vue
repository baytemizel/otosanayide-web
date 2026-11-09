<script setup lang="ts">
import {ref} from 'vue';
import {fetchBusinessPhotoMedia} from '@otosanayide/core/public-review-photo-client';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import type {MediaOptions} from '~/lib/business-photos-helpers';

const props = defineProps<{businessId: string; id: string; index: number; options: MediaOptions; guard: () => void; open: () => void}>();
const {t} = useLocale();
const uri = ref('');
const error = ref(false);

useClientEffect(() => [props.businessId, props.id, props.guard], () => {
  let active = true;
  const c = new AbortController();
  const guard = props.guard;
  fetchBusinessPhotoMedia({...props.options, businessId: props.businessId, id: props.id, thumbnail: true, signal: c.signal}, {guard, token: props.options.token})
    .then(v => {
      guard();
      if (active) uri.value = v.uri;
    })
    .catch(() => {
      if (active) error.value = true;
    });
  return () => {
    active = false;
    c.abort();
  };
});
</script>

<template>
  <p v-if="error">{{ t('Fotoğraf şu anda görüntülenemiyor.') }}</p>
  <button v-else-if="uri" type="button" class="business-media-thumbnail" :aria-label="t('İşletme fotoğrafını büyüt {number}',{number:index+1})" @click="open()"><img :src="uri" :alt="t('İşletme fotoğrafı')" @error="error=true"/></button>
  <p v-else>{{ t('Fotoğraf yükleniyor…') }}</p>
</template>
