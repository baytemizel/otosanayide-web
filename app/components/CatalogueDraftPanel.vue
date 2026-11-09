<script setup lang="ts">
import {computed} from 'vue';
import {categories} from '@otosanayide/core';
import type {BusinessProfileInput} from '@otosanayide/core/business-management';
import CatalogueQualityEvidence from '~/components/CatalogueQualityEvidence.vue';
import OwnedProfileForm from '~/components/OwnedProfileForm.vue';
import {useLocale} from '~/composables/useLocale';
import type {Detail} from '~/lib/catalogue-draft-editor-helpers';

const props = defineProps<{detail: Detail; reason: string; onReason: (value: string) => void; onSave: (profile: BusinessProfileInput) => Promise<void>; businessId: string}>();
const {t: i18nT} = useLocale();
const e = computed(() => props.detail.evidence);

function changeReason(event: Event) {
  props.onReason((event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <section class="stack">
    <aside class="notice">
      <h3>{{ i18nT('Özel kaynak kanıtları') }}</h3>
      <p>{{ i18nT('Kaynak bilgileri öneridir; güncel faaliyet, iletişim ve konum ayrıca doğrulanmalıdır.') }}</p>
      <template v-if="e">
        <p>{{ e.name }}<br/>{{ e.address }}<br/>{{ e.phone }}<template v-if="e.contactEmail"><br/>{{ e.contactEmail }}</template></p>
        <p>{{ [...e.categoryCandidates,...e.specialtyCandidates].map(id=>i18nT(categories.find(c=>c.id===id)?.name??id)).join(' · ') }}</p>
        <p v-if="e.source"><a class="text-link" :href="e.source" target="_blank" rel="noopener noreferrer">{{ i18nT('Kaynak sayfası') }}</a></p>
        <p v-if="e.website"><a class="text-link" :href="e.website" target="_blank" rel="noopener noreferrer">{{ i18nT('Web sitesi') }}</a></p>
        <p v-if="e.coordinates">{{ e.coordinates.latitude }}, {{ e.coordinates.longitude }}</p>
        <p>{{ e.coordinateNote }}</p>
        <a v-if="e.coordinateSource" class="text-link" :href="e.coordinateSource" target="_blank" rel="noopener noreferrer">{{ i18nT('Konum kanıtı kaynağı') }}</a>
        <p>{{ e.flags.join(' · ') }}</p>
        <CatalogueQualityEvidence :quality="e.quality"/>
      </template>
      <p v-else>{{ i18nT('Bu kayda bağlı kaynak kanıtı bulunamadı.') }}</p>
    </aside>
    <label class="stack">{{ i18nT('Düzenleme gerekçesi') }}<textarea :value="reason" minlength="10" maxlength="1000" @input="changeReason"/></label>
    <OwnedProfileForm :key="`${businessId}-${detail.profileVersion}`" catalogue :business="{...detail.profile,id:businessId,version:detail.profileVersion,change:null}" :onSubmit="onSave"/>
  </section>
</template>
