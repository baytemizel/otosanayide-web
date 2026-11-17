<script setup lang="ts">
import {Bell, Mail, Plus, Smartphone} from '@lucide/vue';
import GarageRing from '~/components/v2/garage/GarageRing.vue';
import {daysUntil, formatLongDate, formatRemaining, mockNotifyOptions, reminderProgress, type MockReminder} from '~/data/mock/garage';

// Reminder list for the selected vehicle (replaces the old /hatirlatmalar page). Not a separate Figma
// frame: built from the W11 ring cards and the W12 switches. Switch = reminder on/off.
defineProps<{reminders: MockReminder[]; status?: string}>();
const emit = defineEmits<{add: []; toggle: [id: string, on: boolean]}>();

const tone = (r: MockReminder) => (!r.active ? 'muted' : daysUntil(r.due) <= 30 ? 'orange' : 'green');
const notifyText = (r: MockReminder) => mockNotifyOptions.filter((o) => r.notify.includes(o.value)).map((o) => o.label).join(', ');
</script>

<template>
  <section class="reminders" aria-labelledby="reminders-title">
    <div class="head">
      <h2 id="reminders-title" class="t-h4">Hatırlatmalar</h2>
      <button type="button" class="btn btn-outline btn-sm" @click="emit('add')"><Plus aria-hidden="true"/>Hatırlatma ekle</button>
    </div>
    <p v-if="status" class="status t-body-sm" role="status">{{ status }}</p>
    <ul v-if="reminders.length" class="rows">
      <li v-for="r in reminders" :key="r.id" class="row" :class="{off: !r.active}">
        <GarageRing :progress="reminderProgress(r)" :tone="tone(r)" :size="44"/>
        <div class="copy">
          <p class="title">{{ r.topic }}</p>
          <p class="t-body-sm t-muted">{{ formatLongDate(r.due) }} · {{ notifyText(r) || 'Hedef gün' }}</p>
          <p class="channels">
            <span class="tag tag-cream"><Bell aria-hidden="true"/>Uygulama</span>
            <span v-if="r.push" class="tag tag-cream"><Smartphone aria-hidden="true"/>Push</span>
            <span v-if="r.email" class="tag tag-cream"><Mail aria-hidden="true"/>E-posta</span>
          </p>
        </div>
        <p class="left">{{ r.active ? formatRemaining(r.due) : 'Kapalı' }}</p>
        <input
          type="checkbox"
          class="switch"
          role="switch"
          :checked="r.active"
          :aria-checked="r.active"
          :aria-label="`${r.topic} hatırlatması`"
          @change="emit('toggle', r.id, ($event.target as HTMLInputElement).checked)">
      </li>
    </ul>
    <p v-else class="empty t-body-sm t-muted">Bu araç için hatırlatma yok. Bakım, muayene veya sigorta tarihini ekle; zamanı gelince haber verelim.</p>
  </section>
</template>

<style scoped>
.reminders{display:flex;flex-direction:column;gap:8px;padding:24px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px}
.head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:10px;flex-wrap:wrap}
.status{padding:10px 14px;border-radius:14px;background:var(--lime-100);font-weight:600;color:var(--ink-800)}
.rows{display:flex;flex-direction:column;gap:8px}
.rows > li + li{border-top:1px solid var(--cream-200);padding-top:22px}
.row{display:flex;align-items:center;gap:16px;padding:14px 0}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.title{font-weight:600;font-size:16px;line-height:1.2;color:var(--ink-900)}
.channels{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
.channels .tag{font-size:12px;padding:4px 9px}
.channels .tag svg{width:12px;height:12px}
.left{flex:none;font-weight:700;font-size:17px;line-height:1.2;color:var(--ink-900);white-space:nowrap}
.off .title,.off .left{color:var(--ink-500)}
.empty{padding:16px 0}
@media (max-width:600px){
  .reminders{padding:20px}
  .row{flex-wrap:wrap}
  .copy{flex-basis:calc(100% - 60px)}
  .left{margin-left:60px;margin-right:auto}
}
</style>
