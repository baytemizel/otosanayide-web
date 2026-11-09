<script setup lang="ts">
import {ref} from 'vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {optimizePhoto, type LocalMedia} from '~/lib/garage-media';

const props = withDefaults(defineProps<{kind: 'vehicle' | 'document'; items: LocalMedia[]; onChange: (items: LocalMedia[]) => void; onBusy: (value: boolean) => void; disabled?: boolean}>(), {disabled: false});
const {t: i18nT} = useLocale();
const error = ref('');
const busy = ref(false);
const urls = ref<string[]>([]);

useClientEffect(() => [props.items], () => {
  const next = props.items.map(m => URL.createObjectURL(m.full));
  urls.value = next;
  return () => next.forEach(URL.revokeObjectURL);
});

async function select(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!files.length) return;
  error.value = '';
  if (files.length > (props.kind === 'vehicle' ? 1 : 3)) {
    error.value = 'Bir araç fotoğrafı veya en fazla üç belge sayfası seç.';
    return;
  }
  busy.value = true;
  props.onBusy(true);
  try {
    const result: LocalMedia[] = [];
    for (const file of files) result.push(await optimizePhoto(file, props.kind));
    props.onChange(result);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
    props.onBusy(false);
  }
}
</script>

<template>
  <div class="stack media-picker">
    <label>{{ kind==='vehicle'?i18nT("Araç fotoğrafı seç"):i18nT("Servis belgesi fotoğrafları (en fazla 3 sayfa)") }}<input type="file" accept="image/jpeg,image/png,image/webp" :multiple="kind==='document'" @change="select" :disabled="disabled||busy"/></label>
    <p v-if="busy" role="status">{{ i18nT("Fotoğraf cihazında hazırlanıyor…") }}</p>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <div v-for="(m,i) in items" :key="m.id" class="media-preview"><img :src="urls[i]" :alt="i18nT('Kaydedilecek fotoğraf {0}',{'0':i+1})" width="240" height="160"/><small>{{ Math.round(m.originalBytes/1024) }}{{ i18nT(" KB → ") }}{{ Math.round((m.full.size+m.thumbnail.size)/1024) }}{{ i18nT(" KB · ") }}{{ m.width }} × {{ m.height }}</small><a :href="urls[i]" target="_blank" rel="noreferrer">{{ i18nT("Tam boyutta kontrol et") }}</a></div>
    <button v-if="!!items.length" type="button" class="text-button" :disabled="disabled||busy" @click="onChange([])">{{ i18nT("Seçimi kaldır") }}</button>
    <small>{{ i18nT("JPEG, PNG, WebP · Dosya başına en fazla 20 MB. Kaydetmeden önce özellikle belge yazılarının okunabildiğini kontrol et.") }}</small>
  </div>
</template>
