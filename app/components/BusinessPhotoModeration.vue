<script setup lang="ts">
import BusinessPhotosModeration from '~/components/BusinessPhotosModeration.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const app = useApp();
const {locale, t} = useLocale();
</script>

<template>
  <section v-if="app.demo" class="ds-card ds-pad24 ds-col ds-g8"><h3 style="margin:0">{{ t('İşletme fotoğrafları') }}</h3><div class="ds-small ds-muted">{{ t('Önizlemede gerçek görsel yüklenmez veya yayımlanmaz. Fotoğraflar bağımsız inceleme sonrası görünür.') }}</div></section>
  <BusinessPhotosModeration v-else-if="app.user" :key="app.user.uid+':'+locale"/>
</template>
