<script setup lang="ts">
import {onMounted} from 'vue';
import type {NuxtError} from '#app';
import Shell from '~/components/Shell.vue';
import {useApp} from '~/composables/useApp';
import {useAppHead} from '~/composables/useAppHead';
import {useLocale} from '~/composables/useLocale';

const props = defineProps<{error: NuxtError}>();
const app = useApp();
const {t: i18nT} = useLocale();
useAppHead();
onMounted(() => app.start());
</script>

<template>
  <Shell>
    <div class="container empty">
      <template v-if="props.error.statusCode === 404">
        <h1>{{ i18nT("Bu sayfa bulunamadı.") }}</h1>
        <p>{{ i18nT("İşletme kaydı taşınmış veya henüz yayımlanmamış olabilir.") }}</p>
      </template>
      <h1 v-else>{{ i18nT("İşlem tamamlanamadı. Bilgilerini ve bağlantını kontrol edip tekrar dene.") }}</h1>
      <a class="button primary" href="/">{{ i18nT("Keşfetmeye dön") }}</a>
    </div>
  </Shell>
</template>
