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
  <section class="ds-col ds-g16">
    <aside class="ds-card ds-surface ds-pad16 ds-col ds-g8" style="overflow-wrap:anywhere">
      <h4 style="font-size:16px;margin:0">{{ i18nT('Özel kaynak kanıtları') }}</h4>
      <div class="ds-small ds-muted">{{ i18nT('Kaynak bilgileri öneridir; güncel faaliyet, iletişim ve konum ayrıca doğrulanmalıdır.') }}</div>
      <template v-if="e">
        <div class="ds-small">{{ e.name }}<br/>{{ e.address }}<br/>{{ e.phone }}<template v-if="e.contactEmail"><br/>{{ e.contactEmail }}</template></div>
        <div class="ds-small">{{ [...e.categoryCandidates,...e.specialtyCandidates].map(id=>i18nT(categories.find(c=>c.id===id)?.name??id)).join(' · ') }}</div>
        <div v-if="e.source" class="ds-small"><a class="text-link" :href="e.source" target="_blank" rel="noopener noreferrer">{{ i18nT('Kaynak sayfası') }}</a></div>
        <div v-if="e.website" class="ds-small"><a class="text-link" :href="e.website" target="_blank" rel="noopener noreferrer">{{ i18nT('Web sitesi') }}</a></div>
        <div v-if="e.coordinates" class="ds-small">{{ e.coordinates.latitude }}, {{ e.coordinates.longitude }}</div>
        <div class="ds-small ds-muted">{{ e.coordinateNote }}</div>
        <a v-if="e.coordinateSource" class="text-link ds-small" :href="e.coordinateSource" target="_blank" rel="noopener noreferrer">{{ i18nT('Konum kanıtı kaynağı') }}</a>
        <div class="ds-xs ds-muted">{{ e.flags.join(' · ') }}</div>
        <CatalogueQualityEvidence :quality="e.quality"/>
      </template>
      <div v-else class="ds-small ds-muted">{{ i18nT('Bu kayda bağlı kaynak kanıtı bulunamadı.') }}</div>
    </aside>
    <label class="ds-col"><span class="ds-label">{{ i18nT('Düzenleme gerekçesi') }}</span><textarea class="ds-field" :value="reason" minlength="10" maxlength="1000" @input="changeReason"/></label>
    <OwnedProfileForm :key="`${businessId}-${detail.profileVersion}`" catalogue :business="{...detail.profile,id:businessId,version:detail.profileVersion,change:null}" :onSubmit="onSave"/>
  </section>
</template>
