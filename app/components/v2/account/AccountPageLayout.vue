<script setup lang="ts">
import V2AccountMenu from '~/components/v2/V2AccountMenu.vue';

// Account menu on the left, page head + content on the right (same layout as W17/W18).
defineProps<{active: InstanceType<typeof V2AccountMenu>['$props']['active']; title: string; eyebrow?: string}>();
</script>

<template>
  <div class="account v2-wrap">
    <V2AccountMenu :active="active"/>
    <div class="col">
      <header class="head">
        <div class="titles">
          <p class="t-mono-md t-eyebrow">{{ eyebrow ?? 'Hesabım' }}</p>
          <h1 class="t-h2">{{ title }}</h1>
        </div>
        <div v-if="$slots.actions" class="actions"><slot name="actions"/></div>
      </header>
      <slot/>
    </div>
  </div>
</template>

<style scoped>
.account{display:flex;align-items:flex-start;gap:32px;padding-top:40px;padding-bottom:104px}
.col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:24px}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.titles{display:flex;flex-direction:column;gap:10px}
.actions{display:flex;gap:10px;flex-wrap:wrap}
@media (max-width:1000px){.account{flex-direction:column;gap:24px;padding-top:24px}}
</style>
