<script setup lang="ts">
import {computed} from 'vue';
import {File, Plus} from '@lucide/vue';
import GarageRing from '~/components/v2/garage/GarageRing.vue';
import {daysUntil, formatLongDate, formatLongDateTime, formatRemaining, formatTry, mockToday, reminderProgress, type MockRecord, type MockReminder} from '~/data/mock/garage';

// W11 "Özet kartları" (Figma 123:331): the two nearest active reminders as rings, then this year's expenses.
const props = defineProps<{reminders: MockReminder[]; records: MockRecord[]}>();
const emit = defineEmits<{'add-reminder': []}>();

const year = mockToday.getFullYear();
const upcoming = computed(() => props.reminders.filter((r) => r.active).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 2));
const yearRecords = computed(() => props.records.filter((r) => r.date.startsWith(String(year))));
const total = computed(() => yearRecords.value.reduce((sum, r) => sum + r.amount, 0));
const tone = (r: MockReminder) => (daysUntil(r.due) <= 30 ? 'orange' : 'green');
// Figma: the service reminder shows its time (09.00), the others only the date.
const when = (r: MockReminder) => (r.topic === 'Periyodik bakım' ? formatLongDateTime(r.due) : formatLongDate(r.due));
</script>

<template>
  <div class="stats">
    <article v-for="r in upcoming" :key="r.id" class="stat">
      <GarageRing :progress="reminderProgress(r)" :tone="tone(r)"/>
      <div class="copy">
        <p class="t-mono-sm t-muted">{{ r.label ?? r.topic }}</p>
        <p class="value">{{ formatRemaining(r.due) }}</p>
        <p class="t-body-sm t-muted">{{ when(r) }}</p>
      </div>
    </article>
    <button v-if="upcoming.length < 2" type="button" class="stat add" @click="emit('add-reminder')">
      <span class="badge" aria-hidden="true"><Plus :size="24"/></span>
      <span class="copy">
        <span class="t-mono-sm t-muted">Hatırlatma</span>
        <span class="t-label-md">Hatırlatma ekle</span>
        <span class="t-body-sm t-muted">Bakım, muayene, sigorta</span>
      </span>
    </button>
    <article class="stat">
      <span class="badge lime" aria-hidden="true"><File :size="24"/></span>
      <div class="copy">
        <p class="t-mono-sm t-muted">{{ year }} gideri</p>
        <p class="value">{{ formatTry(total) }}</p>
        <p class="t-body-sm t-muted">{{ yearRecords.length }} kayıt</p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.stat{display:flex;align-items:center;gap:16px;padding:22px;background:var(--white);border:1px solid var(--cream-200);border-radius:24px;text-align:left}
.stat.add{border-style:dashed;transition:border-color .15s ease}
.stat.add:hover{border-color:var(--ink-900)}
.copy{display:flex;flex-direction:column;gap:4px;min-width:0}
.copy > *{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.value{font-weight:700;font-size:28px;line-height:1.2;color:var(--ink-900)}
.badge{flex:none;width:56px;height:56px;border-radius:999px;display:grid;place-items:center;background:var(--cream-100);color:var(--ink-900)}
.badge.lime{background:var(--lime-100)}
@media (max-width:900px){.stats{grid-template-columns:1fr;gap:12px}}
</style>
