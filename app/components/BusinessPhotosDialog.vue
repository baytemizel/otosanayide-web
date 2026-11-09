<script setup lang="ts">
import {ref, useTemplateRef} from 'vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';

defineProps<{src: string; close: () => void}>();
const {t} = useLocale();
const dialogEl = useTemplateRef<HTMLDialogElement>('dialogEl');
const failed = ref(false);

useClientEffect(() => [], () => {
  dialogEl.value?.showModal();
});
</script>

<template>
  <dialog ref="dialogEl" class="garage-photo-dialog" :aria-label="t('İşletme fotoğrafı')" @close="close()"><button autofocus class="button secondary" @click="dialogEl?.close()">{{ t('Kapat') }}</button><p v-if="failed" role="alert">{{ t('Fotoğraf şu anda görüntülenemiyor.') }}</p><img :hidden="failed" :src="src" :alt="t('İşletme fotoğrafı')" :style="{maxHeight:'75dvh',maxWidth:'100%',objectFit:'contain'}" @error="failed=true"/></dialog>
</template>
