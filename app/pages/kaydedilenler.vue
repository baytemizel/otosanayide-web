<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight, Heart, Info} from '@lucide/vue';
import V2ServiceCard from '~/components/v2/V2ServiceCard.vue';
import V2AccountMenu from '~/components/v2/V2AccountMenu.vue';
import SavedListModal from '~/components/v2/garage/SavedListModal.vue';
import {useMockCompare} from '~/composables/useMockCompare';
import {useMockSaved} from '~/composables/useMockSaved';
import {useMemberPage} from '~/composables/useMemberPage';
import {type MockBusiness} from '~/data/mock/businesses';
import {findBusiness} from '~/data/mock/catalog';
import {useMockSavedLists} from '~/data/mock/garage';

// W13 · Kaydedilenler ve listeler (Figma 125:387). Saved = useMockSaved(); lists are in memory.
// "Tümü" holds every saved service; a list is a subset. Removing the heart drops it from every list.
useMemberPage();
useSeoMeta({title: 'Kaydedilenler'});

const saved = useMockSaved();
const compare = useMockCompare();
const lists = useMockSavedLists();
// Services that sit in a list are saved too.
for (const list of lists.value) for (const id of list.businessIds) saved.toggle(id, true);

const active = ref<string>('all');
const expanded = ref(false);
const PAGE = 3;

const allItems = computed(() => saved.ids.value.map((id) => findBusiness(id)).filter((b): b is MockBusiness => !!b));
const activeList = computed(() => lists.value.find((l) => l.id === active.value));
const items = computed(() => (activeList.value ? allItems.value.filter((b) => activeList.value!.businessIds.includes(b.id)) : allItems.value));
const shown = computed(() => (expanded.value ? items.value : items.value.slice(0, PAGE)));
const countIn = (ids: string[]) => ids.filter((id) => saved.has(id)).length;

function pick(id: string) {
  active.value = id;
  expanded.value = false;
}

function setSaved(id: string, on: boolean) {
  saved.toggle(id, on);
  if (!on) lists.value = lists.value.map((l) => ({...l, businessIds: l.businessIds.filter((x) => x !== id)}));
}

const compareFull = ref(false);
function setCompared(id: string, on: boolean) {
  compareFull.value = on && !compare.has(id) && compare.ids.value.length >= compare.max;
  compare.toggle(id, on);
}

// Turkish accusative after a numeral: 1’i, 2’si, 3’ü, 6’sı, 10’u, 40’ı …
function accusative(n: number) {
  if (n % 100 === 0) return 'ü';
  const ones = ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
  const tens = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
  return n % 10 ? ones[n % 10]! : tens[Math.floor(n / 10) % 10]!;
}
const countText = computed(() => {
  const total = items.value.length;
  const visible = shown.value.length;
  return visible < total ? `${total} kayıttan ${visible}’${accusative(visible)} gösteriliyor.` : `${total} kayıt gösteriliyor.`;
});

const listModal = ref(false);
function createList(data: {name: string; businessIds: string[]}) {
  const id = `liste-${Date.now()}`;
  lists.value = [...lists.value, {id, ...data}];
  listModal.value = false;
  pick(id);
}
</script>

<template>
  <div class="saved-page v2-wrap">
    <V2AccountMenu class="menu" active="kaydedilenler"/>
    <section class="main" aria-labelledby="saved-title">
      <header class="head">
        <div class="titles">
          <p class="t-mono-md t-eyebrow">HESABIM</p>
          <h1 id="saved-title" class="t-h2">Kaydedilenler</h1>
        </div>
        <button type="button" class="btn btn-dark" @click="listModal = true">Yeni liste<ArrowRight aria-hidden="true"/></button>
      </header>

      <div class="lists" role="group" aria-label="Listeler">
        <button type="button" class="chip" :class="active === 'all' ? 'chip-active' : 'chip-default'" :aria-pressed="active === 'all'" @click="pick('all')">Tümü · {{ allItems.length }}</button>
        <button v-for="l in lists" :key="l.id" type="button" class="chip" :class="active === l.id ? 'chip-active' : 'chip-default'" :aria-pressed="active === l.id" @click="pick(l.id)">{{ l.name }} · {{ countIn(l.businessIds) }}</button>
      </div>

      <ul v-if="shown.length" class="cards">
        <li v-for="b in shown" :key="b.id">
          <V2ServiceCard
            :business="b"
            :saved="saved.has(b.id)"
            :compared="compare.has(b.id)"
            @update:saved="setSaved(b.id, $event)"
            @update:compared="setCompared(b.id, $event)"/>
        </li>
      </ul>
      <div v-else class="empty">
        <span class="empty-icon" aria-hidden="true"><Heart :size="26"/></span>
        <p class="t-h4">{{ activeList ? 'Bu liste boş' : 'Henüz kaydettiğin servis yok' }}</p>
        <p class="t-body-sm t-muted">Servis kartlarındaki kalp düğmesiyle kaydet; burada listelere ayır.</p>
        <NuxtLink to="/" class="btn btn-outline">Servis keşfet<ArrowRight aria-hidden="true"/></NuxtLink>
      </div>

      <div v-if="items.length" class="foot">
        <p class="info t-body-sm t-muted"><Info :size="16" aria-hidden="true"/>Karşılaştırmak için en fazla 3 işletme işaretleyebilirsin. {{ countText }}</p>
        <div class="foot-actions">
          <button v-if="shown.length < items.length" type="button" class="btn btn-outline btn-sm" @click="expanded = true">Tümünü göster</button>
          <NuxtLink v-if="compare.ids.value.length >= 2" :to="compare.href.value" class="btn btn-primary btn-sm">Karşılaştır ({{ compare.ids.value.length }})<ArrowRight aria-hidden="true"/></NuxtLink>
        </div>
      </div>
      <p v-if="compareFull" class="full t-body-sm" role="status">En fazla 3 işletme karşılaştırabilirsin. Önce birinin işaretini kaldır.</p>
    </section>

    <SavedListModal :open="listModal" :businesses="allItems" @close="listModal = false" @save="createList"/>
  </div>
</template>

<style scoped>
.saved-page{display:grid;grid-template-columns:280px minmax(0,1fr);gap:32px;align-items:start;padding-top:40px;padding-bottom:104px}
.main{display:flex;flex-direction:column;gap:24px;min-width:0}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
.titles{display:flex;flex-direction:column;gap:10px}
.lists{display:flex;gap:8px;flex-wrap:wrap}
.cards{display:flex;flex-direction:column;gap:24px}
.foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.info{display:flex;align-items:flex-start;gap:8px}
.info :deep(svg){flex:none;margin-top:2px}
.foot-actions{display:flex;gap:8px}
.full{padding:10px 14px;border-radius:14px;background:var(--orange-100);font-weight:600;color:var(--ink-800)}
.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 24px;text-align:center;background:var(--white);border:1px dashed var(--cream-200);border-radius:28px}
.empty-icon{width:56px;height:56px;border-radius:999px;display:grid;place-items:center;background:var(--orange-100);color:var(--orange-600);margin-bottom:6px}
.empty .btn{margin-top:8px}
@media (max-width:900px){
  .saved-page{grid-template-columns:minmax(0,1fr);gap:20px;padding-top:20px;padding-bottom:64px}
  .head{flex-direction:column;align-items:flex-start}
}
</style>
