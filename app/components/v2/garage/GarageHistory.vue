<script setup lang="ts">
import {computed, ref} from 'vue';
import {File, Pencil} from '@lucide/vue';
import GarageRecordIcon from '~/components/v2/garage/GarageRecordIcon.vue';
import {formatShortDate, type MockRecord} from '~/data/mock/garage';
import {formatTry} from '~/lib/v2/garage';

// W11 "Bakım ve gider geçmişi" (Figma 123:357): filter chips and record rows, newest first.
// Live: kind comes from the record type (insurance / inspection = Gider) and "Belgeler" from the document
// label; records saved before API v2 count as Bakım. Live rows also get an edit button (not in the design;
// edit and delete of a single record are new in API v2-02).
const props = withDefaults(defineProps<{records: MockRecord[]; live?: boolean; busy?: boolean}>(), {live: false, busy: false});
const emit = defineEmits<{edit: [id: string]}>();
const filters = [
  {id: 'all', label: 'Tümü'},
  {id: 'bakim', label: 'Bakım'},
  {id: 'gider', label: 'Gider'},
  {id: 'belge', label: 'Belgeler'},
] as const;
const filter = ref<(typeof filters)[number]['id']>('all');
const rows = computed(() => props.records
  .filter((r) => filter.value === 'all' || (filter.value === 'belge' ? !!r.document : r.kind === filter.value))
  .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)));
</script>

<template>
  <section class="history" aria-labelledby="history-title">
    <div class="head">
      <h2 id="history-title" class="t-h4">Bakım ve gider geçmişi</h2>
      <div v-if="!live || records.length" class="chips" role="group" aria-label="Kayıtları süz">
        <button v-for="f in filters" :key="f.id" type="button" class="chip" :class="filter === f.id ? 'chip-active' : 'chip-default'" :aria-pressed="filter === f.id" @click="filter = f.id">{{ f.label }}</button>
      </div>
    </div>
    <ul v-if="rows.length" class="rows">
      <li v-for="r in rows" :key="r.id" class="row">
        <GarageRecordIcon :icon="r.icon"/>
        <div class="copy">
          <p class="title">{{ r.title }}</p>
          <p class="t-body-sm t-muted">{{ r.detail }}</p>
        </div>
        <span v-if="r.document" class="doc t-label-sm"><File :size="14" aria-hidden="true"/>{{ r.document }}</span>
        <div class="amount">
          <p class="price">{{ formatTry(r.amount) }}</p>
          <p class="t-body-sm t-muted"><time :datetime="r.date">{{ formatShortDate(r.date) }}</time></p>
        </div>
        <button v-if="live" type="button" class="btn btn-ghost btn-sm edit" :disabled="busy" :aria-label="`${r.title} kaydını düzenle`" @click="emit('edit', r.id)"><Pencil aria-hidden="true"/></button>
      </li>
    </ul>
    <p v-else-if="live && !records.length" class="empty t-body-sm t-muted">Bu araç için henüz kayıt yok. Yapılan bakımı “Kayıt ekle” ile gir.</p>
    <p v-else class="empty t-body-sm t-muted">Bu süzgeçte kayıt yok.</p>
  </section>
</template>

<style scoped>
.history{display:flex;flex-direction:column;gap:8px;padding:24px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px}
.head{display:flex;align-items:center;justify-content:space-between;gap:8px 16px;padding-bottom:10px;flex-wrap:wrap}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.rows{display:flex;flex-direction:column;gap:8px}
.rows > li + li{border-top:1px solid var(--cream-200);padding-top:22px}
.row{display:flex;align-items:center;gap:16px;padding:14px 0}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.title{font-weight:600;font-size:16px;line-height:1.2;color:var(--ink-900)}
.doc{flex:none;display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 9px;border-radius:999px;background:var(--cream-100);color:var(--ink-800)}
.amount{flex:none;width:110px;display:flex;flex-direction:column;align-items:flex-end;gap:3px;white-space:nowrap}
.price{font-weight:700;font-size:17px;line-height:1.2;color:var(--ink-900)}
.edit{flex:none;padding:8.5px;margin-right:-8px}
.empty{padding:24px 0}
@media (max-width:600px){
  .history{padding:20px}
  .row{flex-wrap:wrap;gap:12px}
  .copy{flex-basis:calc(100% - 60px)}
  .doc{margin-left:60px}
  .amount{width:auto;margin-left:auto}
}
</style>
