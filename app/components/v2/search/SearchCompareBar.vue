<script setup lang="ts">
import {ArrowRight, X} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';

// Floating compare bar shown on /ara once 2+ services are ticked. Not drawn in the search frames;
// built from the V2 language (ink pill, lime action) to match the rest of the redesign.
defineProps<{items: {id: string; name: string}[]; href: string; max: number}>();
const emit = defineEmits<{remove: [id: string]; clear: []}>();
const {t} = useLocale();
</script>

<template>
  <div class="bar" role="region" :aria-label="t('Karşılaştırma')">
    <div class="count">
      <span class="t-label-md">{{ t('{count} işletme seçildi', {count: items.length}) }}</span>
      <span class="t-mono-sm">{{ t('En fazla {max}', {max}) }}</span>
    </div>
    <ul class="picked">
      <li v-for="item in items" :key="item.id" class="t-label-sm">
        <span class="label">{{ item.name }}</span>
        <button type="button" :aria-label="t('{name} karşılaştırmadan çıkar', {name: item.name})" @click="emit('remove', item.id)"><X :size="13" aria-hidden="true"/></button>
      </li>
    </ul>
    <button type="button" class="clear t-label-sm" @click="emit('clear')">{{ t('Temizle') }}</button>
    <NuxtLink :to="href" class="btn btn-lime go">{{ t('Karşılaştır') }}<ArrowRight aria-hidden="true"/></NuxtLink>
  </div>
</template>

<style scoped>
.bar{position:fixed;z-index:60;left:50%;bottom:24px;transform:translateX(-50%);width:max-content;max-width:calc(100% - 32px);display:flex;align-items:center;gap:16px;padding:10px 10px 10px 24px;border-radius:999px;background:var(--ink-900);color:var(--white);box-shadow:var(--shadow-pop)}
.count{display:flex;flex-direction:column;gap:2px;flex:none}
.count .t-mono-sm{color:var(--ink-300)}
.picked{display:flex;gap:8px;min-width:0}
.picked li{display:inline-flex;align-items:center;gap:6px;min-width:0;padding:7px 8px 7px 12px;border-radius:999px;background:rgba(255,255,255,.1)}
.label{max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.picked button{display:grid;place-items:center;color:var(--ink-300)}
.picked button:hover{color:var(--white)}
.clear{flex:none;color:var(--ink-300)}
.clear:hover{color:var(--white)}
.go{flex:none}
@media (max-width:760px){
  .bar{left:16px;right:16px;bottom:16px;transform:none;width:auto;max-width:none;border-radius:24px;padding:12px 12px 12px 18px;gap:10px}
  .picked{display:none}
  .count{flex:1}
}
</style>
