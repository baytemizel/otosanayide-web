<script setup lang="ts">
// Section heading used across the home page: mono eyebrow + H2 on the left, actions on the right.
withDefaults(defineProps<{eyebrow: string; title: string; headingId?: string; eyebrowTone?: 'orange' | 'ink'}>(), {headingId: undefined, eyebrowTone: 'orange'});
</script>

<template>
  <div class="home-section-head">
    <div class="titles">
      <p class="t-mono-md eyebrow" :class="eyebrowTone">{{ eyebrow }}</p>
      <h2 :id="headingId" class="t-h2">{{ title }}</h2>
    </div>
    <div v-if="$slots.default" class="actions"><slot/></div>
  </div>
</template>

<style scoped>
.home-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
.titles{display:flex;flex-direction:column;gap:14px;min-width:0}
.eyebrow.orange{color:var(--orange-600)}
.eyebrow.ink{color:var(--ink-900)}
.actions{flex:none}
@media (max-width:760px){
  .home-section-head{flex-direction:column;align-items:flex-start;gap:20px}
}
</style>
