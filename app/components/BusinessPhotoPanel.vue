<script setup lang="ts">
import BusinessPhotosOwnerSelector from '~/components/BusinessPhotosOwnerSelector.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const app = useApp();
const {locale, t} = useLocale();
</script>

<template>
  <section v-if="app.demo" class="ds-card ds-pad24 ds-col ds-g8"><h3 class="title">{{ t('İşletme fotoğrafları') }}</h3><p class="ds-small ds-muted">{{ t('Önizlemede gerçek görsel yüklenmez veya yayımlanmaz. Fotoğraflar bağımsız inceleme sonrası görünür.') }}</p></section>
  <section v-else-if="!app.user?.emailVerified" class="ds-card ds-pad24 ds-col ds-g12"><p>{{ t('İşletmelerini yönetmek için doğrulanmış hesabına giriş yap.') }}</p><div v-if="!app.user"><NuxtLink class="ds-btn s sm" to="/isletme/giris">{{ t('Giriş yap') }}</NuxtLink></div></section>
  <BusinessPhotosOwnerSelector v-else :key="app.user.uid+':'+locale"/>
</template>

<style scoped>
p {margin: 0;}
.title {margin: 0;}
</style>
