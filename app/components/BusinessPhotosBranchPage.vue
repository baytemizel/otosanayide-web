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
  <section class="ds-col ds-g12 business-media">
    <div><button class="ds-btn s sm" @click="reload()">{{ t('İşletmeleri yenile') }}</button></div>
    <div v-if="error" role="alert" class="ds-note err">{{ t('İşletme fotoğrafları alınamadı. Yetkini kontrol edip yenile.') }}</div>
    <p v-else-if="rows===null" class="ds-small ds-muted">{{ t('Yükleniyor…') }}</p>
    <template v-else>
      <p v-if="!rows.length" class="ds-small ds-muted">{{ t('Bu sayfada yönetebileceğin işletme yok.') }}</p>
      <button v-for="b in rows" :key="b.id" type="button" class="ds-card ds-pad16 branch" @click="select(b)">{{ b.name }} · {{ b.city }} · {{ b.district }}</button>
      <div v-if="cursor"><button class="ds-btn s sm" @click="next(cursor as string)">{{ t('Sonraki işletmeler') }}</button></div>
    </template>
    <div v-if="after"><button class="ds-btn s sm" @click="next('')">{{ t('İlk işletmeler') }}</button></div>
  </section>
</template>

<style scoped>
p {margin: 0;}
.branch {width: 100%; color: #10243a; font-size: 14px; font-weight: 700; text-align: left; cursor: pointer;}
</style>
