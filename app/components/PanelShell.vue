<script setup lang="ts">
import BrandLogo from '~/components/BrandLogo.vue';
import {useLocale} from '~/composables/useLocale';
import type {PanelNavItem} from '~/lib/panel';

defineProps<{
  /** Small heading above the context line in the sidebar. */
  heading: string;
  context?: string;
  title: string;
  crumbs?: string;
  items: PanelNavItem[];
  active: string;
  onSelect: (value: string) => void;
}>();

const {t: i18nT} = useLocale();
</script>

<template>
  <div class="ds-panel" id="content">
    <aside class="ds-side">
      <div class="ds-side-head">
        <NuxtLink to="/" :aria-label="i18nT('otosanayide')"><BrandLogo dark :scale="0.85"/></NuxtLink>
        <div style="padding:18px 12px 8px">
          <div class="ds-xs" style="color:#7f93a8">{{ i18nT(heading) }}</div>
          <div v-if="context" class="ds-small ds-b" style="color:#fff">{{ context }}</div>
        </div>
      </div>
      <template v-for="(item, index) in items" :key="index">
        <div v-if="'section' in item" class="sec">{{ i18nT(item.section) }}</div>
        <button v-else type="button" :class="[{on: active === item.value}, {'ds-passive': item.passive}]" :disabled="item.passive" :aria-disabled="item.passive ? 'true' : undefined" :title="item.passive ? i18nT('Yakında') : undefined" @click="onSelect(item.value)">
          <component :is="item.icon" :size="18"/>{{ i18nT(item.label) }}
        </button>
      </template>
    </aside>
    <div class="ds-panel-main">
      <div class="ds-row ds-sb panel-top">
        <div class="ds-col">
          <span v-if="crumbs" class="ds-xs ds-muted">{{ crumbs }}</span>
          <h3 style="font-size:20px;margin:0">{{ title }}</h3>
        </div>
        <div class="ds-row ds-g12"><slot name="actions"/></div>
      </div>
      <div class="ds-panel-body"><slot/></div>
    </div>
  </div>
</template>

<style scoped>
.panel-top {min-height: 76px; padding: 12px 32px; border-bottom: 1px solid #edf0f3; background: #fff; flex: none; gap: 16px;}
@media (max-width: 900px) {.panel-top {padding: 12px 16px;}}
</style>
