<script setup lang="ts">
import {onBeforeUnmount, onMounted} from 'vue';
import Shell from '~/components/Shell.vue';
import {useApp} from '~/composables/useApp';
import {useAppHead} from '~/composables/useAppHead';
import {useLocale} from '~/composables/useLocale';

const app = useApp();
const {t: i18nT} = useLocale();
useAppHead();

onMounted(() => app.start());
onBeforeUnmount(() => app.stop());
</script>

<template>
  <Shell>
    <NuxtPage/>
  </Shell>
  <div v-if="app.notice" class="toast" role="status">{{ i18nT(app.notice) }}<button :aria-label="i18nT('Bildirimi kapat')" @click="app.notify('')">×</button></div>
</template>
