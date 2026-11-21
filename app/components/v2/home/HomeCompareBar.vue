<script setup lang="ts">
import {computed} from 'vue';
import {ArrowRight} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import {useMockCompare} from '~/composables/useMockCompare';
import {useSearchCards} from '~/composables/v2/useSearch';
import {demoMode} from '~/lib/env';

// Figma 111:372 "Karşılaştırma çubuğu · yüzen": appears once a service is ticked; comparing needs two.
// Live: the avatars come from the cards seen in live search results (ids are API ids, not mock ones).
defineProps<{photos?: Record<string, string>}>();
const {t} = useLocale();
const compare = useMockCompare();
const {cards} = useSearchCards();
const items = computed(() => (demoMode()
  ? compare.items.value
  : compare.ids.value.map((id) => cards.value[id]).filter((c) => c !== undefined)));
const initials = (name: string) => name.replace(/^Örnek\s+/, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
</script>

<template>
  <Transition name="home-compare">
    <div v-if="compare.ids.value.length" class="home-compare" role="region" :aria-label="t('Karşılaştırma')">
      <span class="avatars" aria-hidden="true">
        <template v-for="item in items" :key="item.id">
          <img v-if="photos?.[item.id] ?? item.photo" :src="photos?.[item.id] ?? item.photo ?? ''" alt="" width="40" height="40">
          <span v-else class="initials">{{ initials(item.name) }}</span>
        </template>
      </span>
      <span class="text">
        <span class="t-label-md" aria-live="polite">{{ t('{count} servis seçildi', {count: compare.ids.value.length}) }}</span>
        <span class="t-body-sm">{{ t('En fazla {max} servis karşılaştırabilirsin', {max: compare.max}) }}</span>
      </span>
      <span class="actions">
        <button type="button" class="btn btn-outline-dark" @click="compare.clear()">{{ t('Temizle') }}</button>
        <NuxtLink v-if="compare.ids.value.length >= 2" :to="compare.href.value" class="btn btn-lime">{{ t('Karşılaştır') }}<ArrowRight aria-hidden="true"/></NuxtLink>
        <button v-else type="button" class="btn btn-lime" disabled :title="t('Karşılaştırmak için bir servis daha seç')">{{ t('Karşılaştır') }}<ArrowRight aria-hidden="true"/></button>
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.home-compare{display:flex;align-items:center;gap:16px;padding:12px 12px 12px 14px;border-radius:999px;background:var(--ink-900);color:var(--white);box-shadow:0 20px 25px rgba(10,20,36,.3)}
.avatars{display:flex}
.avatars > *{width:40px;height:40px;border-radius:999px;object-fit:cover;border:2px solid var(--ink-900)}
.avatars > * + *{margin-left:-12px}
.initials{display:grid;place-items:center;background:var(--sky-200);color:var(--ink-900);font-weight:600;font-size:12px}
.text{display:flex;flex-direction:column;gap:2px;white-space:nowrap}
.text .t-body-sm{color:var(--ink-300)}
.actions{display:flex;gap:16px;margin-left:24px}
.home-compare-enter-active,.home-compare-leave-active{transition:opacity .2s ease,transform .2s ease}
.home-compare-enter-from,.home-compare-leave-to{opacity:0;transform:translateY(16px)}
@media (max-width:760px){
  .home-compare{flex-wrap:wrap;border-radius:28px;gap:12px}
  .text{white-space:normal;flex:1;min-width:0}
  .actions{margin-left:0;width:100%;gap:8px}
  .actions > *{flex:1}
}
</style>
