<script setup lang="ts">
// Account-style page head: mono eyebrow + H2 title on the left, actions on the right.
defineProps<{eyebrow?: string; title: string; lead?: string}>();
</script>

<template>
  <header class="v2-page-head v2-wrap">
    <div class="copy">
      <p v-if="eyebrow" class="t-mono-md t-eyebrow">{{ eyebrow }}</p>
      <h1 class="t-h2">{{ title }}</h1>
      <p v-if="lead" class="t-body-md t-muted lead">{{ lead }}</p>
    </div>
    <div v-if="$slots.default" class="actions"><slot/></div>
  </header>
</template>

<style scoped>
.v2-page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding-top:48px}
.copy{display:flex;flex-direction:column;gap:12px;min-width:0}
.lead{max-width:640px}
.actions{display:flex;gap:12px;flex-wrap:wrap}
@media (max-width:760px){.v2-page-head{flex-direction:column;align-items:flex-start;padding-top:32px}}
</style>
