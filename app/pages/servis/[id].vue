<script setup lang="ts">
import {computed} from 'vue';
import Profile from '~/components/Profile.vue';
import {useLocale} from '~/composables/useLocale';
import {readBusiness} from '~/lib/server-read';

const route = useRoute();
const {t: i18nT, locale} = useLocale();
const id = computed(() => String(route.params.id));
const {data} = await useAsyncData(
  () => `business:${id.value}:${locale.value}`,
  () => readBusiness(id.value, locale.value),
);
if (data.value?.status === 'missing') throw createError({statusCode: 404, statusMessage: 'Not Found', fatal: true});
</script>

<template>
  <Profile v-if="data?.status === 'found'" :business="data.business"/>
  <div v-else class="container page">
    <h1>{{ i18nT("Profil şu anda kullanılamıyor.") }}</h1>
    <p>{{ i18nT("Veri bağlantısı henüz hazır değil.") }}</p>
  </div>
</template>
