<script setup lang="ts">
import {ref} from 'vue';
import {accountJson} from '@otosanayide/core/account-client';
import BusinessPhotosDecision from '~/components/BusinessPhotosDecision.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {queue, type MediaOptions, type ModerationQueue} from '~/lib/business-photos-helpers';

const props = defineProps<{state: string; after: string; options: MediaOptions; guard: () => void; next: (id: string) => void; reload: () => void}>();
const {t} = useLocale();
const data = ref<ModerationQueue | null>(null);
const error = ref(false);

useClientEffect(() => [props.state, props.after, props.guard], () => {
  let active = true;
  let token = '';
  const options = props.options;
  accountJson({
    guard: props.guard,
    token: async () => {
      token = await options.token();
      return token;
    },
    request: signal => apiFetch('/api/admin/business-photos?status=' + props.state + (props.after ? '&after=' + props.after : ''), {signal, cache: 'no-store', credentials: 'omit', redirect: 'error', headers: {Authorization: 'Bearer ' + token}}),
    decode: raw => queue.parse(raw),
  })
    .then(v => {
      if (active) data.value = v.value;
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
  <div class="ds-col ds-g16">
    <div><button class="ds-btn s sm" @click="reload()">{{ t('Galeriyi yenile') }}</button></div>
    <div v-if="error" class="ds-note err" role="alert">{{ t('İşletme fotoğrafları alınamadı. Yetkini kontrol edip yenile.') }}</div>
    <template v-if="data"><BusinessPhotosDecision v-for="p in data.items" :key="p.id+':'+p.version" :photo="p" :options="options" :guard="guard" :reload="reload"/></template>
    <div v-if="data && !data.items.length" class="ds-card ds-pad24 ds-small ds-muted">{{ t('Bu sayfada inceleme kaydı yok.') }}</div>
    <div class="ds-row ds-wrap ds-g10">
      <button v-if="data?.next" class="ds-btn s sm" @click="next(data.next as string)">{{ t('Sonraki sayfa') }}</button>
      <button v-if="after" class="ds-btn s sm" @click="next('')">{{ t('İlk sayfa') }}</button>
    </div>
  </div>
</template>
