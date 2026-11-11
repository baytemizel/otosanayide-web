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
  <div v-else-if="large" class="business-visual large bv-hero" :data-category="category" :style="{background:categoryPalette[category]?.background,color:categoryPalette[category]?.ink}" role="img" :aria-label="i18nT('{0}: fotoğraf henüz eklenmedi, {1}',{'0':business.name,'1':i18nT(label)})"><i class="bv-ring a"/><i class="bv-ring b"/><ServiceSymbol :category="category" :size="72"/><span class="bv-caption">{{ i18nT(label) }} · {{ i18nT("Fotoğraf henüz eklenmedi") }}</span></div>
  <div v-else class="business-visual" :data-category="category" :style="{background:categoryPalette[category]?.background,color:categoryPalette[category]?.ink}" role="img" :aria-label="i18nT('{0}: fotoğraf henüz eklenmedi, {1}',{'0':business.name,'1':i18nT(label)})"><span class="visual-initials">{{ initials }}</span><div class="visual-symbol"><ServiceSymbol :category="category" :size="48"/></div><div class="visual-caption"><strong>{{ i18nT(label) }}</strong><span>{{ i18nT("Fotoğraf henüz eklenmedi") }}</span></div></div>
</template>

<style scoped>
.bv-hero {flex-direction: column; gap: 10px;}
.bv-caption {font-size: 12px; line-height: 1.5; opacity: .85; text-align: center; padding: 0 16px;}
.bv-ring {position: absolute; border-radius: 50%; border: 1px solid rgba(16,36,58,.07);}
.bv-ring.a {width: 480px; height: 480px; top: -240px; right: -210px;}
.bv-ring.b {width: 330px; height: 330px; bottom: -180px; left: -150px;}
</style>
