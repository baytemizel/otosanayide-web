<script setup lang="ts">
import {computed} from 'vue';
import {categories, type Business} from '@otosanayide/core';
import {categoryPalette, visualCategory} from '@otosanayide/core/category-visual';
import BusinessVisualRemoteCover from '~/components/BusinessVisualRemoteCover.vue';
import ServiceSymbol from '~/components/ServiceSymbol.vue';
import {useLocale} from '~/composables/useLocale';
import {publicEnv} from '~/lib/env';

const props = withDefaults(defineProps<{business: Business; large?: boolean}>(), {large: false});
const {t: i18nT} = useLocale();

const category = computed(() => visualCategory(props.business.categories));
const label = computed(() => categories.find(c => c.id === category.value)?.name ?? 'Oto hizmetleri');
const initials = computed(() => props.business.name.replace(/^Örnek\s+/, '').split(/\s+/).slice(0, 2).map(s => s[0]).join('').toLocaleUpperCase('tr-TR'));
const remote = computed(() => !props.business.sample && props.business.coverPhotoId && /^[a-f0-9-]{36}$/i.test(props.business.coverPhotoId) && publicEnv().businessPhotosEnabled);
</script>

<template>
  <BusinessVisualRemoteCover v-if="remote" :key="business.id+':'+business.coverPhotoId" :business="business" :large="large">
    <template #fallback><BusinessVisual :business="{...business,coverPhotoId:undefined}" :large="large"/></template>
  </BusinessVisualRemoteCover>
  <img v-else-if="business.image" :class="large?'profile-photo':''" :src="business.image" :alt="business.sample?i18nT('Tasarım için hazırlanmış temsilî atölye görseli'):i18nT('{0} işletme fotoğrafı',{'0':business.name})"/>
  <div v-else :class="`business-visual ${large?'large':''}`" :data-category="category" :style="{background:categoryPalette[category]?.background,color:categoryPalette[category]?.ink}" role="img" :aria-label="i18nT('{0}: fotoğraf henüz eklenmedi, {1}',{'0':business.name,'1':i18nT(label)})"><span class="visual-initials">{{ initials }}</span><div class="visual-symbol"><ServiceSymbol :category="category" :size="large?72:48"/></div><div class="visual-caption"><strong>{{ i18nT(label) }}</strong><span>{{ i18nT("Fotoğraf henüz eklenmedi") }}</span></div></div>
</template>
