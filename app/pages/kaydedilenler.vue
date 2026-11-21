<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {ArrowRight, Heart, Info, LoaderCircle} from '@lucide/vue';
import V2Select from '~/components/v2/V2Select.vue';
import V2ServiceCard from '~/components/v2/V2ServiceCard.vue';
import V2AccountMenu from '~/components/v2/V2AccountMenu.vue';
import SavedListModal from '~/components/v2/garage/SavedListModal.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useMockCompare} from '~/composables/useMockCompare';
import {useMemberPage} from '~/composables/useMemberPage';
import {useSavedPage} from '~/composables/v2/useSavedPage';
import {accusative, LIST_NAME_MAX} from '~/lib/v2/saved';

// W13 · Kaydedilenler ve listeler (Figma 125:387). "Tümü" holds every saved service; a list is a subset.
// Live: favorites from the account (GET /api/me) resolved with GET /api/businesses/{id}; named lists
// from /api/me/lists (create, rename, delete, add, remove). Demo: mock catalog and in-memory lists;
// removing the heart drops the service from every list.
const app = useMemberPage();
useSeoMeta({title: 'Kaydedilenler'});

const page = useSavedPage();
const {live} = page;
const compare = useMockCompare();

const active = ref<string>('all');
const expanded = ref(false);
const PAGE = 3;

const activeChip = computed(() => page.chips.value.find((c) => c.id === active.value));
const ids = computed(() => page.idsFor(active.value));
const shownIds = computed(() => (expanded.value ? ids.value : ids.value.slice(0, PAGE)));
const shown = computed(() => shownIds.value.map((id) => ({id, entry: page.entry(id)})));

// Live: read the services on screen (and every saved one while the list modal is open).
watch(shownIds, (value) => { void page.resolve(value); }, {immediate: true});
useClientEffect(() => [app.user, app.ready], () => {
  if (live && app.ready && app.user) void page.loadLists();
});
// A deleted list falls back to "Tümü".
watch(() => page.chips.value, (chips) => {
  if (active.value !== 'all' && !chips.some((c) => c.id === active.value)) active.value = 'all';
});

function pick(id: string) {
  active.value = id;
  expanded.value = false;
  confirmDelete.value = false;
  page.actionError.value = '';
}

const compareFull = ref(false);
function setCompared(id: string, on: boolean) {
  compareFull.value = on && !compare.has(id) && compare.ids.value.length >= compare.max;
  compare.toggle(id, on);
}

const countText = computed(() => {
  const total = ids.value.length;
  const visible = shownIds.value.length;
  return visible < total ? `${total} kayıttan ${visible}’${accusative(visible)} gösteriliyor.` : `${total} kayıt gösteriliyor.`;
});

/* ---------- list modal (new / rename) ---------- */
const listModal = ref<'new' | 'rename' | null>(null);
const modalBusinesses = computed(() => page.savedIds.value
  .map((id) => page.entry(id))
  .flatMap((e) => (e.status === 'found' ? [{id: e.card.id, name: e.card.name}] : [])));

function openNew() {
  page.actionError.value = '';
  listModal.value = 'new';
  void page.resolve(page.savedIds.value.slice(0, 100));
}
function openRename() {
  page.actionError.value = '';
  listModal.value = 'rename';
}
async function saveList(data: {name: string; businessIds: string[]}) {
  if (listModal.value === 'rename' && activeChip.value) {
    if (await page.renameList(activeChip.value.id, data.name)) listModal.value = null;
    return;
  }
  const id = await page.createList(data.name, data.businessIds);
  if (!id) return;
  listModal.value = null;
  pick(id);
}

const confirmDelete = ref(false);
async function deleteList() {
  if (!activeChip.value) return;
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  if (await page.deleteList(activeChip.value.id)) pick('all');
}

