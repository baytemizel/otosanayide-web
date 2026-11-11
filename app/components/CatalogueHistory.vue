<script setup lang="ts">
import {computed} from 'vue';
import CatalogueHistoryViewer from '~/components/CatalogueHistoryViewer.vue';
import {useApp} from '~/composables/useApp';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import type {Page} from '~/lib/catalogue-history-helpers';

const props = defineProps<{businessId: string}>();
const app = useApp();

/** The viewer reloads when this function's identity changes, so it must change exactly with [businessId,user]. */
const load = computed(() => {
  const user = app.user;
  const businessId = props.businessId;
  return async (cursor: string) => {
    if (!user) throw Error('Oturum gerekli.');
    const r = await apiFetch(`/api/admin/catalogue/history?businessId=${encodeURIComponent(businessId)}${cursor ? '&after=' + encodeURIComponent(cursor) : ''}`, {headers: {Authorization: `Bearer ${await user.getIdToken()}`}});
    const d = await responseJson(r);
    if (!r.ok) throw Error(d.error);
    return d as Page;
  };
});
</script>

<template>
  <CatalogueHistoryViewer :loadPage="load"/>
</template>
