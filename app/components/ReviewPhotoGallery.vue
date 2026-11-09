<script setup lang="ts">
import {ref} from 'vue';
import PhotoDialog from '~/components/PhotoDialog.vue';
import {useLocale} from '~/composables/useLocale';
import {apiUrl} from '~/lib/api';

defineProps<{ids: string[]}>();

const {t: i18nT} = useLocale();
const selected = ref<string | null>(null);

function close() {
  selected.value = null;
}
</script>

<template>
  <div class="review-photo-grid">
    <button v-for="id in ids" :key="id" type="button" class="review-photo-thumb" :aria-label="i18nT('Fotoğrafı büyüt')" @click="selected=id"><img loading="lazy" decoding="async" :width="160" :height="120" :src="apiUrl(`/api/review-photos/media?id=${encodeURIComponent(id)}&size=thumbnail`)" :alt="i18nT('Yorum fotoğrafı')"/></button>
  </div>
  <PhotoDialog v-if="selected" :src="apiUrl(`/api/review-photos/media?id=${encodeURIComponent(selected)}`)" :onClose="close"/>
</template>
