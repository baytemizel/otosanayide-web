<script setup lang="ts">
import {ref, useTemplateRef} from 'vue';
import {CarFront} from '@lucide/vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {mediaRead, mediaThumbnail} from '~/lib/garage-media';

const props = withDefaults(defineProps<{id?: string; alt: string; document?: boolean; variant?: 'default' | 'thumb' | 'hero'}>(), {document: false, variant: 'default'});
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
  <span v-if="variant==='thumb'" class="thumb">
    <img v-if="thumb" :src="thumb" :alt="alt" loading="lazy" width="84" height="64"/>
    <CarFront v-else :size="26" aria-hidden="true"/>
  </span>
  <template v-else>
    <button v-if="thumb" type="button" :class="`garage-photo ${document?'document-photo':''} ${variant==='hero'?'hero':''}`" @click="open" :aria-label="i18nT('{0} büyüt',{'0':alt})"><img :src="thumb" :alt="alt" loading="lazy" width="160" height="110"/></button>
    <div v-else-if="variant==='hero'" class="ds-vis hero-empty"><span class="ring ring-a"></span><span class="ring ring-b"></span><CarFront :size="44"/><span class="ds-xs">{{ id?i18nT("Fotoğraf bu cihazda yok"):i18nT("Fotoğraf eklenmedi") }}</span></div>
    <span v-else class="ds-xs ds-muted">{{ id?i18nT("Fotoğraf bu cihazda yok"):i18nT("Fotoğraf eklenmedi") }}</span>
    <small v-if="error" role="alert" class="ds-xs ds-red">{{ i18nT(error) }}</small>
    <dialog ref="dialog" :aria-label="i18nT('{0} önizleme',{'0':alt})" class="garage-photo-dialog" @click="backdrop" @close="full=''"><button type="button" class="ds-btn s sm" @click="dialog?.close()">{{ i18nT("Kapat") }}</button><img v-if="full" :src="full" :alt="alt"/></dialog>
  </template>
</template>

<style scoped>
.thumb {display: flex; align-items: center; justify-content: center; width: 84px; height: 64px; flex: none; overflow: hidden; border-radius: 10px; background: #f4f6f8; color: #586879;}
.thumb img {display: block; width: 100%; height: 100%; object-fit: cover;}
.hero {display: block; width: 100%; border: 0; border-radius: 0;}
.hero img {width: 100%; height: 240px;}
.hero-empty {height: 240px; background: #f4f6f8; color: #586879;}
.ring-a {width: 304px; height: 304px; top: -152px; right: -60px;}
.ring-b {width: 209px; height: 209px; left: -95px; bottom: -95px;}
</style>
