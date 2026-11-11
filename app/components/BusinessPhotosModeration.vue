<script setup lang="ts">
import {ref} from 'vue';
import BusinessPhotosModerationPage from '~/components/BusinessPhotosModerationPage.vue';
import {useLocale} from '~/composables/useLocale';
import {useMediaSession} from '~/lib/business-photos-helpers';

const {t} = useLocale();
const {options, guard} = useMediaSession();
const state = ref('pending');
const after = ref('');
const revision = ref(0);

function changeState(e: Event) {
  state.value = (e.target as HTMLSelectElement).value;
  after.value = '';
}
function next(id: string) {
  after.value = id;
}
function reload() {
  revision.value += 1;
}
</script>

<template>
  <section class="ds-col ds-g16">
    <h3 style="margin:0">{{ t('İşletme fotoğrafları') }}</h3>
    <label class="ds-col" style="max-width:320px"><span class="ds-label">{{ t('Fotoğraf durumu') }}</span><select class="ds-field" :value="state" @change="changeState"><option value="pending">{{ t('İnceleme bekleyenler') }}</option><option value="approved">{{ t('Yayımlananlar') }}</option></select></label>
    <BusinessPhotosModerationPage :key="state+':'+after+':'+revision" :state="state" :after="after" :options="options" :guard="guard" :next="next" :reload="reload"/>
  </section>
</template>
