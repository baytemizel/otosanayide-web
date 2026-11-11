<script setup lang="ts">
import {ref} from 'vue';
import type {ConsoleBranch} from '@otosanayide/core/business-console-client';
import BusinessPhotosBranchPage from '~/components/BusinessPhotosBranchPage.vue';
import BusinessPhotosOwnerGallery from '~/components/BusinessPhotosOwnerGallery.vue';
import {useLocale} from '~/composables/useLocale';
import {useMediaSession} from '~/lib/business-photos-helpers';

const {t} = useLocale();
const {options, guard} = useMediaSession();
const after = ref('');
const revision = ref(0);
const selected = ref<ConsoleBranch | null>(null);

function select(b: ConsoleBranch) {
  selected.value = b;
}
function next(v: string) {
  after.value = v;
}
function reload() {
  revision.value += 1;
}
</script>

<template>
  <template v-if="selected"><div class="ds-row ds-wrap ds-g12"><button class="ds-btn s sm" @click="selected=null">{{ t('İşletme listesine dön') }}</button><h3 class="name">{{ selected.name }}</h3></div><BusinessPhotosOwnerGallery :key="selected.id" :businessId="selected.id"/></template>
  <BusinessPhotosBranchPage v-else :key="after+':'+revision" :options="options" :guard="guard" :after="after" :select="select" :next="next" :reload="reload"/>
</template>

<style scoped>
.name {margin: 0;}
</style>
