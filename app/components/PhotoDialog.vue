<script setup lang="ts">
import {useTemplateRef} from 'vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';

defineProps<{src: string; onClose: () => void}>();

const {t: i18nT} = useLocale();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

useClientEffect(() => [], () => {
  dialog.value?.showModal();
});
</script>

<template>
  <dialog ref="dialog" class="garage-photo-dialog" :aria-label="i18nT('Yorum fotoğrafı')" @close="onClose">
    <button class="button secondary" autofocus @click="dialog?.close()">{{ i18nT('Kapat') }}</button>
    <img :src="src" :alt="i18nT('Yorum fotoğrafı')" :style="{maxHeight:'75dvh',objectFit:'contain'}"/>
  </dialog>
</template>
