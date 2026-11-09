<script setup lang="ts">
import {ref} from 'vue';
import {fetchBusinessConsole, type ConsoleBranch} from '@otosanayide/core/business-console-client';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import type {MediaOptions} from '~/lib/business-photos-helpers';

const props = defineProps<{options: MediaOptions; guard: () => void; after: string; select: (b: ConsoleBranch) => void; next: (v: string) => void; reload: () => void}>();
const {t} = useLocale();
const rows = ref<ConsoleBranch[] | null>(null);
const cursor = ref<string | null>(null);
const error = ref(false);

useClientEffect(() => [props.options.origin, props.options.locale, props.after, props.guard], () => {
  let active = true;
  const guard = props.guard;
  fetchBusinessConsole(props.options, {type: 'businesses', scope: 'activation', after: props.after})
    .then(v => {
      guard();
      if (active && 'businesses' in v) {
        rows.value = v.businesses;
        cursor.value = v.nextCursor;
      }
    })
    .catch(() => {
      if (active) error.value = true;
    });
  return () => {
    active = false;
  };
});
</script>

<template>
  <section class="stack business-media">
    <button class="button secondary" @click="reload()">{{ t('İşletmeleri yenile') }}</button>
    <p v-if="error" role="alert">{{ t('İşletme fotoğrafları alınamadı. Yetkini kontrol edip yenile.') }}</p>
    <p v-else-if="rows===null">{{ t('Yükleniyor…') }}</p>
    <template v-else>
      <p v-if="!rows.length">{{ t('Bu sayfada yönetebileceğin işletme yok.') }}</p>
      <button v-for="b in rows" :key="b.id" class="panel text-button" @click="select(b)">{{ b.name }} · {{ b.city }} · {{ b.district }}</button>
      <button v-if="cursor" class="button secondary" @click="next(cursor as string)">{{ t('Sonraki işletmeler') }}</button>
    </template>
    <button v-if="after" class="button secondary" @click="next('')">{{ t('İlk işletmeler') }}</button>
  </section>
</template>
