<script setup lang="ts">
import BusinessPhotosModeration from '~/components/BusinessPhotosModeration.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const app = useApp();
const {locale, t} = useLocale();
</script>

<template>
  <section v-if="app.demo" class="panel"><h2>{{ t('İşletme fotoğrafları') }}</h2><p>{{ t('Önizlemede gerçek görsel yüklenmez veya yayımlanmaz. Fotoğraflar bağımsız inceleme sonrası görünür.') }}</p></section>
  <BusinessPhotosModeration v-else-if="app.user" :key="app.user.uid+':'+locale"/>
</template>