function addTo(chipId: string, businessId: string) {
  if (chipId) void page.addTo(chipId, businessId);
}
const listsWithout = (businessId: string) => page.chips.value.filter((c) => !c.ids.includes(businessId));
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
        <button type="button" class="btn btn-dark" :disabled="live && page.listsState.value !== 'ready'" @click="openNew">Yeni liste<ArrowRight aria-hidden="true"/></button>
      </header>

      <div v-if="!page.ready.value" class="state" role="status"><LoaderCircle :size="20" class="spin" aria-hidden="true"/><p class="t-body-md t-muted">Kaydedilenler yükleniyor…</p></div>
      <template v-else>
        <div class="lists" role="group" aria-label="Listeler">
          <button type="button" class="chip" :class="active === 'all' ? 'chip-active' : 'chip-default'" :aria-pressed="active === 'all'" @click="pick('all')">Tümü · {{ page.savedIds.value.length }}</button>
          <button v-for="l in page.chips.value" :key="l.id" type="button" class="chip" :class="active === l.id ? 'chip-active' : 'chip-default'" :aria-pressed="active === l.id" @click="pick(l.id)">{{ l.name }} · {{ page.countFor(l) }}</button>
          <span v-if="page.listsState.value === 'loading'" class="lists-note t-body-sm t-muted" role="status"><LoaderCircle :size="14" class="spin" aria-hidden="true"/>Listeler yükleniyor…</span>
        </div>
        <p v-if="page.listsState.value === 'error'" class="banner t-body-sm" role="alert">
          {{ page.listsError.value }}
          <button type="button" class="btn btn-outline btn-sm" @click="page.loadLists()">Tekrar dene</button>
        </p>

        <div v-if="live && activeChip" class="list-tools">
          <button type="button" class="btn btn-ghost btn-sm" :disabled="page.busy.value" @click="openRename">Adını değiştir</button>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="page.busy.value" @click="deleteList">{{ confirmDelete ? 'Silmeyi onayla' : 'Listeyi sil' }}</button>
          <button v-if="confirmDelete" type="button" class="btn btn-ghost btn-sm" @click="confirmDelete = false">Vazgeç</button>
          <span v-if="confirmDelete" class="t-body-sm t-muted">Liste silinir; servisler kaydedilenlerde kalır.</span>
        </div>
        <p v-if="page.actionError.value && listModal === null" class="banner t-body-sm" role="alert">{{ page.actionError.value }}</p>

        <ul v-if="shown.length" class="cards">
          <li v-for="item in shown" :key="item.id">
            <template v-if="item.entry.status === 'found'">
              <V2ServiceCard
                :business="item.entry.card"
                :saved="page.saved.has(item.id)"
                :compared="compare.has(item.id)"
                @update:saved="page.setSaved(item.id, $event)"
                @update:compared="setCompared(item.id, $event)"/>
              <div v-if="live && (activeChip || listsWithout(item.id).length)" class="card-tools">
                <button v-if="activeChip" type="button" class="btn btn-ghost btn-sm" :disabled="page.busy.value" @click="page.removeFrom(activeChip.id, item.id)">Listeden çıkar</button>
                <template v-else>
                  <label class="sr-only" :for="`add-${item.id}`">{{ item.entry.card.name }} için liste seç</label>
                  <V2Select
                    :id="`add-${item.id}`" :model-value="null" :options="listsWithout(item.id).map((c) => ({value: c.id, label: c.name}))"
                    placeholder="Listeye ekle…" class="add-select" :match-width="false" :disabled="page.busy.value" @change="addTo($event, item.id)"/>
                </template>
              </div>
            </template>
            <div v-else-if="item.entry.status === 'loading'" class="placeholder" role="status"><LoaderCircle :size="18" class="spin" aria-hidden="true"/><span class="t-body-sm t-muted">Servis bilgileri yükleniyor…</span></div>
            <div v-else class="placeholder">
              <span class="t-body-sm">{{ item.entry.status === 'missing' ? 'Bu servis artık yayında değil.' : 'Servis bilgileri alınamadı.' }}</span>
              <button v-if="item.entry.status === 'unavailable'" type="button" class="btn btn-outline btn-sm" @click="page.resolve([item.id], true)">Tekrar dene</button>
              <button v-if="activeChip" type="button" class="btn btn-ghost btn-sm" :disabled="page.busy.value" @click="page.removeFrom(activeChip.id, item.id)">Listeden çıkar</button>
              <button v-else-if="page.saved.has(item.id)" type="button" class="btn btn-ghost btn-sm" @click="page.setSaved(item.id, false)">Kaydedilenlerden çıkar</button>
            </div>
          </li>
        </ul>
        <div v-else class="empty">
          <span class="empty-icon" aria-hidden="true"><Heart :size="26"/></span>
          <p class="t-h4">{{ activeChip ? 'Bu liste boş' : 'Henüz kaydettiğin servis yok' }}</p>
          <p class="t-body-sm t-muted">Servis kartlarındaki kalp düğmesiyle kaydet; burada listelere ayır.</p>
          <NuxtLink to="/" class="btn btn-outline">Servis keşfet<ArrowRight aria-hidden="true"/></NuxtLink>
        </div>

        <div v-if="ids.length" class="foot">
          <p class="info t-body-sm t-muted"><Info :size="16" aria-hidden="true"/>Karşılaştırmak için en fazla 3 işletme işaretleyebilirsin. {{ countText }}</p>
          <div class="foot-actions">
            <button v-if="shownIds.length < ids.length" type="button" class="btn btn-outline btn-sm" @click="expanded = true">Tümünü göster</button>
            <NuxtLink v-if="compare.ids.value.length >= 2" :to="compare.href.value" class="btn btn-primary btn-sm">Karşılaştır ({{ compare.ids.value.length }})<ArrowRight aria-hidden="true"/></NuxtLink>
          </div>
        </div>
        <p v-if="compareFull" class="full t-body-sm" role="status">En fazla 3 işletme karşılaştırabilirsin. Önce birinin işaretini kaldır.</p>
      </template>
    </section>

    <SavedListModal
      :open="listModal !== null"
      :businesses="modalBusinesses"
      :renaming="listModal === 'rename' ? activeChip?.name ?? '' : null"
      :max-length="live ? LIST_NAME_MAX : 40"
      :busy="page.busy.value"
      :error="listModal !== null ? page.actionError.value : ''"
      @close="listModal = null"
      @save="saveList"/>
  </div>
</template>

<style scoped>
.saved-page{display:grid;grid-template-columns:280px minmax(0,1fr);gap:32px;align-items:start;padding-top:40px;padding-bottom:104px}
.main{display:flex;flex-direction:column;gap:24px;min-width:0}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
.titles{display:flex;flex-direction:column;gap:10px}
.lists{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.lists-note{display:inline-flex;align-items:center;gap:6px}
.list-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:-8px}
.cards{display:flex;flex-direction:column;gap:24px}
.card-tools{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}
.card-tools :deep(.add-select){width:auto;min-width:200px;padding-top:8px;padding-bottom:8px;border-radius:999px;font-size:14px}
.card-tools :deep(.add-select.placeholder .v2-select-value){color:var(--ink-800)}
.placeholder{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:20px 24px;background:var(--white);border:1px dashed var(--cream-200);border-radius:28px}
.state{display:flex;align-items:center;gap:10px;padding:24px 0}
.spin{animation:spin 1s linear infinite;color:var(--ink-500)}
@keyframes spin{to{transform:rotate(360deg)}}
.banner{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 14px;border-radius:14px;background:var(--orange-100);font-weight:600;color:var(--ink-800)}
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
