<script setup lang="ts">
import {ref} from 'vue';
import {Check, ChevronDown, ChevronUp, LayoutGrid} from '@lucide/vue';
import {categories} from '@otosanayide/core';
import {categoryPalette} from '@otosanayide/core/category-visual';
import ServiceSymbol from '~/components/ServiceSymbol.vue';
import {useLocale} from '~/composables/useLocale';

defineProps<{value: string; onChange: (id: string) => void}>();
const {t: i18nT} = useLocale();
const expanded = ref(false);
</script>

<template>
  <section :class="`category-picker ${expanded?'expanded':''}`" :aria-label="i18nT('Hizmet seçimi')">
    <div class="category-picker-heading">
      <h2>{{ i18nT('Ne için servis arıyorsun?') }}</h2>
      <button :class="`category-all ${!value?'selected':''}`" type="button" :aria-pressed="!value" @click="onChange('')"><LayoutGrid :size="16"/>{{ i18nT('Tümü') }}</button>
    </div>
    <div id="service-category-options" class="category-grid" role="group" :aria-label="i18nT('Hizmet kategorileri')">
      <button v-for="c in categories" :key="c.id" type="button" :class="`category-option ${value===c.id?'selected':''}`" :aria-pressed="value===c.id" @click="onChange(c.id)"><span class="category-option-icon" :style="{background:categoryPalette[c.id]?.background,color:categoryPalette[c.id]?.ink}"><ServiceSymbol :category="c.id" :size="24"/></span><span>{{ i18nT(c.name) }}</span><Check v-if="value===c.id" class="category-check" :size="16"/></button>
    </div>
    <button class="category-expand" type="button" :aria-expanded="expanded" aria-controls="service-category-options" @click="expanded=!expanded">{{ expanded?i18nT('Daha az göster'):i18nT('Tüm hizmetleri göster') }}<ChevronUp v-if="expanded" :size="18"/><ChevronDown v-else :size="18"/></button>
  </section>
</template>
