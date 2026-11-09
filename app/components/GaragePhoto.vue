<script setup lang="ts">
import {ref, useTemplateRef} from 'vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {mediaRead, mediaThumbnail} from '~/lib/garage-media';

const props = withDefaults(defineProps<{id?: string; alt: string; document?: boolean}>(), {document: false});
const {t: i18nT} = useLocale();
const thumb = ref('');
const full = ref('');
const error = ref('');
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

useClientEffect(() => [props.id], () => {
  let stopped = false, url = '';
  thumb.value = '';
  if (props.id)
    mediaThumbnail(props.id)
      .then(m => {
        if (!stopped && m) {
          url = URL.createObjectURL(m);
          thumb.value = url;
        }
      })
      .catch(() => {
        error.value = 'Fotoğraf okunamadı.';
      });
  return () => {
    stopped = true;
    if (url) URL.revokeObjectURL(url);
  };
});

useClientEffect(() => [full.value], () => {
  const current = full.value;
  return () => {
    if (current) URL.revokeObjectURL(current);
  };
});

async function open() {
  if (!props.id) return;
  try {
    const m = await mediaRead(props.id);
    if (!m) throw Error('Fotoğraf bu tarayıcıda bulunamadı.');
    full.value = URL.createObjectURL(m.full);
    dialog.value?.showModal();
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function backdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) dialog.value?.close();
}
</script>

<template>
  <button v-if="thumb" type="button" :class="`garage-photo ${document?'document-photo':''}`" @click="open" :aria-label="i18nT('{0} büyüt',{'0':alt})"><img :src="thumb" :alt="alt" loading="lazy" width="160" height="110"/></button>
  <span v-else class="small muted">{{ id?i18nT("Fotoğraf bu cihazda yok"):i18nT("Fotoğraf eklenmedi") }}</span>
  <small v-if="error" role="alert">{{ i18nT(error) }}</small>
  <dialog ref="dialog" :aria-label="i18nT('{0} önizleme',{'0':alt})" class="garage-photo-dialog" @click="backdrop" @close="full=''"><button type="button" class="button secondary" @click="dialog?.close()">{{ i18nT("Kapat") }}</button><img v-if="full" :src="full" :alt="alt"/></dialog>
</template>
