<script setup lang="ts">
import {ref} from 'vue';
import {ChevronRight, ChevronUp, LayoutGrid} from '@lucide/vue';
import {categories} from '@otosanayide/core';
import {categoryPalette} from '@otosanayide/core/category-visual';
import ServiceSymbol from '~/components/ServiceSymbol.vue';
import {useLocale} from '~/composables/useLocale';

defineProps<{value: string; onChange: (id: string) => void}>();
const {t: i18nT} = useLocale();
const expanded = ref(false);
</script>

<template>
  <section :class="`cat ${expanded?'expanded':''}`" :aria-label="i18nT('Hizmet seçimi')">
    <h2 class="sr-only">{{ i18nT('Ne için servis arıyorsun?') }}</h2>
    <div id="service-category-options" class="cat-rail" role="group" :aria-label="i18nT('Hizmet kategorileri')">
      <button type="button" :class="`cat-item cat-all ${!value?'selected':''}`" :aria-pressed="!value" @click="onChange('')"><LayoutGrid :size="20"/><span>{{ i18nT('Tüm hizmetler') }}</span></button>
      <button v-for="c in categories" :key="c.id" type="button" :class="`cat-item ${value===c.id?'selected':''}`" :aria-pressed="value===c.id" @click="onChange(c.id)"><span class="cat-icon" :style="{background:categoryPalette[c.id]?.background,color:categoryPalette[c.id]?.ink}"><ServiceSymbol :category="c.id" :size="18"/></span><span>{{ i18nT(c.name) }}</span></button>
    </div>
    <button class="cat-more" type="button" :aria-expanded="expanded" aria-controls="service-category-options" @click="expanded=!expanded">{{ expanded?i18nT('Daha az göster'):i18nT('Tüm {0} kategori',{'0':categories.length}) }}<ChevronUp v-if="expanded" :size="16"/><ChevronRight v-else :size="16"/></button>
  </section>
</template>

<style scoped>
.cat {display: flex; align-items: flex-start; gap: 10px; padding: 24px 0 8px;}
.cat-rail {flex: 1; min-width: 0; display: flex; gap: 10px; overflow: hidden; padding: 6px; margin: -6px;}
.expanded .cat-rail {flex-wrap: wrap;}
.cat-item {flex: none; display: inline-flex; align-items: center; gap: 10px; height: 56px; padding: 0 16px; border: 1px solid #dfe5eb; border-radius: 14px; background: #fff; font-size: 13px; font-weight: 700; color: #10243a;}
.cat-all {order: -2; color: #c4460b;}
.cat-all span {color: #10243a;}
.cat-item.selected {order: -1; background: #fff3ec; border-color: #f8cdb3;}
.cat-all.selected {order: -2;}
.cat-icon {display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px;}
.cat-more {flex: none; display: inline-flex; align-items: center; gap: 6px; height: 56px; padding: 0 0 0 6px; border: 0; background: none; font-size: 13px; font-weight: 700; color: #c4460b;}

@media (max-width: 760px) {
  .cat {padding: 18px 0 2px; margin-right: -16px;}
  .cat-rail, .expanded .cat-rail {flex-wrap: nowrap; overflow-x: auto; padding: 6px 16px 6px 6px; margin: -6px 0 -6px -6px; scrollbar-width: none;}
  .cat-rail::-webkit-scrollbar {display: none;}
  .cat-item {height: 38px; padding: 0 12px; gap: 6px; border-radius: 15px; font-weight: 400; color: #3a4b5e;}
  .cat-item.selected {background: #10243a; border-color: #10243a; color: #fff;}
  .cat-all, .cat-all span {color: inherit;}
  .cat-icon {width: auto; height: auto; background: none !important; color: inherit !important;}
  .cat-more {display: none;}
}
</style>
